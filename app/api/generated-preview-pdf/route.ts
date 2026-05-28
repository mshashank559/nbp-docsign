import { NextRequest, NextResponse } from 'next/server'
import { buildSignedDocumentPdf } from '@/lib/signed-pdf'
import { Document, DocType } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const {
      type,
      fields = {},
      clientName = '',
      clientEmail = '',
      clientCompany = '',
      clientSignature = '',
    } = await req.json()

    if (!type) return new NextResponse('Missing document type', { status: 400 })

    const doc: Document = {
      id: 'preview',
      type: type as DocType,
      status: 'draft',
      client_name: clientName,
      client_email: clientEmail,
      client_company: clientCompany,
      client_signature: clientSignature || undefined,
      fields,
      signing_token: '',
      created_at: new Date().toISOString(),
    }

    const pdfBytes = await buildSignedDocumentPdf(doc)

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
