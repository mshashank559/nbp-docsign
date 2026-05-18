import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/service-supabase'
import { insertAuditEvent } from '@/lib/audit'

export async function GET(req: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId: rawDocId } = await params
  const docId = String(rawDocId || '')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const viewUrl = new URL(`/view-document/${docId || 'missing-document'}`, appUrl)

  if (!docId || docId === 'undefined' || docId === 'null') {
    console.error('[track] Missing or invalid document id')
    return NextResponse.redirect(viewUrl)
  }

  try {
    let supabase
    try {
      supabase = serviceClient()
    } catch (err) {
      console.error(err)
      return NextResponse.redirect(viewUrl)
    }
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('id, type, client_email, view_count')
      .eq('id', docId)
      .single()

    if (fetchError || !doc) {
      console.error('[track] Document not found:', docId, fetchError)
      return NextResponse.redirect(viewUrl)
    }

    const nextViewCount = Number(doc.view_count || 0) + 1
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'viewed',
        view_count: nextViewCount,
      })
      .eq('id', docId)

    if (updateError) {
      console.error('[track] Document update failed:', docId, updateError)
      return NextResponse.redirect(viewUrl)
    }

    await insertAuditEvent(supabase, req, {
      document_id: docId,
      event: 'View document button clicked',
      actor: doc.client_email || 'Anonymous Candidate',
      metadata: {
        source: 'email-button',
        type: doc.type,
        documentId: docId,
        redirectedTo: viewUrl.pathname,
        view_count_at_click: nextViewCount,
        clickedAt: new Date().toISOString(),
      },
    })

    return NextResponse.redirect(viewUrl)
  } catch (error) {
    console.error('Tracking failed, but redirecting anyway:', error)
    return NextResponse.redirect(viewUrl)
  }
}
