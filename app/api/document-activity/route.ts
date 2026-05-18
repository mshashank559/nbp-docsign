import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/service-supabase'
import { incrementDocumentViewCount, insertAuditEvent } from '@/lib/audit'
import { normalizeDocument } from '@/lib/document-normalize'
import { Document } from '@/lib/types'


export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const documentId = String(body.documentId || '')
  const token = String(body.token || '')
  const event = String(body.event || 'Document activity')
  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {}

  if (!documentId && !token) {
    return NextResponse.json({ error: 'Missing document identifier' }, { status: 400 })
  }

  let supabase
  try {
    supabase = serviceClient()
  } catch (err) {
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 })
  }
  const query = documentId
    ? supabase.from('documents').select('*').eq('id', documentId).single()
    : supabase.from('documents').select('*').eq('signing_token', token).single()

  const { data, error } = await query
  if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const doc = normalizeDocument(data as Document)
  const actor = metadata.actor ? String(metadata.actor) : doc.client_email
  const isOpenViewEvent = event.startsWith('Document opened') || event.startsWith('Document viewed')

  if (isOpenViewEvent && doc.status === 'sent') {
    await supabase.from('documents').update({ status: 'viewed', view_count: Number(doc.view_count || 0) + 1 }).eq('id', doc.id)
  } else if (isOpenViewEvent) {
    await incrementDocumentViewCount(supabase, doc)
  }

  await insertAuditEvent(supabase, req, {
    document_id: doc.id,
    event,
    actor,
    metadata: {
      type: doc.type,
      viewer: doc.client_email,
      completedView: event.includes('completed view') || Boolean(metadata.completedView),
      ...metadata,
    },
  })

  return NextResponse.json({ ok: true })
}
