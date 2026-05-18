import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { normalizeDocument } from '@/lib/document-normalize'
import { sendGmailMessage } from '@/lib/gmail'
import { resolveSenderRole } from '@/lib/rbac'
import { Document } from '@/lib/types'
import { buildDocumentViewUrl } from '@/lib/app-url'

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json()
    const supabase = await createServerSupabaseClient()
    const { data: userData } = await supabase.auth.getUser()
    const senderRole = resolveSenderRole(userData.user)

    const { data: doc, error } = await supabase
      .from('documents').select('*').eq('id', documentId).single()
    
    if (error || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const normalizedDoc = normalizeDocument(doc as Document)
    const isAgreement = normalizedDoc.type === 'agreement'

    const documentUrl = buildDocumentViewUrl(normalizedDoc.id, req)
    const docLabel = DOCUMENT_TYPE_LABELS[normalizedDoc.type as keyof typeof DOCUMENT_TYPE_LABELS] || normalizedDoc.type

    const senderDisplayName = senderRole === 'HR'
      ? 'NetBounce HR'
      : senderRole === 'ACCOUNTS'
        ? 'NetBounce Accounts'
        : 'NetBounce Placement LLC'

    const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:#0D1F14;padding:24px 32px">
    <p style="margin:0;color:#A8D5B8;font-size:11px;font-weight:700;margin-bottom:4px">NetBounce Global LLC</p>
    <p style="margin:0;color:white;font-size:18px;font-weight:700">${senderDisplayName} Request</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#0D1F14;font-size:14px">Hello ${doc.client_name},</p>
    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6">
      ${senderDisplayName} has sent you a <strong>${docLabel}</strong> for your review${isAgreement ? ' and signature' : ''}.
    </p>
    <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6">
      ${isAgreement ? 'Please review the document carefully and complete the in-platform signing request below.' : 'Please open the document using the secure button below.'}
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
    <tr><td align="center">
      <a href="${documentUrl}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px">
        ${isAgreement ? 'Review &amp; Sign Document' : 'View Document'}
      </a>
    </td></tr>
    </table>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 24px"/>
    <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6">
      This link is secure and unique to you. It expires in 30 days.<br/>
      Questions? Reply to this email or contact us at enroll@netbounceplacement.com
    </p>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center">
      NetBounce Global LLC · enroll@netbounceplacement.com · www.netbounceglobal.com
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

    const gmailResult = await sendGmailMessage({
      to: normalizedDoc.client_email,
      senderDisplayName,
      subject: isAgreement ? `Signature Required: ${docLabel} - NetBounce Placement LLC` : `${docLabel} - NetBounce Placement LLC`,
      text: `Please use this secure link to view the ${docLabel}: ${documentUrl}`,
      html: emailHtml,
      attachments: [],
    }, senderRole)

    if (!gmailResult.ok) {
      await supabase.from('audit_trail').insert({
        document_id: normalizedDoc.id,
        event: 'Signing email failed',
        actor: 'system',
        metadata: { to: normalizedDoc.client_email, sender_role: senderRole, reason: gmailResult.reason, status: gmailResult.status, details: gmailResult.details },
      })

      return NextResponse.json({
        error: gmailResult.reason,
        details: gmailResult.details,
      }, { status: 502 })
    }

    // Record the success in Supabase
    await supabase.from('audit_trail').insert({
      document_id: normalizedDoc.id,
      event: isAgreement ? 'Signing email sent to client' : 'Document view email sent to client',
      actor: 'system',
      metadata: { to: normalizedDoc.client_email, sender_role: senderRole, sent_from: senderDisplayName, gmail_message_id: gmailResult.messageId },
    })

    await supabase.from('documents').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', normalizedDoc.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
