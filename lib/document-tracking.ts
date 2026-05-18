import { NextRequest } from 'next/server'
import { incrementDocumentViewCount, insertAuditEvent } from './audit'
import { Document } from './types'

export function getTrackedDocumentPath(doc: Document) {
  return `/view-document/${doc.id}?tracked=1`
}

export function getTrackedDocumentPathForMetadata(doc: Document) {
  return `/view-document/${doc.id}`
}

export async function recordEmailDocumentClick(
  supabase: any,
  req: NextRequest,
  doc: Document,
  metadata: Record<string, unknown> = {},
) {
  const nextViewCount = Number(doc.view_count || 0) + 1

  if (doc.status !== 'signed') {
    await supabase
      .from('documents')
      .update({ status: 'viewed', view_count: nextViewCount })
      .eq('id', doc.id)
  } else {
    await incrementDocumentViewCount(supabase, doc)
  }

  await insertAuditEvent(supabase, req, {
    document_id: doc.id,
    event: 'View document button clicked',
    actor: doc.client_email,
    metadata: {
      source: 'email-button',
      type: doc.type,
      redirectedTo: getTrackedDocumentPathForMetadata(doc),
      clickedAt: new Date().toISOString(),
      ...metadata,
    },
  })
}
