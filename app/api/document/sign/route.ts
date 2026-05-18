import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { normalizeDocument } from '@/lib/document-normalize'
import { insertAuditEvent } from '@/lib/audit'
import { buildSignedDocumentPdf } from '@/lib/signed-pdf'
import { Document } from '@/lib/types'

const nodemailer = require('nodemailer') as any

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  console.log('[document/sign] request received')
  const body = await req.json().catch(() => ({}))
  const documentId = String(body.documentId || '')
  const candidateName = String(body.candidateName || '').trim()
  const candidateAddress = String(body.candidateAddress || '').trim()
  const candidatePhone = String(body.candidatePhone || '').trim()
  const signature = String(body.signature || '')

  if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
  if (!candidateName || !candidateAddress || !candidatePhone) {
    return NextResponse.json({ error: 'Candidate details are required.' }, { status: 400 })
  }

  const supabase = serviceClient()
  console.log('[document/sign] fetching document', { documentId })
  const { data, error } = await supabase.from('documents').select('*').eq('id', documentId).single()
  if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const doc = normalizeDocument(data as Document)
  if (doc.status === 'signed') return NextResponse.json({ ok: true, alreadySigned: true })

  const requiresSignature = doc.type === 'agreement'
  if (requiresSignature && !signature) {
    return NextResponse.json({ error: 'Candidate details and signature are required.' }, { status: 400 })
  }
  if (signature && !signature.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Signature must be a valid image.' }, { status: 400 })
  }

  const signedAt = new Date().toISOString()
  console.log('[document/sign] updating document status', { documentId: doc.id, signedAt })
  const updatedFields = {
    ...(doc.fields || {}),
    candidate_name: candidateName,
    candidate_address: candidateAddress,
    candidate_phone: candidatePhone,
    agreementName: candidateName,
    agreementAddress: candidateAddress,
    agreementContact: candidatePhone,
    receivingSignatoryName: candidateName,
    receivingSignatoryDate: signedAt.slice(0, 10),
  }

  const { data: updatedData, error: updateError } = await supabase
    .from('documents')
    .update({
      status: 'signed',
      client_name: candidateName,
      client_signature: requiresSignature ? signature : null,
      signed_at: signedAt,
      fields: updatedFields,
    })
    .eq('id', doc.id)
    .select('*')
    .single()

  if (updateError || !updatedData) {
    console.error('[document/sign] document update failed', updateError)
    return NextResponse.json({ error: updateError?.message || 'Unable to update document.' }, { status: 500 })
  }

  console.log('[document/sign] inserting signed audit event', { documentId: doc.id })
  await insertAuditEvent(supabase, req, {
    document_id: doc.id,
    event: requiresSignature ? 'Document Signed by Candidate' : 'Document Acknowledged by Candidate',
    actor: doc.client_email,
    metadata: {
      status: requiresSignature ? 'Signed' : 'Acknowledged',
      signedAt,
      candidateName,
      candidateAddress,
      candidatePhone,
    },
  })

  const signedDoc = normalizeDocument(updatedData as Document)
  const docLabel = DOCUMENT_TYPE_LABELS[signedDoc.type] || signedDoc.type
  const filename = `${signedDoc.type}_${candidateName || signedDoc.id}_signed.pdf`.replace(/[^\w.-]+/g, '_')
  console.log('[document/sign] generating final signed PDF', { documentId: signedDoc.id, filename })
  const signedPdf = await buildSignedDocumentPdf(signedDoc)

  if (!signedPdf || signedPdf.length === 0) {
    console.error('[document/sign] PDF Generation Failed: Buffer is empty', { documentId: signedDoc.id })
    return NextResponse.json({ error: 'PDF Generation Failed' }, { status: 500 })
  }
  console.log('[document/sign] final signed PDF generated', { documentId: signedDoc.id, bytes: signedPdf.length })

  const emailResult = await sendSignedCopies({
    doc: signedDoc,
    docLabel,
    signedAt,
    signedPdf,
    filename,
  })

  if (!emailResult.ok) {
    console.error('[document/sign] signed document email delivery failed', emailResult)
    await supabase.from('audit_trail').insert({
      document_id: doc.id,
      event: 'Signed document email delivery failed',
      actor: 'system',
      metadata: {
        reason: emailResult.error,
        recipients: emailResult.recipients,
      },
    })
    return NextResponse.json({
      error: 'Database updated, but email transmission failed.',
      details: emailResult.error,
    }, { status: 502 })
  }

  console.log('[document/sign] signed document copies emailed', { documentId: doc.id, recipients: emailResult.recipients })
  await supabase.from('audit_trail').insert({
    document_id: doc.id,
    event: 'Signed document copies emailed',
    actor: 'system',
    metadata: {
      recipients: emailResult.recipients,
      attachment: filename,
    },
  })

  return NextResponse.json({
    ok: true,
    document: signedDoc,
  })
}

