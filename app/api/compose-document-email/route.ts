import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { buildDocumentEmailAttachments, buildDocumentEmailDraft, buildDocumentEmailInput, parseBundleDocuments } from '@/lib/document-attachments'
import { getLegacyDatabaseType, normalizeDocument } from '@/lib/document-normalize'
import { createGmailDraft } from '@/lib/gmail'
import { resolveSenderRole } from '@/lib/rbac'
import { DocType, Document } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json()
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: userData } = await supabase.auth.getUser()
    const senderRole = resolveSenderRole(userData.user)
    const { data, error } = await supabase.from('documents').select('*').eq('id', documentId).single()
    if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const { doc, childDocs, documentIds } = await prepareTrackedBundleDocuments(supabase, normalizeDocument(data as Document))
    const attachments = await buildDocumentEmailAttachments(doc, childDocs)
    if (!attachments.length) return NextResponse.json({ error: 'No document actions could be prepared' }, { status: 400 })

    const emailInput = {
      ...buildDocumentEmailInput(doc, attachments),
      senderDisplayName: senderRole === 'HR'
        ? 'NetBounce HR'
        : senderRole === 'ACCOUNTS'
          ? 'NetBounce Accounts'
          : 'NetBounce Placement LLC',
    }
    const gmailDraft = await createGmailDraft(emailInput, senderRole)
    const filename = `netbounce_${doc.type}_${doc.client_name || 'document'}_draft.eml`.replace(/[^\w.-]+/g, '_')

    await supabase.from('audit_trail').insert({
      document_id: doc.id,
      event: gmailDraft.ok ? 'Gmail draft created with tracked document links' : 'Email draft composed with tracked document links',
      actor: 'system',
      metadata: {
        to: doc.client_email,
        attachment_count: 0,
        document_action_count: attachments.length,
        document_action_names: attachments.map(attachment => attachment.filename),
        gmail_draft_id: gmailDraft.ok ? gmailDraft.draftId : null,
        sender_role: senderRole,
        fallback_reason: gmailDraft.ok ? null : gmailDraft.reason,
      },
    })

    await supabase
      .from('documents')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .in('id', documentIds)

    if (gmailDraft.ok) {
      return NextResponse.json({
        ok: true,
        mode: 'gmail',
        draftId: gmailDraft.draftId,
        url: gmailDraft.url,
      })
    }

    const draft = buildDocumentEmailDraft(doc, attachments)
    return new NextResponse(draft, {
      headers: {
        'Content-Type': 'message/rfc822; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to prepare email draft'
    console.error('[compose-document-email] Failed to create draft', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function prepareTrackedBundleDocuments(supabase: any, doc: Document) {
  const bundleDocs = parseBundleDocuments(doc.fields?.__bundleDocuments)
  if (!bundleDocs.length) return { doc, childDocs: [] as Document[], documentIds: [doc.id] }

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

  const legacyResult = await supabase.from('documents').insert({
    ...payload,
    type: getLegacyDatabaseType(type),
    fields: { ...((payload.fields as Record<string, string>) || {}), __docType: type },
  }).select().single()
  if (legacyResult.error) throw legacyResult.error
  return legacyResult.data
}

function sanitizeBundleFields(fields: Record<string, string>) {
  const { __bundleDocuments, ...rest } = fields || {}
  return rest
}
