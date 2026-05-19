import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { normalizeDocument } from '@/lib/document-normalize'

const DEFAULT_APP_URL = 'https://nbg-docsign.vercel.app'

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: 'gmail-compose-url',
    message: 'Gmail compose URLs are prepared with POST.',
  })
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}))
    const documentId = typeof payload?.documentId === 'string' ? payload.documentId.trim() : ''

    if (!documentId) {
      return NextResponse.json(
        { ok: false, success: false, error: 'Missing documentId' },
        { status: 400 },
      )
    }

    const supabase = await createServerSupabaseClient()
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (fetchError || !doc) {
      return NextResponse.json(
        { ok: false, success: false, error: 'Document not found' },
        { status: 404 },
      )
    }

    const sentAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'sent', sent_at: sentAt })
      .eq('id', documentId)

    if (updateError) {
      console.error('[compose-document-email] Failed to mark document as sent', updateError)
      return NextResponse.json(
        { ok: false, success: false, error: 'Document status could not be updated before sending.' },
        { status: 500 },
      )
    }

    const normalizedDoc = normalizeDocument(doc)
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')
    const templateSigningUrl = `${baseUrl}/view-document/${documentId}`
    const docLabel = getDocumentLabel(normalizedDoc.type)
    const subject = `Signature Required: ${docLabel} - NetBounce Placement LLC`
    const body = [
      `Hello ${normalizedDoc.client_name || 'there'},`,
      '',
      `Please review and sign the ${docLabel} using the secure link below:`,
      '',
      templateSigningUrl,
      '',
      'Thank you,',
      'NetBounce Placement LLC',
    ].join('\n')

    const draftParams = new URLSearchParams({
      view: 'cm',
      fs: '1',
      to: normalizedDoc.client_email || '',
      su: subject,
      body,
      tf: '1',
    })
    const draftUrl = `https://mail.google.com/mail/?${draftParams.toString()}`

    await supabase.from('audit_trail').insert({
      document_id: documentId,
      event: 'Gmail compose draft prepared',
      actor: 'system',
      metadata: {
        to: normalizedDoc.client_email,
        mode: 'gmail-compose-url',
        document_url: templateSigningUrl,
        sent_at: sentAt,
      },
    })

    return NextResponse.json({
      ok: true,
      success: true,
      mode: 'gmail-compose-url',
      draftUrl,
      url: draftUrl,
      templateSigningUrl,
      documentId,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to prepare Gmail compose draft'
    console.error('[compose-document-email] Failed to prepare Gmail compose draft', error)
    return NextResponse.json(
      { ok: false, success: false, error: message },
      { status: 500 },
    )
  }
}

function getDocumentLabel(type: string) {
  return String(type || 'Document')
    .split(/[-_]/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
