import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data: doc } = await supabase.from('documents').select('*').eq('signing_token', token).single()
    if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const docLabel = DOCUMENT_TYPE_LABELS[doc.type as keyof typeof DOCUMENT_TYPE_LABELS] || doc.type
    const downloadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/download-pdf?token=${token}`
    const signedDate = doc.signed_at ? new Date(doc.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb"><tr><td style="background:#0D1F14;padding:24px 32px"><p style="margin:0;color:#A8D5B8;font-size:11px;font-weight:700;margin-bottom:4px">NetBounce Placement LLC</p><p style="margin:0;color:white;font-size:18px;font-weight:700">Your signed document</p></td></tr><tr><td style="padding:32px"><p style="margin:0 0 8px;color:#0D1F14;font-size:14px">Hello ${doc.client_name},</p><p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.6">Here is your copy of the <strong>${docLabel}</strong> signed with NetBounce Placement LLC on ${signedDate}.</p><table cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="background:#0D1F14;border-radius:8px;padding:12px 24px"><a href="${downloadUrl}" style="color:white;font-size:14px;font-weight:700;text-decoration:none">Download Signed Document</a></td></tr></table><p style="margin:0;color:#9ca3af;font-size:12px">Questions? Contact us at enroll@netbounceplacement.com</p></td></tr><tr><td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb"><p style="margin:0;color:#9ca3af;font-size:11px;text-align:center">NetBounce Placement LLC · enroll@netbounceplacement.com · +1 (915) 666-9102</p></td></tr></table></td></tr></table></body></html>`
    const accessToken = await getAccessToken()
    if (accessToken && process.env.GMAIL_SENDER_EMAIL) {
      const msg = buildMime({ from: process.env.GMAIL_SENDER_EMAIL, to: doc.client_email, subject: `Your signed ${docLabel} — NetBounce Placement LLC`, html })
      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw: msg }) })
    } else { console.log('EMAIL COPY (Gmail not configured) to:', doc.client_email) }
    return NextResponse.json({ ok: true })
  } catch (err) { console.error(err); return NextResponse.json({ error: 'Failed' }, { status: 500 }) }
}

async function getAccessToken() {
  const GMAIL_CLIENT_ID = (process.env.GMAIL_CLIENT_ID || '').trim().replace(/^['"]|['"]$/g, '')
  const GMAIL_CLIENT_SECRET = (process.env.GMAIL_CLIENT_SECRET || '').trim().replace(/^['"]|['"]$/g, '')
  const GMAIL_REFRESH_TOKEN = (process.env.GMAIL_REFRESH_TOKEN || '').trim().replace(/^['"]|['"]$/g, '')
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) return null
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET, refresh_token: GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' }) })
  return (await res.json()).access_token ?? null
}

function buildMime({ from, to, subject, html }: { from: string; to: string; subject: string; html: string }) {
  const mime = [`From: NetBounce Placement LLC <${from}>`, `To: ${to}`, `Subject: ${subject}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=utf-8', '', html].join('\r\n')
  return Buffer.from(mime).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
