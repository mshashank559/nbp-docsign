import { NextRequest, NextResponse } from 'next/server'

const AGREEMENT_TEMPLATE_URL = '/templates/agreement-template.pdf'

export async function POST(req: NextRequest) {
  try {
    const { fields = {} } = await req.json().catch(() => ({ fields: {} }))

    return NextResponse.json({
      ok: true,
      mode: 'static-preview',
      pdfUrl: AGREEMENT_TEMPLATE_URL,
      fields,
    })
  } catch (error) {
    console.error('[agreement-preview-pdf] Failed to prepare preview descriptor', error)
    return NextResponse.json({ error: 'Unable to prepare agreement preview' }, { status: 500 })
  }
}
