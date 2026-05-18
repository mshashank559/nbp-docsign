import { NextResponse } from 'next/server'

function mask(value?: string) {
  if (!value) return 'MISSING'
  if (value.length <= 16) return `SET (${value.length} chars)`
  return `SET (${value.slice(0, 12)}...${value.slice(-6)})`
}

function supabaseRef(value?: string) {
  if (!value) return 'MISSING'
  try {
    return new URL(value).hostname.split('.')[0] || 'UNKNOWN'
  } catch {
    return 'INVALID'
  }
}

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'MISSING',
    VERCEL_URL: process.env.VERCEL_URL || 'MISSING',
    NEXT_PUBLIC_SUPABASE_URL: mask(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_REF: supabaseRef(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
    GMAIL_SENDER_EMAIL: process.env.GMAIL_SENDER_EMAIL || 'MISSING',
  })
}
