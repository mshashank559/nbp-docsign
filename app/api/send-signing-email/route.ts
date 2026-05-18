import { NextRequest, NextResponse } from 'next/server'
import { buildDocumentPdfUrl, buildDocumentViewUrl } from '@/lib/app-url'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { normalizeDocument } from '@/lib/document-normalize'
import { resolveSenderRole } from '@/lib/rbac'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Document } from '@/lib/types'

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: 'html-email-template',
    message: 'Signing email templates are prepared with POST and rendered by the dashboard client.',
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

    const doc = normalizeDocument(data as Document)
    const isAgreement = doc.type === 'agreement'
    const docLabel = DOCUMENT_TYPE_LABELS[doc.type] || doc.type
    const senderDisplayName = senderRole === 'HR'
      ? 'NetBounce HR'
      : senderRole === 'ACCOUNTS'
        ? 'NetBounce Accounts'
        : 'NetBounce Placement LLC'
    const documentUrl = isAgreement
      ? buildDocumentViewUrl(doc.id, req)
      : buildDocumentPdfUrl(doc.id, req)
    const subject = isAgreement
      ? `Signature Required: ${docLabel} - NetBounce Placement LLC`
      : `${docLabel} - NetBounce Placement LLC`
    const text = [
      `Hello ${doc.client_name},`,
      '',
      `${senderDisplayName} has prepared a ${docLabel} for your review${isAgreement ? ' and signature' : ''}.`,
      '',
      `Please use this secure link to view the ${docLabel}:`,
      documentUrl,
      '',
      'Thank you,',
      'NetBounce Placement LLC',
    ].join('\r\n')

    const html = buildRichSigningEmailHtml({
      clientName: doc.client_name,
      docLabel,
      documentUrl,
      isAgreement,
    })

    await supabase.from('audit_trail').insert({
      document_id: doc.id,
      event: isAgreement ? 'Signing email HTML template prepared' : 'Document view email HTML template prepared',
      actor: 'system',
      metadata: {
        to: doc.client_email,
        sender_role: senderRole,
        sent_from: senderDisplayName,
        mode: 'html-email-template',
      },
    })

    await supabase
      .from('documents')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', doc.id)

    return NextResponse.json({
      success: true,
      ok: true,
      mode: 'html-email-template',
      to: doc.client_email,
      subject,
      text,
      html,
      emailHtml: html,
      bodyHtml: html,
      senderDisplayName,
      documentUrl,
      documentId: doc.id,
      documentIds: [doc.id],
      attachmentCount: 0,
      email: {
        to: doc.client_email,
        subject,
        text,
        html,
        senderDisplayName,
      },
    })
  } catch (error) {
    console.error('[send-signing-email] Failed to prepare rich HTML email template', error)
    return NextResponse.json({ error: 'Failed to prepare email template' }, { status: 500 })
  }
}

function buildRichSigningEmailHtml({
  clientName,
  docLabel,
  documentUrl,
  isAgreement,
}: {
  clientName: string
  docLabel: string
  documentUrl: string
  isAgreement: boolean
}) {
  const safeDocLabel = escapeHtml(docLabel)
  const buttonLabel = isAgreement ? 'Review &amp; Sign Document' : `View ${safeDocLabel}`

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 16px;background:#f8fafc">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
        <tr><td style="background:#0D1F14;padding:22px 28px;color:#fff">
          <p style="margin:0;color:#A8D5B8;font-size:11px;font-weight:700">NetBounce DocSign</p>
          <h1 style="margin:4px 0 0;font-size:18px">Review and sign required</h1>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 14px;color:#0D1F14;font-size:14px">Hello ${escapeHtml(clientName)},</p>
          <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6">Please use the button beside each document below. Each button records activity only for that specific document before opening the correct view or signing page.</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:16px 0;border-top:1px solid #e5e7eb">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:16px">
                      <p style="margin:0 0 4px;color:#0D1F14;font-size:14px;font-weight:700">${safeDocLabel}</p>
                    </td>
                    <td align="right" style="vertical-align:middle;width:190px">
                      <a href="${escapeHtml(documentUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 18px;border-radius:8px;white-space:nowrap">${buttonLabel}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">Timestamps, IP address, and device details are recorded in the background for the final report.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
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
