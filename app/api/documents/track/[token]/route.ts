import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/service-supabase'
import { normalizeDocument } from '@/lib/document-normalize'
import { Document } from '@/lib/types'
import { getTrackedDocumentPath, recordEmailDocumentClick } from '@/lib/document-tracking'
import { resolveAppUrl } from '@/lib/app-url'


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const resolvedParams = await params
  const token = decodeURIComponent(String(resolvedParams.token || ''))
  let supabase
  try {
    supabase = serviceClient()
  } catch (err) {
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 })
  }
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('signing_token', token)
    .single()

  const appUrl = resolveAppUrl(req)

  if (error || !data) {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  const doc = normalizeDocument(data as Document)
  await recordEmailDocumentClick(supabase, req, doc, { token })

  return NextResponse.redirect(new URL(getTrackedDocumentPath(doc), appUrl))
}
