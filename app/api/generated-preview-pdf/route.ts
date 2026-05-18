import { NextRequest, NextResponse } from 'next/server'
import { buildGeneratedDocumentPdf } from '@/lib/generated-document-pdf'
import { Document, DocType } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const {
      type,
      fields = {},
      clientName = '',
      clientEmail = '',
      clientCompany = '',
    } = await req.json()

    if (!type) return new NextResponse('Missing document type', { status: 400 })

    const doc: Document = {
      id: 'preview',
      type: type as DocType,
      status: 'draft',
      client_name: clientName,
      client_email: clientEmail,
      client_company: clientCompany,
      fields,
      signing_token: '',
      created_at: new Date().toISOString(),
    }

    const pdfBytes = await buildGeneratedDocumentPdf(doc)

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
        'Content-Disposition': `inline; filename="${type}-preview.pdf"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate preview'
    return new NextResponse(message, { status: 500 })
  }
}
