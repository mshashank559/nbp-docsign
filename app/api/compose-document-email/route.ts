import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { normalizeDocument } from '@/lib/document-normalize'
import { buildDocumentEmailActionAttachments, buildDocumentEmailInput } from '@/lib/document-attachments'
import { createGmailDraft } from '@/lib/gmail'
import { resolveSenderRole } from '@/lib/rbac'

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

    const normalizedDoc = normalizeDocument(doc)
    const { data: userData } = await supabase.auth.getUser()
    const senderRole = resolveSenderRole(userData.user)
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(/\/+$/, '')
    const templateSigningUrl = `${baseUrl}/view-document/${encodeURIComponent(documentId)}`
    const actions = buildDocumentEmailActionAttachments(normalizedDoc)
    const emailInput = buildDocumentEmailInput(normalizedDoc, actions, { url: baseUrl })
    if (emailInput.html) {
      emailInput.html = emailInput.html.replace(/\/api\/documents\/track\/[a-zA-Z0-9_\-]+/g, `/view-document/${documentId}`)
    }

    const draftResult = await createGmailDraft(emailInput, senderRole)
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

    await supabase.from('audit_trail').insert({
      document_id: documentId,
      event: draftResult.ok ? 'Gmail HTML draft prepared' : 'HTML email draft file prepared',
      actor: 'system',
      metadata: {
        to: normalizedDoc.client_email,
        mode: draftResult.ok ? 'gmail-html-draft' : 'html-eml-fallback',
        document_url: templateSigningUrl,
        gmail_draft_id: draftResult.ok ? draftResult.draftId : null,
        fallback_reason: draftResult.ok ? null : draftResult.reason,
        sent_at: sentAt,
      },
    })

    if (draftResult.ok) {
      return NextResponse.json({
        ok: true,
        success: true,
        mode: 'gmail-html-draft',
        draftUrl: draftResult.url,
        url: draftResult.url,
        templateSigningUrl,
        documentId,
      })
    }

    return new NextResponse(createEml(emailInput), {
      status: 200,
      headers: {
        'Content-Type': 'message/rfc822; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeFilename(`netbounce_${normalizedDoc.type}_${normalizedDoc.client_name || 'document'}_draft.eml`)}"`,
        'X-Draft-Fallback-Reason': draftResult.reason,
      },
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

function createEml(input: { to: string; senderDisplayName: string; subject: string; text: string; html?: string }) {
  const boundary = `----=_NBG_ALT_${Date.now().toString(36)}`
  return [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.text,
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    input.html || escapeHtml(input.text).replace(/\r?\n/g, '<br>'),
    `--${boundary}--`,
    '',
  ].join('\r\n')
}

function safeFilename(value: string) {
  return value.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_')
}

function escapeHtml(value: string) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char] || char))
}
