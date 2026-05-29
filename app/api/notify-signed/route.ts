import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/service-supabase'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'

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

    const { data: doc } = await supabase.from('documents').select('*').eq('id', documentId).single()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://nbg-docsign.vercel.app')

    const docLabel = DOCUMENT_TYPE_LABELS[doc.type as keyof typeof DOCUMENT_TYPE_LABELS] || doc.type

    const downloadUrl = `${appUrl}/api/download-pdf?id=${documentId}`
    const dashboardUrl = `${appUrl}/dashboard/documents/${documentId}`
    const signedTime = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:#0D1F14;padding:24px 32px">
    <p style="margin:0;color:#A8D5B8;font-size:11px;font-weight:700;margin-bottom:4px">NetBounce Global LLC · DocSign</p>
    <p style="margin:0;color:white;font-size:18px;font-weight:700">✓ Document Signed</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;color:#0D1F14;font-size:15px;font-weight:700">A document has been signed</p>
    <table style="width:100%;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px" cellpadding="0" cellspacing="0">
      <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:12px;color:#6b7280;width:140px">Document</td><td style="padding:10px 16px;font-size:12px;color:#0D1F14;font-weight:500">${docLabel}</td></tr>
      <tr><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6">Signed by</td><td style="padding:10px 16px;font-size:12px;color:#0D1F14;font-weight:500;border-top:1px solid #f3f4f6">${signatoryName} (${signatoryEmail})</td></tr>
      <tr style="background:#f9fafb"><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6">Client</td><td style="padding:10px 16px;font-size:12px;color:#0D1F14;font-weight:500;border-top:1px solid #f3f4f6">${doc.client_name}${doc.client_company ? ' · ' + doc.client_company : ''}</td></tr>
      <tr><td style="padding:10px 16px;font-size:12px;color:#6b7280;border-top:1px solid #f3f4f6">Signed at</td><td style="padding:10px 16px;font-size:12px;color:#0D1F14;font-weight:500;border-top:1px solid #f3f4f6">${signedTime}</td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin-bottom:12px">
    <tr><td style="background:#0D1F14;border-radius:8px;padding:12px 24px">
      <a href="${dashboardUrl}" style="color:white;font-size:13px;font-weight:700;text-decoration:none">View in Dashboard →</a>
    </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0">
    <tr><td style="border:1px solid #e5e7eb;border-radius:8px;padding:12px 24px">
      <a href="${downloadUrl}" style="color:#0D1F14;font-size:13px;font-weight:600;text-decoration:none">Download Signed Document ↓</a>
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

    const accessToken = await getAccessToken()
    if (accessToken && process.env.GMAIL_SENDER_EMAIL) {
      // Send to NBG team
      const nbgMsg = buildMime({
        from: process.env.GMAIL_SENDER_EMAIL,
        to: process.env.GMAIL_SENDER_EMAIL,
        subject: `✓ Signed: ${docLabel} — ${doc.client_name}`,
        html,
      })
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: nbgMsg }),
      })

      // Also send confirmation to client with download link
      const clientHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="background:#0D1F14;padding:24px 32px">
    <p style="margin:0;color:#A8D5B8;font-size:11px;font-weight:700;margin-bottom:4px">NetBounce Global LLC</p>
    <p style="margin:0;color:white;font-size:18px;font-weight:700">Your signed document is ready</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 12px;color:#0D1F14;font-size:14px">Hello ${doc.client_name},</p>
    <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6">Thank you for signing the <strong>${docLabel}</strong> with NetBounce Global LLC. Your signed copy is ready to download.</p>
    <p style="margin:0 0 8px;color:#374151;font-size:14px"><strong>Signed:</strong> ${signedTime}</p>
    <table cellpadding="0" cellspacing="0" style="margin:20px 0">
    <tr><td style="background:#0D1F14;border-radius:8px;padding:12px 24px">
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

      const clientMsg = buildMime({
        from: process.env.GMAIL_SENDER_EMAIL,
        to: doc.client_email,
        subject: doc.type === 'agreement' ? 'NetBonds Signed Agreement Executive Copy' : `Your signed ${docLabel} — NetBounce Global LLC`,
        html: clientHtml,
      })
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw: clientMsg }),
      })
    } else {
      console.log('SIGNED NOTIFICATION (Gmail not configured):', { documentId, signatoryName })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

async function getAccessToken() {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) return null
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET, refresh_token: GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  })
  return (await res.json()).access_token ?? null
}

function buildMime({ from, to, subject, html }: { from: string; to: string; subject: string; html: string }) {
  const mime = [`From: NetBounce Placement LLC <${from}>`, `To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', '', html].join('\r\n')
  return Buffer.from(mime).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
