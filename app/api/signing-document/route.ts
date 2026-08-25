import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/service-supabase'
import { Document } from '@/lib/types'
import { normalizeDocument } from '@/lib/document-normalize'
import { requiresSignatureDocument } from '@/lib/document-workflow'
import { incrementDocumentViewCount, insertAuditEvent } from '@/lib/audit'
import { buildSignedDocumentPdf } from '@/lib/signed-pdf'
import { sendGmailMessage } from '@/lib/gmail'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'


// Use centralized service client helper

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  const alreadyTracked = new URL(req.url).searchParams.get('tracked') === '1'
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  let supabase
  try {
    supabase = serviceClient()
  } catch (err) {
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 })
  }
  const { data, error } = await supabase.from('documents').select('*').eq('signing_token', token).single()
  if (error || !data) return NextResponse.json({ error: 'This signing link is invalid or has expired.' }, { status: 404 })

  const doc = normalizeDocument(data as Document)

  if (doc.status === 'sent' && !alreadyTracked) {
    await supabase.from('documents').update({ status: 'viewed', view_count: Number(doc.view_count || 0) + 1 }).eq('id', doc.id)
    await insertAuditEvent(supabase, req, {
      document_id: doc.id,
      event: 'Document viewed by client',
      actor: doc.client_email,
      metadata: { source: 'signing-document', type: doc.type },
    })
    doc.status = 'viewed'
    doc.view_count = Number(doc.view_count || 0) + 1
  } else {
    if (!alreadyTracked) await incrementDocumentViewCount(supabase, doc)
    await insertAuditEvent(supabase, req, {
      document_id: doc.id,
      event: 'Document opened by client',
      actor: doc.client_email,
      metadata: { source: 'signing-document', type: doc.type },
    })
  }

  return NextResponse.json({ document: doc })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { token, signature, signatoryName, signatoryTitle, signaturePosition, agreementAddress, agreementContact } = body
  if (!token || !signatoryName) {
    return NextResponse.json({ error: 'Missing completion details' }, { status: 400 })
  }

  let supabase
  try {
    supabase = serviceClient()
  } catch (err) {
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 })
  }
  const { data, error } = await supabase.from('documents').select('*').eq('signing_token', token).single()
  if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const doc = normalizeDocument(data as Document)
  if (doc.status === 'signed') return NextResponse.json({ document: doc })
  if (requiresSignatureDocument(doc) && !signature) {
    return NextResponse.json({ error: 'Missing signature details' }, { status: 400 })
  }

  const signedAt = new Date().toISOString()
  const updatedFields = {
    ...(doc.fields || {}),
    agreementName: doc.type === 'agreement' ? String(signatoryName).trim() : doc.fields?.agreementName,
    agreementAddress: doc.type === 'agreement' ? String(agreementAddress || '').trim() : doc.fields?.agreementAddress,
    agreementContact: doc.type === 'agreement' ? String(agreementContact || '').trim() : doc.fields?.agreementContact,
    receivingSignatoryName: String(signatoryName).trim(),
    receivingSignatoryTitle: String(signatoryTitle || '').trim(),
    receivingSignatoryDate: signedAt.split('T')[0],
    signaturePosition: signaturePosition ? JSON.stringify(signaturePosition) : doc.fields?.signaturePosition,
  }

  const { error: updateError } = await supabase.from('documents').update({
    status: 'signed',
    client_signature: signature,
    signed_at: signedAt,
    fields: updatedFields,
  }).eq('signing_token', token)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await insertAuditEvent(supabase, req, {
    document_id: doc.id,
    event: 'Document signed by client',
    actor: doc.client_email,
    metadata: {
      signatoryName,
      signatoryTitle,
      signaturePosition,
    },
  })

  const { data: updatedDocData } = await supabase.from('documents').select('*').eq('signing_token', token).single()
  const signedDoc = normalizeDocument((updatedDocData || doc) as Document)

  try {
    const docLabel = DOCUMENT_TYPE_LABELS[signedDoc.type as keyof typeof DOCUMENT_TYPE_LABELS] || signedDoc.type
    const filename = `${signedDoc.type}_${signedDoc.client_name || 'signed'}_signed.pdf`.replace(/[^\w.-]+/g, '_')
    const signedPdf = await buildSignedDocumentPdf(signedDoc)

    if (signedPdf && signedPdf.length > 0) {
      const cleanEmail = (email: string) => (email || '').trim().replace(/^['"]|['"]$/g, '')
      const gmailSender = cleanEmail(process.env.GMAIL_SENDER_EMAIL || '') || 'enroll@netbounceplacement.com'
      const teamRecipient = cleanEmail(process.env.SIGNED_DOC_TEAM_TO || '') || gmailSender
      const signedTime = signedAt ? new Date(signedAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : ''

      const teamHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:#0b1a30;padding:24px 32px">
    <p style="margin:0;color:#60a5fa;font-size:11px;font-weight:700;margin-bottom:4px">NetBounce Global LLC · DocSign</p>
    <p style="margin:0;color:white;font-size:18px;font-weight:700">✓ Document Signed</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#0b1a30;font-size:15px;font-weight:700">A document has been signed</p>
    <table style="width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px" cellpadding="0" cellspacing="0">
      <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:12px;color:#6b7280;width:140px">Document</td><td style="padding:10px 16px;font-size:12px;color:#0b1a30;font-weight:500">${docLabel}</td></tr>
      <tr><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6">Signed by</td><td style="padding:10px 16px;font-size:12px;color:#0b1a30;font-weight:500;border-top:1px solid #f3f4f6">${signatoryName} (${signedDoc.client_email})</td></tr>
      <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6">Client</td><td style="padding:10px 16px;font-size:12px;color:#0b1a30;font-weight:500;border-top:1px solid #f3f4f6">${signedDoc.client_name}${signedDoc.client_company ? ' · ' + signedDoc.client_company : ''}</td></tr>
      <tr><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6">Signed at</td><td style="padding:10px 16px;font-size:12px;color:#0b1a30;font-weight:500;border-top:1px solid #f3f4f6">${signedTime}</td></tr>
    </table>
    <p style="margin:0;color:#64748b;font-size:12px">The final signed PDF is attached.</p>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center">NetBounce Global LLC · docsign@netbounceglobal.com · +1 (915) 666-9102</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

      const clientHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:#0b1a30;padding:24px 32px">
    <p style="margin:0;color:#60a5fa;font-size:11px;font-weight:700;margin-bottom:4px">NetBounce Global LLC</p>
    <p style="margin:0;color:white;font-size:18px;font-weight:700">Your signed document is ready</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 12px;color:#0b1a30;font-size:14px">Hello ${signedDoc.client_name},</p>
    <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6">Thank you for signing the <strong>${docLabel}</strong> with NetBounce Global LLC. Your signed copy is attached.</p>
    <p style="margin:0 0 8px;color:#374151;font-size:14px"><strong>Signed:</strong> ${signedTime}</p>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center">NetBounce Global LLC · docsign@netbounceglobal.com · +1 (915) 666-9102</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

      // Email team
      if (teamRecipient) {
        await sendGmailMessage({
          to: teamRecipient,
          senderDisplayName: 'NetBounce Placement',
          subject: `[COMPLETED] ${docLabel} Signed - ${signedDoc.client_name}`,
          text: `The candidate ${signedDoc.client_name} has successfully executed the ${docLabel}.\nThe final signed PDF is attached to this email for administrative filing.`,
          html: teamHtml,
          attachments: [{ filename, contentType: 'application/pdf', content: signedPdf }],
        })
      }

      // Email candidate
      if (signedDoc.client_email) {
        await sendGmailMessage({
          to: signedDoc.client_email,
          senderDisplayName: 'NetBounce Placement',
          subject: signedDoc.type === 'agreement' ? 'NetBounce Signed Agreement Executive Copy' : `Your signed ${docLabel} — NetBounce Global LLC`,
          text: `Hello ${signedDoc.client_name},\n\nPlease find attached the final executed copy of your ${docLabel} for your records.`,
          html: clientHtml,
          attachments: [{ filename, contentType: 'application/pdf', content: signedPdf }],
        })
      }

      await supabase.from('audit_trail').insert({
        document_id: signedDoc.id,
        event: 'Signed document copies emailed',
        actor: 'system',
        metadata: { recipients: [teamRecipient, signedDoc.client_email], attachment: filename },
      })
    }
  } catch (emailErr) {
    console.error('[signing-document] Automatic email delivery error:', emailErr)
  }

  return NextResponse.json({ ok: true })
}

