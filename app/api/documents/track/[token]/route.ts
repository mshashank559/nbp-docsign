import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/service-supabase'
import { normalizeDocument } from '@/lib/document-normalize'
import { Document } from '@/lib/types'
import { getTrackedDocumentPath, recordEmailDocumentClick } from '@/lib/document-tracking'


export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  let supabase
  try {
    supabase = serviceClient()
  } catch (err) {
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 })
  }
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('signing_token', params.token)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin

  if (error || !data) {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  const doc = normalizeDocument(data as Document)
  await recordEmailDocumentClick(supabase, req, doc, { token: params.token })

  return NextResponse.redirect(new URL(getTrackedDocumentPath(doc), appUrl))
}
