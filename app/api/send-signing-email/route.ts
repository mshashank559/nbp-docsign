import { NextRequest, NextResponse } from 'next/server'
import { buildDocumentEmailActionAttachments, buildDocumentEmailInput, parseBundleDocuments } from '@/lib/document-attachments'
import { getLegacyDatabaseType, normalizeDocument } from '@/lib/document-normalize'
import { sendGmailMessage } from '@/lib/gmail'
import { resolveSenderRole } from '@/lib/rbac'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DocType, Document } from '@/lib/types'

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: 'html-email-transmitter',
    message: 'Signing email templates are transmitted with POST.',
  })
}

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json()
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: userData } = await supabase.auth.getUser()
    const senderRole = resolveSenderRole(userData.user)

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const document = normalizeDocument(data as Document)
    const { doc, childDocs, documentIds } = await prepareTrackedBundleDocuments(supabase, document)
    const attachments = buildDocumentEmailActionAttachments(doc, childDocs)

    if (!attachments.length) {
      return NextResponse.json({ ok: false, error: 'No document actions could be prepared' }, { status: 400 })
    }

    const emailInput = {
      ...buildDocumentEmailInput(doc, attachments, req),
      senderDisplayName:
        senderRole === 'HR'
          ? 'NetBounce HR'
          : senderRole === 'ACCOUNTS'
          ? 'NetBounce Accounts'
          : 'NetBounce Placement LLC',
    }

    const gmailResult = await sendGmailMessage({
      to: emailInput.to,
      senderDisplayName: emailInput.senderDisplayName,
      subject: emailInput.subject,
      text: emailInput.text,
      html: emailInput.html,
      attachments: [],
    }, senderRole)

    if (!gmailResult.ok) {
      console.error('[send-signing-email] HTML email transmission failed', gmailResult)
      await supabase.from('audit_trail').insert({
        document_id: doc.id,
        event: 'HTML document template dispatch failed',
        actor: 'system',
        metadata: {
          to: doc.client_email,
          sender_role: senderRole,
          reason: gmailResult.reason,
          status: gmailResult.status,
          details: gmailResult.details,
        },
      })

      return NextResponse.json({
        ok: false,
        success: false,
        error: gmailResult.reason,
        details: gmailResult.details,
      }, { status: 502 })
    }

    await supabase.from('audit_trail').insert({
      document_id: doc.id,
      event: 'HTML document template dispatched successfully',
      actor: 'system',
      metadata: {
        to: doc.client_email,
        attachment_count: attachments.length,
        document_action_count: attachments.length,
        document_action_names: attachments.map(attachment => attachment.filename),
        sender_role: senderRole,
        sent_from: emailInput.senderDisplayName,
        gmail_message_id: gmailResult.messageId,
        mode: 'html-email-transmitter',
      },
    })

    await supabase
      .from('documents')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .in('id', documentIds)

    return NextResponse.json({
      ok: true,
      success: true,
      message: 'HTML document template dispatched successfully.',
    })
  } catch (error) {
    console.error('[send-signing-email] Failed to dispatch rich HTML email template', error)
    return NextResponse.json({ error: 'Failed to dispatch email template' }, { status: 500 })
  }
}

async function prepareTrackedBundleDocuments(supabase: any, doc: Document) {
  const bundleDocs = parseBundleDocuments(doc.fields?.__bundleDocuments)
  if (!bundleDocs.length) {
    return { doc, childDocs: [] as Document[], documentIds: [doc.id] }
  }

  const childDocs: Document[] = []
  const nextBundleDocs = []

  for (const bundleDoc of bundleDocs) {
    const childFields = sanitizeBundleFields(bundleDoc.fields || {})
    let childDoc: Document | null = null

    if (bundleDoc.documentId) {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('id', bundleDoc.documentId)
        .single()
      if (data) childDoc = normalizeDocument(data as Document)
    }

    if (!childDoc) {
      const payload = {
        type: bundleDoc.type,
        status: 'draft',
        client_name: doc.client_name,
        client_email: doc.client_email,
        client_company: doc.client_company,
        fields: childFields,
      }
      const inserted = await insertBundleDocument(supabase, payload, bundleDoc.type)
      childDoc = normalizeDocument(inserted as Document)
    }

    childDocs.push(childDoc)
    nextBundleDocs.push({
      id: bundleDoc.id,
      type: childDoc.type,
      fields: childDoc.fields || childFields,
      documentId: childDoc.id,
      signingToken: childDoc.signing_token,
    })
  }

  const updatedFields = {
    ...(doc.fields || {}),
    __bundleDocuments: JSON.stringify(nextBundleDocs),
  }

  await supabase
    .from('documents')
    .update({ fields: updatedFields })
    .eq('id', doc.id)

  return {
    doc: { ...doc, fields: updatedFields },
    childDocs,
    documentIds: [doc.id, ...childDocs.map(child => child.id)],
  }
}

async function insertBundleDocument(supabase: any, payload: Record<string, unknown>, type: DocType) {
  const result = await supabase.from('documents').insert(payload).select().single()
  if (!result.error) return result.data
  if (!String(result.error.message || '').includes('documents_type_check')) throw result.error

  const legacyResult = await supabase
    .from('documents')
    .insert({
      ...payload,
      type: getLegacyDatabaseType(type),
      fields: { ...((payload.fields as Record<string, string>) || {}), __docType: type },
    })
    .select()
    .single()

  if (legacyResult.error) throw legacyResult.error
  return legacyResult.data
}

function sanitizeBundleFields(fields: Record<string, string>) {
  const { __bundleDocuments, ...rest } = fields || {}
  return rest
}
