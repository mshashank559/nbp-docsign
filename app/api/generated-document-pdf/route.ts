import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Document } from '@/lib/types'
import { buildGeneratedDocumentPdf } from '@/lib/generated-document-pdf'
import { normalizeDocument } from '@/lib/document-normalize'

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return new NextResponse('Missing document id', { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).single()
  if (error || !data) return new NextResponse('Document not found', { status: 404 })

  const doc = normalizeDocument(data as Document)
  let bytes: Uint8Array
  try {
    bytes = await buildGeneratedDocumentPdf(doc)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate document'
    return new NextResponse(message, { status: 400 })
  }
  const filename = `${doc.type}_${doc.client_name || 'document'}.pdf`.replace(/[^\w.-]+/g, '_')

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}
