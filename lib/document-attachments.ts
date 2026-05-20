import { DOCUMENT_TYPE_LABELS } from './document-catalog'
import { normalizeDocument } from './document-normalize'
import { Document } from './types'
import { buildDocumentPdfUrl, buildDocumentViewUrl } from './app-url'
import type { NextRequest } from 'next/server'

type DocumentEmailUrlSource = Pick<NextRequest, 'url' | 'headers'> | {
  url?: string
  headers?: {
    get(name: string): string | null
  }
}

export type StoredAttachment = {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
  role?: 'primary' | 'additional'
}

export type EmailAttachment = {
  filename: string
  contentType: string
  content: Buffer
  documentId?: string
  signingToken?: string
  docType?: Document['type']
  docLabel?: string
}

export type BundleDocument = {
  id: string
  type: Document['type']
  fields: Record<string, string>
  documentId?: string
  signingToken?: string
}

export type DocumentEmailInput = {
  to: string
  senderDisplayName: string
  subject: string
  text: string
  html?: string
  attachments: EmailAttachment[]
}

export function parseStoredAttachments(value: unknown): StoredAttachment[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isStoredAttachment)
  } catch {
    return []
  }
}

export function parseStoredAttachment(value: unknown): StoredAttachment | null {
  if (!value) return null
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return isStoredAttachment(parsed) ? parsed : null
  } catch {
    return null
  }
}

export async function buildDocumentEmailAttachments(doc: Document, bundleDocuments?: Document[]): Promise<EmailAttachment[]> {
  const normalizedDoc = normalizeDocument(doc)
  const fields = normalizedDoc.fields || {}
  const plainAgreement = normalizedDoc.type === 'agreement' ? parseStoredAttachment(fields.__plainAgreement) : null
  const documents: EmailAttachment[] = []
  const primaryLabel = DOCUMENT_TYPE_LABELS[normalizedDoc.type] || normalizedDoc.type

  if (plainAgreement) {
    documents.push(withDocumentMeta(storedToEmailAttachment(plainAgreement), normalizedDoc, primaryLabel))
  } else if (normalizedDoc.type === 'agreement') {
    const { buildFilledAgreementPdf } = await import('./agreement-pdf')
    const pdfBytes = await buildFilledAgreementPdf(fields)
    documents.push(withDocumentMeta({
      filename: safeFilename(`agreement_${normalizedDoc.client_name || 'document'}.pdf`),
      contentType: 'application/pdf',
      content: Buffer.from(pdfBytes),
    }, normalizedDoc, primaryLabel))
  } else {
    const { buildGeneratedDocumentPdf } = await import('./generated-document-pdf')
    const pdfBytes = await buildGeneratedDocumentPdf(normalizedDoc)
    documents.push(withDocumentMeta({
      filename: safeFilename(`${normalizedDoc.type}_${normalizedDoc.client_name || 'document'}.pdf`),
      contentType: 'application/pdf',
      content: Buffer.from(pdfBytes),
    }, normalizedDoc, primaryLabel))
  }

  const childDocuments = bundleDocuments?.length
    ? bundleDocuments.map(child => normalizeDocument(child))
    : parseBundleDocuments(fields.__bundleDocuments).map(bundleDoc => normalizeDocument({
        ...normalizedDoc,
        id: bundleDoc.documentId || `${normalizedDoc.id}-${bundleDoc.id}`,
        signing_token: bundleDoc.signingToken || normalizedDoc.signing_token,
        type: bundleDoc.type,
        fields: bundleDoc.fields || {},
      }))

  for (const childDoc of childDocuments) {
    const childLabel = DOCUMENT_TYPE_LABELS[childDoc.type] || childDoc.type
    const pdfBytes = childDoc.type === 'agreement'
      ? await (await import('./agreement-pdf')).buildFilledAgreementPdf(childDoc.fields || {})
      : await (await import('./generated-document-pdf')).buildGeneratedDocumentPdf(childDoc)
    documents.push(withDocumentMeta({
      filename: safeFilename(`${childDoc.type}_${normalizedDoc.client_name || 'document'}.pdf`),
      contentType: 'application/pdf',
      content: Buffer.from(pdfBytes),
    }, childDoc, childLabel))
  }

  const attachments: EmailAttachment[] = [...documents]

  for (const stored of parseStoredAttachments(fields.__attachments)) {
    attachments.push(storedToEmailAttachment(stored))
  }

  return dedupeAttachments(attachments)
}

