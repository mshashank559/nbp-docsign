import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { resolveSenderRole } from '@/lib/rbac'

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'API is ready for clean public routing.',
  })
}

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json()
    if (!documentId) {
      return NextResponse.json({ ok: false, error: 'Missing documentId' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: userData } = await supabase.auth.getUser()
    const senderRole = resolveSenderRole(userData?.user)

    // 1. Fetch Document from Database
    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error || !doc) {
      return NextResponse.json({ ok: false, error: 'Document not found' }, { status: 404 })
    }

    // 2. Pure Client-Side Link Construction (No background terminal scripts!)
    const recipientEmail = doc.client_email || ''
    const subject = `Review & Sign Agreement - NetBounce Placement`
    
    // Yahan hum local host ki jagah hamara fixed production path link banayenge
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nbg-docsign.vercel.app'
    const signingUrl = `${baseUrl}/view-document/${doc.id}`
    
    const body = `Hello ${doc.client_name || 'Candidate'},\n\nPlease review and complete the signature process for your agreement by clicking the link below:\n\n${signingUrl}\n\nBest regards,\nNetBounce Placement Team`

    const draftUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(recipientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

    // 3. Update status in Database
    await supabase
      .from('documents')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', doc.id)

    // 4. Return Clean JSON Response to Frontend
    return NextResponse.json({
      ok: true,
      success: true,
      draftUrl,
      url: draftUrl,
    })

  } catch (error) {
    console.error('[send-signing-email] Server Error:', error)
    return NextResponse.json(
      { ok: false, error: 'Unable to prepare email draft securely' },
      { status: 500 }
    )
  }
}