async function sendSignedCopies({
  doc,
  docLabel,
  signedAt,
  signedPdf,
  filename,
}: {
  doc: Document
  docLabel: string
  signedAt: string
  signedPdf: Buffer
  filename: string
}) {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = Number(process.env.SMTP_PORT)
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const teamRecipient = process.env.SIGNED_DOC_TEAM_TO || smtpUser
  const recipients = [teamRecipient, doc.client_email].filter(Boolean)
  console.log('[document/sign] preparing SMTP transport', {
    host: smtpHost || 'MISSING',
    port: smtpPort,
    from: smtpUser || 'MISSING',
    teamRecipient: teamRecipient || 'MISSING',
    candidateRecipient: doc.client_email,
  })

  if (!smtpHost || !Number.isFinite(smtpPort) || !smtpUser || !smtpPass) {
    console.error('[document/sign] SMTP configuration missing', {
      hasHost: Boolean(smtpHost),
      hasPort: Number.isFinite(smtpPort),
      hasUser: Boolean(smtpUser),
      hasPass: Boolean(smtpPass),
    })
    return { ok: false as const, error: 'SMTP is not configured.', recipients }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    const signedTime = formatDateTime(signedAt)
    const emailAttachments = [
      {
        filename,
        content: signedPdf,
        contentType: 'application/pdf',
      },
    ]

    console.log('[document/sign] sending executed PDF to candidate', { to: doc.client_email, filename, bytes: signedPdf.length })
    await transporter.sendMail({
      from: `"NetBounce Placement" <${smtpUser}>`,
      to: doc.client_email,
      subject: `Executed Copy: Your Signed ${docLabel}`,
      text: `Hello ${doc.client_name},\n\nPlease find attached the final executed copy of your ${docLabel} for your records.`,
      html: buildCandidateEmailHtml(doc, docLabel, signedTime),
      attachments: emailAttachments,
    })
    console.log('[document/sign] executed PDF successfully sent to candidate', { to: doc.client_email })

    console.log('[document/sign] sending executed PDF to NetBounce office desk', { to: teamRecipient, filename, bytes: signedPdf.length })
    await transporter.sendMail({
      from: `"NetBounce Placement" <${smtpUser}>`,
      to: teamRecipient,
      subject: `[COMPLETED] ${docLabel} Signed - ${doc.client_name}`,
      text: `The candidate ${doc.client_name} has successfully executed the ${docLabel}.\nThe final signed PDF is attached to this email for administrative filing.`,
      html: buildTeamEmailHtml(doc, docLabel, signedTime),
      attachments: emailAttachments,
    })
    console.log('[document/sign] executed PDF successfully sent to NetBounce office desk', { to: teamRecipient })

    return { ok: true as const, recipients }
  } catch (error) {
    console.error('[document/sign] SMTP Transporter execution failed inside post-sign routing:', error)
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : 'SMTP delivery failed.',
      recipients,
    }
  }
}

function buildTeamEmailHtml(doc: Document, docLabel: string, signedTime: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:36px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
<tr><td style="background:#020617;padding:24px 28px;color:#fff"><p style="margin:0;color:#93c5fd;font-size:11px;font-weight:700">NetBounce DocSign</p><h1 style="margin:6px 0 0;font-size:19px">Document Signed</h1></td></tr>
<tr><td style="padding:28px;color:#0f172a;font-size:14px;line-height:1.6">
<p style="margin:0 0 16px">The candidate has completed the signing process.</p>
<p style="margin:0"><strong>Document:</strong> ${escapeHtml(docLabel)}</p>
<p style="margin:6px 0 0"><strong>Candidate:</strong> ${escapeHtml(doc.client_name)} (${escapeHtml(doc.client_email)})</p>
<p style="margin:6px 0 0"><strong>Signed at:</strong> ${escapeHtml(signedTime)}</p>
<p style="margin:18px 0 0;color:#64748b;font-size:12px">The final signed PDF is attached.</p>
</td></tr></table></td></tr></table></body></html>`
}

function buildCandidateEmailHtml(doc: Document, docLabel: string, signedTime: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:36px 16px"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
<tr><td style="background:#020617;padding:24px 28px;color:#fff"><p style="margin:0;color:#93c5fd;font-size:11px;font-weight:700">NetBounce DocSign</p><h1 style="margin:6px 0 0;font-size:19px">Thank you for signing</h1></td></tr>
<tr><td style="padding:28px;color:#0f172a;font-size:14px;line-height:1.6">
<p style="margin:0 0 14px">Hello ${escapeHtml(doc.client_name)},</p>
<p style="margin:0 0 16px">Thank you for signing. Please find your executed copy attached.</p>
<p style="margin:0"><strong>Document:</strong> ${escapeHtml(docLabel)}</p>
<p style="margin:6px 0 0"><strong>Signed at:</strong> ${escapeHtml(signedTime)}</p>
</td></tr></table></td></tr></table></body></html>`
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
  } catch {
    return value
  }
}

function escapeHtml(value: string) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char))
}
