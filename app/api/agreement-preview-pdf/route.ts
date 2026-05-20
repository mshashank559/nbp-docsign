import { NextRequest, NextResponse } from 'next/server'
import { buildFilledAgreementPdf } from '@/lib/agreement-pdf'

const AGREEMENT_TEMPLATE_URL = '/templates/agreement-template.pdf'

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: 'static-preview',
    pdfUrl: AGREEMENT_TEMPLATE_URL,
  })
}

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
    console.error('[agreement-preview-pdf] Failed to prepare preview descriptor', error)
    return NextResponse.json(
      {
        ok: false,
        error: 'Unable to prepare agreement preview',
      },
      { status: 500 },
    )
  }
}