export function buildDocumentEmailActionAttachments(doc: Document, bundleDocuments?: Document[]): EmailAttachment[] {
  const normalizedDoc = normalizeDocument(doc)
  const primaryLabel = DOCUMENT_TYPE_LABELS[normalizedDoc.type] || normalizedDoc.type
  const actions: EmailAttachment[] = [withDocumentMeta({
    filename: safeFilename(`${normalizedDoc.type}_${normalizedDoc.client_name || 'document'}.pdf`),
    contentType: 'application/pdf',
    content: Buffer.alloc(0),
  }, normalizedDoc, primaryLabel)]

  const childDocuments = bundleDocuments?.length
    ? bundleDocuments.map(child => normalizeDocument(child))
    : parseBundleDocuments(normalizedDoc.fields?.__bundleDocuments).map(bundleDoc => normalizeDocument({
        ...normalizedDoc,
        id: bundleDoc.documentId || `${normalizedDoc.id}-${bundleDoc.id}`,
        signing_token: bundleDoc.signingToken || normalizedDoc.signing_token,
        type: bundleDoc.type,
        fields: bundleDoc.fields || {},
      }))

  for (const childDoc of childDocuments) {
    actions.push(withDocumentMeta({
      filename: safeFilename(`${childDoc.type}_${normalizedDoc.client_name || 'document'}.pdf`),
      contentType: 'application/pdf',
      content: Buffer.alloc(0),
    }, childDoc, DOCUMENT_TYPE_LABELS[childDoc.type] || childDoc.type))
  }

  return actions.filter(action => action.documentId && action.signingToken)
}

export function buildDocumentEmailInput(doc: Document, attachments: EmailAttachment[], source?: DocumentEmailUrlSource): DocumentEmailInput {
  const normalizedDoc = normalizeDocument(doc)
  const docLabel = DOCUMENT_TYPE_LABELS[normalizedDoc.type] || normalizedDoc.type
  const isAgreement = normalizedDoc.type === 'agreement'
  const actionUrl = buildDocumentActionUrl(normalizedDoc.id, normalizedDoc.type, source)
  const documentActions = attachments
    .filter(attachment => attachment.documentId && attachment.signingToken)
    .map(attachment => ({
      label: attachment.docLabel || attachment.docType || docLabel,
      filename: attachment.filename,
      url: buildDocumentActionUrl(attachment.documentId!, attachment.docType, source),
      isAgreement: attachment.docType === 'agreement',
    }))
  const subject = isAgreement
    ? `Signature Required: ${docLabel} - NetBounce Placement LLC`
    : `${docLabel} - NetBounce Placement LLC`
  const textBody = isAgreement
    ? [
        `Hello ${normalizedDoc.client_name},`,
        '',
        `Please use the secure button in this email to review the ${docLabel} document(s) and complete the in-platform signing request:`,
        actionUrl,
        '',
        'Thank you,',
        'NetBounce Placement LLC',
      ].join('\r\n')
    : [
        `Hello ${normalizedDoc.client_name},`,
        '',
        `Please use the secure button in this email to view the ${docLabel} document(s).`,
        actionUrl,
        '',
        'Thank you,',
        'NetBounce Placement LLC',
      ].filter(Boolean).join('\r\n')
  const htmlBody = buildDocumentBundleEmailHtml(normalizedDoc.client_name, docLabel, documentActions)

  return {
    to: normalizedDoc.client_email,
    senderDisplayName: getSenderDisplayName(normalizedDoc.type),
    subject,
    text: textBody,
    html: htmlBody,
    attachments: [],
  }
}

function buildDocumentActionUrl(documentId: string, type?: Document['type'], source?: DocumentEmailUrlSource) {
  return type === 'agreement' ? buildDocumentViewUrl(documentId, source) : buildDocumentPdfUrl(documentId, source)
}

export function buildDocumentEmailDraft(doc: Document, attachments: EmailAttachment[]) {
  return createEml(buildDocumentEmailInput(doc, attachments))
}

export function parseBundleDocuments(value: unknown): BundleDocument[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isBundleDocument)
  } catch {
    return []
  }
}

function storedToEmailAttachment(stored: StoredAttachment): EmailAttachment {
  return {
    filename: safeFilename(stored.name || 'attachment.pdf'),
    contentType: stored.type || 'application/octet-stream',
    content: dataUrlToBuffer(stored.dataUrl),
  }
}

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/)
  if (!match) return Buffer.from(dataUrl, 'base64')
  return Buffer.from(match[3], match[2] ? 'base64' : 'utf8')
}

