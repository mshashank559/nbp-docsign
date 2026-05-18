import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-token',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers })
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ documents: [] }, { headers })

  // Simple token check — CRM sends this to verify the request
  const token = req.headers.get('x-api-token')
  const expected = process.env.CRM_API_TOKEN
  if (expected && token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('documents')
    .select('id, type, status, created_at, signed_at, signing_token, client_name')
    .eq('client_email', email)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ documents: [] }, { headers })

  return NextResponse.json({ documents: data }, { headers })
}
