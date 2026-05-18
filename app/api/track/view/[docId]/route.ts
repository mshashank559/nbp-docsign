import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { insertAuditEvent } from '@/lib/audit'

// Initialize Supabase with Service Role to bypass RLS for unauthenticated tracking
function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ docId: string }> } 
) {
  const supabase = serviceClient()
  
  // 1. Unwrap params (Required for Next.js 15+)
  const { docId } = await params
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
  const safeDocId = String(docId || '')
  
  // This is the UI page where the PDF viewer lives
  const documentUrl = new URL(`/view-document/${safeDocId || 'missing-document'}`, appUrl)

  // Fail-safe: If no ID, redirect to a safe page immediately
  if (!safeDocId || safeDocId === 'undefined' || safeDocId === 'null') {
    console.error('[track/view] Missing or invalid document id')
    return NextResponse.redirect(documentUrl)
  }

  try {
    // 2. Fetch document details
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('id, type, status, client_email, view_count')
      .eq('id', safeDocId)
      .single()

    if (fetchError || !doc) {
      console.error('[track/view] Document not found in DB:', safeDocId)
      return NextResponse.redirect(documentUrl)
    }

    // 3. Update Status & Increment View Count
    const nextViewCount = Number(doc.view_count || 0) + 1

    const { error: updateError } = await supabase
      .from('documents')
      .update({ 
        status: 'viewed', 
        view_count: nextViewCount 
      })
      .eq('id', safeDocId)

    if (updateError) {
      console.error('[track/view] Status update failed:', updateError.message)
      // We continue to redirect so the user still sees their document
    }

    // 4. Record the Audit Log
    await insertAuditEvent(supabase, req, {
      document_id: safeDocId,
      event: 'View document button clicked',
      actor: doc.client_email || 'Anonymous Candidate',
      metadata: {
        source: 'email-button',
        type: doc.type,
        documentId: safeDocId,
        redirectedTo: documentUrl.pathname,
        view_count_at_click: nextViewCount,
        clickedAt: new Date().toISOString(),
      },
    })

    // 5. FINAL REDIRECT (To the UI, NOT the API)
    return NextResponse.redirect(documentUrl)

  } catch (err) {
    console.error('[track/view] Unexpected System Error:', err)
    return NextResponse.redirect(documentUrl)
  }
}
