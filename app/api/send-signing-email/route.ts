import { NextRequest, NextResponse } from 'next/server'
import { buildDocumentPdfUrl, buildDocumentViewUrl } from '@/lib/app-url'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { normalizeDocument } from '@/lib/document-normalize'
import { buildGmailComposeUrl } from '@/lib/mail-compose-url'
import { resolveSenderRole } from '@/lib/rbac'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Document } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json()
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: userData } = await supabase.auth.getUser()
    const senderRole = resolveSenderRole(userData.user)

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

    const doc = normalizeDocument(data as Document)
    const isAgreement = doc.type === 'agreement'
    const docLabel = DOCUMENT_TYPE_LABELS[doc.type] || doc.type
    const senderDisplayName = senderRole === 'HR'
      ? 'NetBounce HR'
      : senderRole === 'ACCOUNTS'
        ? 'NetBounce Accounts'
        : 'NetBounce Placement LLC'
    const documentUrl = isAgreement
      ? buildDocumentViewUrl(doc.id, req)
      : buildDocumentPdfUrl(doc.id, req)
    const subject = isAgreement
      ? `Signature Required: ${docLabel} - NetBounce Placement LLC`
      : `${docLabel} - NetBounce Placement LLC`
    const body = [
      `Hello ${doc.client_name},`,
      '',
      `${senderDisplayName} has prepared a ${docLabel} for your review${isAgreement ? ' and signature' : ''}.`,
      '',
      `Please use this secure link to view the ${docLabel}:`,
      documentUrl,
      '',
      'Thank you,',
      'NetBounce Placement LLC',
    ].join('\r\n')
    const draftUrl = buildGmailComposeUrl({
      to: doc.client_email,
      subject,
      body,
    })

    await supabase.from('audit_trail').insert({
      document_id: doc.id,
      event: isAgreement ? 'Signing email compose URL prepared' : 'Document view email compose URL prepared',
      actor: 'system',
      metadata: {
        to: doc.client_email,
        sender_role: senderRole,
        sent_from: senderDisplayName,
        mode: 'gmail-compose-url',
      },
    })

    await supabase
      .from('documents')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', doc.id)

    return NextResponse.json({
      success: true,
      ok: true,
      mode: 'gmail-compose-url',
      draftUrl,
      url: draftUrl,
    })
  } catch (error) {
    console.error('[send-signing-email] Failed to prepare Gmail compose URL', error)
    return NextResponse.json({ error: 'Failed to prepare email draft link' }, { status: 500 })
  }
}