function createEml({
  to,
  subject,
  text,
  html,
  attachments,
}: {
  to: string
  subject: string
  text: string
  html?: string
  attachments: EmailAttachment[]
}) {
  const boundary = `----=_NBG_${Date.now().toString(36)}`
  const altBoundary = `----=_NBG_ALT_${Date.now().toString(36)}`
  const lines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
  ]

  if (html) {
    lines.push(
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      '',
      `--${altBoundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      text,
      `--${altBoundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      html,
      `--${altBoundary}--`,
    )
  } else {
    lines.push(
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      text,
    )
  }

  for (const attachment of attachments) {
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.contentType}; name="${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${attachment.filename}"`,
      '',
      attachment.content.toString('base64').replace(/.{1,76}/g, '$&\r\n').trim(),
    )
  }

  lines.push(`--${boundary}--`, '')
  return lines.join('\r\n')
}

function dedupeAttachments(attachments: EmailAttachment[]) {
  const seen = new Set<string>()
  return attachments.filter(attachment => {
    const key = `${attachment.filename}:${attachment.content.length}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function isStoredAttachment(value: unknown): value is StoredAttachment {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<StoredAttachment>
  return Boolean(item.id && item.name && item.dataUrl)
}

function isBundleDocument(value: unknown): value is BundleDocument {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<BundleDocument>
  return Boolean(item.id && item.type && item.fields && typeof item.fields === 'object')
}

function getSenderDisplayName(type: Document['type']) {
  if (type === 'agreement' || type === 'review-agreement' || type === 'SALES_LEGAL') return 'NetBounce Legal'
  if (type === 'pre-invoice' || type === 'slot-invoice-receipt' || type === 'final-invoice-receipt' || type === 'ACCOUNTS') return 'NetBounce Operations'
  return 'NetBounce HR'
}

function safeFilename(value: string) {
  return value.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '_')
}

function withDocumentMeta(attachment: EmailAttachment, doc: Document, docLabel: string): EmailAttachment {
  return {
    ...attachment,
    documentId: doc.id,
    signingToken: doc.signing_token,
    docType: doc.type,
    docLabel,
  }
}

function buildDocumentBundleEmailHtml(clientName: string, docLabel: string, actions: { label: string; filename: string; url: string; isAgreement: boolean }[]) {
  const rows = actions.map(action => `
          <tr>
            <td style="padding:16px 0;border-top:1px solid #e5e7eb">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:16px">
                    <p style="margin:0 0 4px;color:#0D1F14;font-size:14px;font-weight:700">${escapeHtml(action.label)}</p>
                  </td>
                  <td align="right" style="vertical-align:middle;width:190px">
                    <a href="${action.url}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 18px;border-radius:8px;white-space:nowrap">${action.isAgreement ? 'Review &amp; Sign Document' : `View ${escapeHtml(action.label)}`}</a>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding-top:8px;color:#6b7280;font-size:11px;line-height:1.4;word-break:break-all">
                    Link: <a href="${action.url}" style="color:#2563eb;text-decoration:underline">${action.url}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`).join('')

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 16px;background:#f8fafc">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
        <tr><td style="background:#0D1F14;padding:22px 28px;color:#fff">
          <p style="margin:0;color:#A8D5B8;font-size:11px;font-weight:700">NetBounce DocSign</p>
          <h1 style="margin:4px 0 0;font-size:18px">Review and sign required</h1>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 14px;color:#0D1F14;font-size:14px">Hello ${escapeHtml(clientName)},</p>
          <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6">Please use the button beside each document below. Each button records activity only for that specific document before opening the correct view or signing page.</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${rows || `<tr><td style="padding:16px 0;border-top:1px solid #e5e7eb"><a href="#" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px">View ${escapeHtml(docLabel)}</a></td></tr>`}
          </table>
          <p style="margin:20px 0 0;color:#b91c1c;font-size:11.5px;line-height:1.5;font-weight:700;background:#fef2f2;border:1px solid #fee2e2;padding:10px;border-radius:8px">
            ⚠️ Having trouble clicking the button? If this email landed in your Spam or Junk folder, please mark it as "Not Spam" or move it to your Inbox to make the button active. Alternatively, you can copy and paste the direct link listed under the document.
          </p>
          <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">Timestamps, IP address, and device details are recorded in the background for the final report.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
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
