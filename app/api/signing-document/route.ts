import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/service-supabase'
import { Document } from '@/lib/types'
import { normalizeDocument } from '@/lib/document-normalize'
import { requiresSignatureDocument } from '@/lib/document-workflow'
import { incrementDocumentViewCount, insertAuditEvent } from '@/lib/audit'

// Use centralized service client helper

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  const alreadyTracked = new URL(req.url).searchParams.get('tracked') === '1'
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

  let supabase
  try {
    supabase = serviceClient()
  } catch (err) {
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 })
  }
  const { data, error } = await supabase.from('documents').select('*').eq('signing_token', token).single()
  if (error || !data) return NextResponse.json({ error: 'This signing link is invalid or has expired.' }, { status: 404 })

  const doc = normalizeDocument(data as Document)
  if (!requiresSignatureDocument(doc)) {
    return NextResponse.json({ error: 'This document is view/download only and does not require a signature.' }, { status: 400 })
  }
  if (doc.status === 'sent' && !alreadyTracked) {
    await supabase.from('documents').update({ status: 'viewed', view_count: Number(doc.view_count || 0) + 1 }).eq('id', doc.id)
    await insertAuditEvent(supabase, req, {
      document_id: doc.id,
      event: 'Document viewed by client',
      actor: doc.client_email,
      metadata: { source: 'signing-document', type: doc.type },
    })
    doc.status = 'viewed'
    doc.view_count = Number(doc.view_count || 0) + 1
  } else {
    if (!alreadyTracked) await incrementDocumentViewCount(supabase, doc)
    await insertAuditEvent(supabase, req, {
      document_id: doc.id,
      event: 'Document opened by client',
      actor: doc.client_email,
      metadata: { source: 'signing-document', type: doc.type },
    })
  }

  return NextResponse.json({ document: doc })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { token, signature, signatoryName, signatoryTitle, signaturePosition, agreementAddress, agreementContact } = body
  if (!token || !signature || !signatoryName) {
    return NextResponse.json({ error: 'Missing signature details' }, { status: 400 })
  }

  let supabase
  try {
    supabase = serviceClient()
  } catch (err) {
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase credentials' }, { status: 500 })
  }
  const { data, error } = await supabase.from('documents').select('*').eq('signing_token', token).single()
  if (error || !data) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const doc = normalizeDocument(data as Document)
  if (doc.status === 'signed') return NextResponse.json({ document: doc })
  if (!requiresSignatureDocument(doc)) {
    return NextResponse.json({ error: 'This document does not require a signature.' }, { status: 400 })
  }

  const signedAt = new Date().toISOString()
  const updatedFields = {
    ...(doc.fields || {}),
    agreementName: doc.type === 'agreement' ? String(signatoryName).trim() : doc.fields?.agreementName,
    agreementAddress: doc.type === 'agreement' ? String(agreementAddress || '').trim() : doc.fields?.agreementAddress,
    agreementContact: doc.type === 'agreement' ? String(agreementContact || '').trim() : doc.fields?.agreementContact,
    receivingSignatoryName: String(signatoryName).trim(),
    receivingSignatoryTitle: String(signatoryTitle || '').trim(),
    receivingSignatoryDate: signedAt.split('T')[0],
    signaturePosition: signaturePosition ? JSON.stringify(signaturePosition) : doc.fields?.signaturePosition,
  }

  const { error: updateError } = await supabase.from('documents').update({
    status: 'signed',
    client_signature: signature,
    signed_at: signedAt,
    fields: updatedFields,
  }).eq('signing_token', token)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await insertAuditEvent(supabase, req, {
    document_id: doc.id,
    event: 'Document signed by client',
    actor: doc.client_email,
    metadata: {
      signatoryName,
      signatoryTitle,
      signaturePosition,
    },
  })

  return NextResponse.json({ ok: true })
}
