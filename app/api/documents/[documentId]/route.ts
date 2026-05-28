import { NextRequest } from 'next/server'
import { buildDocumentPdfResponse } from '@/lib/document-pdf-response'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  const download = req.nextUrl.searchParams.get('download') === '1'
  return buildDocumentPdfResponse(req, documentId, { download })
}
