import { NextRequest, NextResponse } from 'next/server'
import { buildFilledAgreementPdf } from './agreement-pdf'
import { insertAuditEvent } from './audit'
import { buildGeneratedDocumentPdf } from './generated-document-pdf'
import { normalizeDocument } from './document-normalize'
import { serviceClient } from './service-supabase'
import { Document } from './types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function buildDocumentPdfResponse(req: NextRequest, documentId: string, options: { download?: boolean } = {}) {
  const safeDocumentId = String(documentId || '').trim()
  if (!UUID_RE.test(safeDocumentId)) {
    console.warn('[document-pdf] Invalid document id', { documentId: safeDocumentId })
    return NextResponse.json({ error: 'Invalid document id' }, { status: 400 })
  }

  let supabase
  try {
    supabase = serviceClient()
  } catch (error) {
    console.error('[document-pdf] Missing Supabase service configuration', error)
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase service credentials' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', safeDocumentId)
    .single()

  if (error || !data) {
    console.warn('[document-pdf] Document not found', { documentId: safeDocumentId, error: error?.message })
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const doc = normalizeDocument(data as Document)
  let pdfBytes: Uint8Array

  try {
    pdfBytes = doc.type === 'agreement'
      ? await buildFilledAgreementPdf(doc.fields || {})
      : await buildGeneratedDocumentPdf(doc)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate document PDF'
    console.error('[document-pdf] PDF generation failed', { documentId: doc.id, type: doc.type, message })
    return NextResponse.json({ error: message }, { status: 500 })
  }

  const nextViewCount = Number(doc.view_count || 0) + 1
  const nextStatus = doc.status === 'signed' ? doc.status : 'viewed'

  const { error: updateError } = await supabase
    .from('documents')
    .update({ status: nextStatus, view_count: nextViewCount })
    .eq('id', doc.id)

  if (updateError) {
    console.warn('[document-pdf] View count/status update failed', { documentId: doc.id, error: updateError.message })
  }

  await insertAuditEvent(supabase, req, {
    document_id: doc.id,
    event: options.download ? 'Document downloaded by client' : 'Document opened by client',
    actor: doc.client_email || 'Anonymous Candidate',
    metadata: {
      source: 'api-document',
      type: doc.type,
      documentId: doc.id,
      view_count_at_click: nextViewCount,
      openedAt: new Date().toISOString(),
    },
  })

  const filename = `${doc.type}_${doc.client_name || 'document'}.pdf`.replace(/[^\w.-]+/g, '_')

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${options.download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Document-Id': doc.id,
    },
  })
}
