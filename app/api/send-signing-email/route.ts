import { NextRequest, NextResponse } from 'next/server'
import { buildDocumentEmailActionAttachments, buildDocumentEmailInput, parseBundleDocuments } from '@/lib/document-attachments'
import { getLegacyDatabaseType, normalizeDocument } from '@/lib/document-normalize'
import { resolveSenderRole } from '@/lib/rbac'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DocType, Document } from '@/lib/types'

const nodemailer = require('nodemailer') as any
const DEFAULT_APP_URL = 'https://nbg-docsign.vercel.app'

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: 'smtp-html-email-transmitter',
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL
    const templateSigningUrl = `${baseUrl}/view-document/${doc.id}`
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

    const html = normalizeTemplateSigningUrl(emailInput.html || '', doc.id, templateSigningUrl)
    const text = normalizeTemplateSigningUrl(emailInput.text, doc.id, templateSigningUrl)
    const mailResult = await sendSmtpHtmlMessage({
      to: emailInput.to,
      senderDisplayName: emailInput.senderDisplayName,
      subject: emailInput.subject,
      text,
      html,
      attachments: [],
    }, senderRole)

    if (!mailResult.ok) {
      console.error('[send-signing-email] HTML email SMTP transmission failed', mailResult)
      await supabase.from('audit_trail').insert({
        document_id: doc.id,
        event: 'HTML document template dispatch failed',
        actor: 'system',
        metadata: {
          to: doc.client_email,
          sender_role: senderRole,
          reason: mailResult.error,
          details: mailResult.details,
        },
      })

      return NextResponse.json({
        ok: false,
        success: false,
        error: mailResult.error,
        details: mailResult.details,
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
        smtp_message_id: mailResult.messageId,
        mode: 'smtp-html-email-transmitter',
      },
    })

    await supabase
      .from('documents')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .in('id', documentIds)

    return NextResponse.json({
      ok: true,
      success: true,
      message: 'HTML card sent directly to recipient mailbox',
    })
  } catch (error) {
    console.error('[send-signing-email] Failed to dispatch rich HTML email template', error)
    return NextResponse.json({ error: 'Failed to dispatch email template' }, { status: 500 })
  }
}

async function sendSmtpHtmlMessage(
  input: {
    to: string
    senderDisplayName: string
    subject: string
    text: string
    html: string
    attachments: unknown[]
  },
  role: string,
) {
  const config = getSmtpConfig(role)
  if (!config.ok) return config

  try {
    const transporter = nodemailer.createTransport(config.transport)
    const result = await transporter.sendMail({
      from: `"${input.senderDisplayName}" <${config.from}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    })

    return {
      ok: true as const,
      messageId: result?.messageId || '',
    }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'SMTP delivery failed.',
      details: error,
    }
  }
}

function getSmtpConfig(role: string) {
  const smtpHost = roleEnvValue(role, 'SMTP_HOST')
  const smtpPort = Number(roleEnvValue(role, 'SMTP_PORT') || 0)
  const smtpUser = roleEnvValue(role, 'SMTP_USER')
  const smtpPass = roleEnvValue(role, 'SMTP_PASS')

  if (smtpHost && Number.isFinite(smtpPort) && smtpPort > 0 && smtpUser && smtpPass) {
    return {
      ok: true as const,
      from: smtpUser,
      transport: {
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      },
    }
  }

  const gmailUser = roleEnvValue(role, 'GMAIL_SENDER_EMAIL') || roleEnvValue(role, 'GMAIL_USER')
  const gmailClientId = roleEnvValue(role, 'GMAIL_CLIENT_ID')
  const gmailClientSecret = roleEnvValue(role, 'GMAIL_CLIENT_SECRET')
  const gmailRefreshToken = roleEnvValue(role, 'GMAIL_REFRESH_TOKEN')

  if (gmailUser && gmailClientId && gmailClientSecret && gmailRefreshToken) {
    return {
      ok: true as const,
      from: gmailUser,
      transport: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          type: 'OAuth2',
          user: gmailUser,
          clientId: gmailClientId,
          clientSecret: gmailClientSecret,
          refreshToken: gmailRefreshToken,
        },
      },
    }
  }

  return {
    ok: false as const,
    error: 'SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS, or Gmail OAuth SMTP variables.',
    details: null,
  }
}

function roleEnvValue(role: string, key: string) {
  const normalizedRole = role === 'HR' || role === 'ACCOUNTS' ? role : ''
  const roleValue = normalizedRole ? envValue(`${normalizedRole}_${key}`) : ''
  return roleValue || envValue(key)
}

function envValue(key: string) {
  return (process.env[key] || '').trim().replace(/^['"]|['"]$/g, '')
}

function normalizeTemplateSigningUrl(value: string, documentId: string, templateSigningUrl: string) {
  const safeDocumentId = encodeURIComponent(documentId)
  return String(value || '').replace(
    new RegExp(`https?://[^\\s"'<>]+/view-document/${safeDocumentId}`, 'g'),
    templateSigningUrl,
  )
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
