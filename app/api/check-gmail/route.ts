import { NextResponse } from 'next/server'

export async function GET() {
  const configured = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN)
  const senderEmail = process.env.GMAIL_SENDER_EMAIL || ''
  return NextResponse.json({ configured, senderEmail })
}
