import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveSenderRole } from '@/lib/rbac'
import { normalizeDocument } from '@/lib/document-normalize'
import nodemailer from 'nodemailer'

const DEFAULT_APP_URL = 'https://nbg-docsign.vercel.app'

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: 'smtp-html-email',
    message: 'HTML email cards are sent directly with POST.',
  })
}

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json()
    if (!documentId) {
      return NextResponse.json(
        { ok: false, error: 'Missing documentId' },
        { status: 400 },
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data: userData } = await supabase.auth.getUser()
    const senderRole = resolveSenderRole(userData.user)

    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', documentId)
      .select()
      .single()

    if (updateError || !updatedDoc) {
      console.error('[compose-document-email] Document send-state update failed', updateError)
      return NextResponse.json(
        { ok: false, error: updateError?.message || 'Document not found' },
        { status: updateError?.code === 'PGRST116' ? 404 : 500 },
      )
    }

    const normalizedDoc = normalizeDocument(updatedDoc)
    const verifiedDocumentId = normalizedDoc.id || documentId
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')
    const templateSigningUrl = `${baseUrl}/view-document/${verifiedDocumentId}`
    const isAgreement = normalizedDoc.type === 'agreement'
    const docLabel = getDocumentLabel(normalizedDoc.type)
    const senderDisplayName =
      senderRole === 'HR'
        ? 'NetBounce HR'
        : senderRole === 'ACCOUNTS'
        ? 'NetBounce Accounts'
        : 'NetBounce Placement LLC'

    const html = buildHtmlEmail({
      clientName: normalizedDoc.client_name || 'there',
      docLabel,
      documentUrl: templateSigningUrl,
      isAgreement,
    })
    const subject = `Signature Required: ${docLabel} - NetBounce Placement LLC`
    const text = [
      `Hello ${normalizedDoc.client_name || 'there'},`,
      '',
      `Please use the secure button in this email to review the ${docLabel}.`,
      templateSigningUrl,
      '',
      'Thank you,',
      'NetBounce Placement LLC',
    ].join('\r\n')

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_SENDER_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })

    try {
      await transporter.sendMail({
        from: `"${senderDisplayName}" <${process.env.GMAIL_SENDER_EMAIL}>`,
        to: normalizedDoc.client_email,
        subject,
        text,
        html,
      })
    } catch (smtpError) {
      console.warn('[compose-document-email] SMTP HTML dispatch failed; returning candidate link fallback', smtpError)

      await supabase.from('audit_trail').insert({
        document_id: normalizedDoc.id,
        event: 'SMTP HTML card dispatch failed; candidate link returned',
        actor: 'system',
        metadata: {
          to: normalizedDoc.client_email,
          sender_role: senderRole,
          mode: 'candidate-link-fallback',
          templateSigningUrl,
          reason: smtpError instanceof Error ? smtpError.message : String(smtpError),
        },
      })

      return NextResponse.json({
        ok: true,
        success: true,
        mode: 'candidate-link-fallback',
        message: 'Document link prepared. SMTP dispatch failed; use the returned candidate link.',
        templateSigningUrl,
        url: templateSigningUrl,
      })
    }

    await supabase.from('audit_trail').insert({
      document_id: normalizedDoc.id,
      event: 'HTML card template dispatched',
      actor: 'system',
      metadata: {
        to: normalizedDoc.client_email,
        sender_role: senderRole,
        mode: 'smtp-html-email',
        templateSigningUrl,
      },
    })

    return NextResponse.json({
      ok: true,
      success: true,
      mode: 'smtp-html-email',
      message: 'HTML card template dispatched.',
      templateSigningUrl,
      url: templateSigningUrl,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to dispatch HTML card template'
    console.error('[compose-document-email] Failed to dispatch HTML email', error)
    return NextResponse.json(
      { ok: false, success: false, error: message },
      { status: 500 },
    )
  }
}

function buildHtmlEmail({
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
  const safeClientName = escapeHtml(clientName)
  const safeDocLabel = escapeHtml(docLabel)
  const safeDocumentUrl = escapeHtml(documentUrl)
  const buttonLabel = isAgreement ? 'Review &amp; Sign Document' : 'View Document'

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
          <p style="margin:0 0 14px;color:#0D1F14;font-size:14px">Hello ${safeClientName},</p>
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
                      <a href="${safeDocumentUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 18px;border-radius:8px;white-space:nowrap">${buttonLabel}</a>
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

function getDocumentLabel(type: string) {
  return String(type || 'Document')
    .split(/[-_]/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
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
