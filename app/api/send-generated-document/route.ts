import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { normalizeDocument } from '@/lib/document-normalize'
import { sendGmailMessage } from '@/lib/gmail'
import { resolveSenderRole } from '@/lib/rbac'
import { Document } from '@/lib/types'
import { buildDocumentViewUrl } from '@/lib/app-url'

const DEFAULT_TEST_EMAIL = 'enroll@netbounceplacement.com'

export async function POST(req: NextRequest) {
  try {
    const { documentId, to = DEFAULT_TEST_EMAIL } = await req.json()
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })
    if (!to) return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: userData } = await supabase.auth.getUser()
    const senderRole = resolveSenderRole(userData.user)
    const { data, error } = await supabase.from('documents').select('*').eq('id', documentId).single()
    if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const doc = normalizeDocument(data as Document)
    const docLabel = DOCUMENT_TYPE_LABELS[doc.type] || doc.type
    const documentUrl = buildDocumentViewUrl(doc.id, req)
    const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 16px;background:#f8fafc">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
        <tr><td style="background:#0D1F14;padding:22px 28px;color:#fff">
          <p style="margin:0;color:#A8D5B8;font-size:11px;font-weight:700">NetBounce DocSign</p>
          <h1 style="margin:4px 0 0;font-size:18px">${docLabel}</h1>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 14px;color:#0D1F14;font-size:14px">Hello ${escapeHtml(doc.client_name)},</p>
          <p style="margin:0 0 22px;color:#334155;font-size:14px;line-height:1.6">Please use the secure button below to view your document.</p>
          <a href="${documentUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 22px;border-radius:8px">View ${escapeHtml(docLabel)}</a>
          <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">Opening this secure link records document activity for delivery tracking.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

    const gmailResult = await sendGmailMessage({
      to,
      senderDisplayName: senderRole === 'HR' ? 'NetBounce HR' : senderRole === 'ACCOUNTS' ? 'NetBounce Accounts' : 'NetBounce Placement LLC',
      subject: `${docLabel} - NetBounce Placement LLC`,
      text: `Please use this secure link to view the ${docLabel}: ${documentUrl}`,
      html: emailHtml,
      attachments: [],
    }, senderRole)

    if (!gmailResult.ok) {
      console.error('[send-generated-document] Gmail send failed', gmailResult)
      await supabase.from('audit_trail').insert({
        document_id: doc.id,
        event: 'Generated document email failed',
        actor: 'system',
        metadata: { to, sender_role: senderRole, reason: gmailResult.reason, status: gmailResult.status, details: gmailResult.details },
      })

      return NextResponse.json({
        error: gmailResult.reason,
        details: gmailResult.details,
      }, { status: 502 })
    }

    await supabase.from('audit_trail').insert({
      document_id: doc.id,
      event: 'Generated document view email sent',
      actor: 'system',
      metadata: { to, sender_role: senderRole, gmail_message_id: gmailResult.messageId, attachment_count: 0 },
    })

    await supabase
      .from('documents')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', doc.id)

    return NextResponse.json({ ok: true, messageId: gmailResult.messageId })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send generated document'
    console.error('[send-generated-document] Unexpected error', error)
    return NextResponse.json({ error: message }, { status: 500 })
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
