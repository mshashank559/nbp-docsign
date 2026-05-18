import { NextRequest, NextResponse } from 'next/server'
import { buildFilledAgreementPdf } from '@/lib/agreement-pdf'

export async function POST(req: NextRequest) {
  try {
    const { fields = {} } = await req.json().catch(() => ({ fields: {} }))
    const pdfBytes = await buildFilledAgreementPdf(fields)

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
        'Content-Disposition': 'inline; filename="agreement-preview.pdf"',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate agreement preview'
    console.error('[agreement-preview-pdf] Failed to generate preview', error)
    return new NextResponse(message, { status: 500 })
  }
}
