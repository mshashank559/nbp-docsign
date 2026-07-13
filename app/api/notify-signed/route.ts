import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/service-supabase'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { normalizeDocument } from '@/lib/document-normalize'
import { buildSignedDocumentPdf } from '@/lib/signed-pdf'
import { sendGmailMessage } from '@/lib/gmail'
import { Document } from '@/lib/types'

const nodemailer = require('nodemailer') as any

export async function POST(req: NextRequest) {
  try {
    const { documentId, signatoryName, signatoryEmail } = await req.json()

    let supabase
    try {
      supabase = serviceClient()
    } catch (err) {
      console.error(err)
      return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 })
    }

    const { data: docData } = await supabase.from('documents').select('*').eq('id', documentId).single()
    if (!docData) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const doc = normalizeDocument(docData as Document)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://nbg-docsign.vercel.app')

    const docLabel = DOCUMENT_TYPE_LABELS[doc.type as keyof typeof DOCUMENT_TYPE_LABELS] || doc.type

    const downloadUrl = `${appUrl}/api/download-pdf?id=${documentId}`
    const dashboardUrl = `${appUrl}/dashboard/documents/${documentId}`
    
    const signedTime = doc.signed_at 
      ? new Date(doc.signed_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
      : new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })

    const filename = `${doc.type}_${doc.client_name || 'signed'}_signed.pdf`.replace(/[^\w.-]+/g, '_')
    console.log('[notify-signed] generating final signed PDF', { documentId: doc.id, filename })
    const signedPdf = await buildSignedDocumentPdf(doc)

    if (!signedPdf || signedPdf.length === 0) {
      console.error('[notify-signed] PDF Generation Failed: Buffer is empty', { documentId: doc.id })
      return NextResponse.json({ error: 'PDF Generation Failed' }, { status: 500 })
    }

    const cleanEmail = (email: string) => (email || '').trim().replace(/^['"]|['"]$/g, '')
    const gmailSender = cleanEmail(process.env.GMAIL_SENDER_EMAIL || '') || 'enroll@netbounceplacement.com'
    const teamRecipient = cleanEmail(process.env.SIGNED_DOC_TEAM_TO || '') || gmailSender
    const recipients = [teamRecipient, doc.client_email].filter(Boolean)

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
      <tr><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6">Signed by</td><td style="padding:10px 16px;font-size:12px;color:#0b1a30;font-weight:500;border-top:1px solid #f3f4f6">${signatoryName} (${signatoryEmail})</td></tr>
      <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6">Client</td><td style="padding:10px 16px;font-size:12px;color:#0b1a30;font-weight:500;border-top:1px solid #f3f4f6">${doc.client_name}${doc.client_company ? ' · ' + doc.client_company : ''}</td></tr>
      <tr><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6">Signed at</td><td style="padding:10px 16px;font-size:12px;color:#0b1a30;font-weight:500;border-top:1px solid #f3f4f6">${signedTime}</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:12px">
    <tr><td style="background:#0b1a30;border-radius:8px;padding:12px 24px">
      <a href="${dashboardUrl}" style="color:white;font-size:13px;font-weight:700;text-decoration:none">View in Dashboard →</a>
    </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0">
    <tr><td style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 24px">
      <a href="${downloadUrl}" style="color:#0b1a30;font-size:13px;font-weight:600;text-decoration:none">Download Signed Document ↓</a>
    </td></tr>
    </table>
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
    <p style="margin:0 0 12px;color:#0b1a30;font-size:14px">Hello ${doc.client_name},</p>
    <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6">Thank you for signing the <strong>${docLabel}</strong> with NetBounce Global LLC. Your signed copy is ready to download.</p>
    <p style="margin:0 0 8px;color:#374151;font-size:14px"><strong>Signed:</strong> ${signedTime}</p>
    <table cellpadding="0" cellspacing="0" style="margin:20px 0">
    <tr><td style="background:#0b1a30;border-radius:8px;padding:12px 24px">
      <a href="${downloadUrl}" style="color:white;font-size:14px;font-weight:700;text-decoration:none">Download Signed Document ↓</a>
    </td></tr>
    </table>
    <p style="margin:0;color:#9ca3af;font-size:12px">Questions? Contact us at docsign@netbounceglobal.com</p>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#9ca3af;font-size:11px;text-align:center">NetBounce Global LLC · docsign@netbounceglobal.com · +1 (915) 666-9102</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`

    const hasGmailConfig = process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN
    if (hasGmailConfig) {
      try {
        console.log('[notify-signed] sending via Gmail API...')
        
        // Send to team
        if (teamRecipient) {
          const teamEmailResult = await sendGmailMessage({
            to: teamRecipient,
            senderDisplayName: 'NetBounce Placement',
            subject: `[COMPLETED] ${docLabel} Signed - ${doc.client_name}`,
            text: `The candidate ${doc.client_name} has successfully executed the ${docLabel}.\nThe final signed PDF is attached to this email for administrative filing.`,
            html: teamHtml,
            attachments: [
              {
                filename,
                contentType: 'application/pdf',
                content: signedPdf,
              },
            ],
          })
          if (!teamEmailResult.ok) {
            console.warn('[notify-signed] Gmail API failed to send copy to team:', teamEmailResult.reason)
          } else {
            console.log('[notify-signed] Gmail API successfully sent to team desk')
          }
        }

        // Send to candidate
        const candidateEmailResult = await sendGmailMessage({
          to: doc.client_email,
          senderDisplayName: 'NetBounce Placement',
          subject: doc.type === 'agreement' ? 'NetBounce Signed Agreement Executive Copy' : `Your signed ${docLabel} — NetBounce Global LLC`,
          text: `Hello ${doc.client_name},\n\nPlease find attached the final executed copy of your ${docLabel} for your records.`,
          html: clientHtml,
          attachments: [
            {
              filename,
              contentType: 'application/pdf',
              content: signedPdf,
            },
          ],
        })

        if (!candidateEmailResult.ok) {
          throw new Error(`Gmail API failed to send to candidate: ${candidateEmailResult.reason}`)
        }

        console.log('[notify-signed] Gmail API successfully sent to candidate')
        return NextResponse.json({ ok: true })
      } catch (gmailError: any) {
        console.error('[notify-signed] Gmail API delivery failed, trying SMTP fallback...', gmailError)
      }
    }

    // Fallback to SMTP
    const smtpHost = cleanEmail(process.env.SMTP_HOST || '')
    const smtpPort = Number(cleanEmail(process.env.SMTP_PORT || ''))
    const smtpUser = cleanEmail(process.env.SMTP_USER || '')
    const smtpPass = cleanEmail(process.env.SMTP_PASS || '')

    if (!smtpHost || !Number.isFinite(smtpPort) || !smtpUser || !smtpPass) {
      console.error('[notify-signed] SMTP configuration also missing')
      return NextResponse.json({ error: 'Gmail API and SMTP are not configured.' }, { status: 500 })
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      const emailAttachments = [
        {
          filename,
          content: signedPdf,
          contentType: 'application/pdf',
        },
      ]

      if (teamRecipient) {
        console.log('[notify-signed] sending executed PDF to NetBounce office desk via SMTP', { to: teamRecipient })
        await transporter.sendMail({
          from: `"NetBounce Placement" <${smtpUser}>`,
          to: teamRecipient,
          subject: `[COMPLETED] ${docLabel} Signed - ${doc.client_name}`,
          text: `The candidate ${doc.client_name} has successfully executed the ${docLabel}.\nThe final signed PDF is attached to this email for administrative filing.`,
          html: teamHtml,
          attachments: emailAttachments,
        })
      }

      console.log('[notify-signed] sending executed PDF to candidate via SMTP', { to: doc.client_email })
      await transporter.sendMail({
        from: `"NetBounce Placement" <${smtpUser}>`,
        to: doc.client_email,
        subject: doc.type === 'agreement' ? 'NetBounce Signed Agreement Executive Copy' : `Your signed ${docLabel} — NetBounce Global LLC`,
        text: `Hello ${doc.client_name},\n\nPlease find attached the final executed copy of your ${docLabel} for your records.`,
        html: clientHtml,
        attachments: emailAttachments,
      })

      return NextResponse.json({ ok: true })
    } catch (smtpError: any) {
      console.error('[notify-signed] SMTP execution failed:', smtpError)
      return NextResponse.json({ error: smtpError instanceof Error ? smtpError.message : 'SMTP delivery failed.' }, { status: 500 })
    }
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
