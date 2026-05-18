import { NextRequest, NextResponse } from 'next/server'
import * as gmail from '@/lib/gmail'

const gmailLib = gmail as any
const getGmailAccessToken =
  gmailLib.getGmailAccessToken ??
  gmailLib.getAccessToken ??
  gmailLib.default?.getGmailAccessToken ??
  gmailLib.default?.getAccessToken
const getGmailConfigStatus =
  gmailLib.getGmailConfigStatus ??
  gmailLib.getConfigStatus ??
  gmailLib.default?.getGmailConfigStatus ??
  gmailLib.default?.getConfigStatus
const sendGmailMessage =
  gmailLib.sendGmailMessage ??
  gmailLib.sendMessage ??
  gmailLib.default?.sendGmailMessage ??
  gmailLib.default?.sendMessage

export async function GET(req: NextRequest) {
  const config = getGmailConfigStatus()
  const variables = {
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID ? `SET (${process.env.GMAIL_CLIENT_ID.slice(0, 12)}...)` : 'MISSING',
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET ? `SET (${process.env.GMAIL_CLIENT_SECRET.slice(0, 6)}...)` : 'MISSING',
    GMAIL_REFRESH_TOKEN: process.env.GMAIL_REFRESH_TOKEN ? `SET (${process.env.GMAIL_REFRESH_TOKEN.slice(0, 12)}...)` : 'MISSING',
    GMAIL_SENDER_EMAIL: process.env.GMAIL_SENDER_EMAIL || 'MISSING',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'MISSING',
  }

  if (!config.configured) {
    return NextResponse.json({
      status: 'FAILED',
      reason: `Missing Gmail configuration: ${config.missing.join(', ')}`,
      variables,
    }, { status: 500 })
  }

  const token = await getGmailAccessToken()
  if (!token.ok) {
    return NextResponse.json({
      status: 'FAILED',
      reason: token.reason,
      token_error: token.details,
      variables,
    }, { status: 502 })
  }

  const testTo = req.nextUrl.searchParams.get('to') || config.senderEmail
  const sent = await sendGmailMessage({
    to: testTo,
    senderDisplayName: 'NBP DocSign',
    subject: 'NBP DocSign - Gmail test email',
    html: `
      <p>This is a test email from your NBP DocSign app.</p>
      <p>If you received this, Gmail is configured correctly.</p>
      <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
      <p><strong>From:</strong> ${config.senderEmail}</p>
    `,
  })

  if (!sent.ok) {
    return NextResponse.json({
      status: 'FAILED',
      reason: sent.reason,
      send_error: sent.details,
      variables,
    }, { status: 502 })
  }

  return NextResponse.json({
    status: 'SUCCESS',
    message: `Test email sent successfully to ${testTo}`,
    gmail_message_id: sent.messageId,
    variables,
  })
}
