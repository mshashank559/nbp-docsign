import { DOCUMENT_TYPE_LABELS } from './document-catalog'
import { normalizeDocument, getLegacyDatabaseType } from './document-normalize'
import { Document, DocType } from './types'
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
  } else {
    const { buildSignedDocumentPdf } = await import('./signed-pdf')
    const pdfBytes = await buildSignedDocumentPdf(normalizedDoc)
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
    const { buildSignedDocumentPdf } = await import('./signed-pdf')
    const pdfBytes = await buildSignedDocumentPdf(childDoc)
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

function getEmailDocumentName(type: Document['type']): string {
  switch (type) {
    case 'pre-invoice':
      return 'Pre-Invoice Agreement'
    case 'agreement':
      return 'Agreement'
    case 'review-agreement':
      return 'Review Agreement'
    case 'slot-invoice-receipt':
      return 'Slot-Invoice Receipt'
    case 'final-invoice-receipt':
      return 'Final Invoice Receipt'
    case 'appointment':
      return 'Letter of Appointment'
    case 'offer':
      return 'NB Offer Letter'
    case 'confirmation':
      return 'Confirmation Letter'
    case 'final-onboarding':
      return 'Final Onboarding Document'
    default:
      return 'Document'
  }
}

export function buildDocumentEmailInput(doc: Document, attachments: EmailAttachment[], source?: DocumentEmailUrlSource): DocumentEmailInput {
  const normalizedDoc = normalizeDocument(doc)
  const docLabel = DOCUMENT_TYPE_LABELS[normalizedDoc.type] || normalizedDoc.type
  const isAgreement = normalizedDoc.type === 'agreement' || normalizedDoc.type === 'final-onboarding'
  const isInvoice = ['pre-invoice', 'slot-invoice-receipt'].includes(normalizedDoc.type)
  const actionUrl = buildDocumentActionUrl(normalizedDoc.id, normalizedDoc.type, source)
  const documentActions = attachments
    .filter(attachment => attachment.documentId && attachment.signingToken)
    .map(attachment => ({
      label: attachment.docLabel || attachment.docType || docLabel,
      filename: attachment.filename,
      url: buildDocumentActionUrl(attachment.documentId!, attachment.docType, source),
      isAgreement: attachment.docType === 'agreement' || attachment.docType === 'final-onboarding',
      docType: attachment.docType,
    }))

  const isBundle = documentActions.length > 1
  const docNamesStr = isBundle 
    ? documentActions.map(action => action.label).join(' & ')
    : docLabel
  const subject = `${normalizedDoc.client_name || 'Candidate'} - ${docNamesStr} - NetBounce Placement LLC`
  
  const hasInvoice = documentActions.some(action => 
    action.docType && ['pre-invoice', 'slot-invoice-receipt'].includes(action.docType)
  ) || ['pre-invoice', 'slot-invoice-receipt'].includes(normalizedDoc.type)

  const docNamesForText = isBundle
    ? documentActions.map(action => action.label).join(' and ')
    : docLabel
  const pronoun = isBundle ? 'them' : 'it'

  let textBody = ''
  if (isBundle) {
    const docListText = documentActions.map(action => `- ${action.label}: ${action.url}`).join('\r\n')
    const invoiceInstruction = hasInvoice ? '\r\nKindly make the payment and share the payment screenshot with us for confirmation after the transaction is completed.\r\n' : ''
    textBody = [
      `Hello ${normalizedDoc.client_name || 'Candidate'},`,
      '',
      `Here is your ${docNamesForText}. Kindly review ${pronoun}.`,
      hasInvoice ? 'Here is the payment link -' : '',
      docListText,
      invoiceInstruction,
      'Thank you,',
      'NetBounce Placement LLC',
    ].filter(Boolean).join('\r\n')
  } else if (isInvoice) {
    textBody = [
      `Hello ${normalizedDoc.client_name || 'Candidate'},`,
      '',
      `Here is your ${docLabel}. Kindly review it.`,
      '',
      'Here is the payment link -',
      `Link: ${actionUrl}`,
      '',
      'Kindly make the payment and share the payment screenshot with us for confirmation after the transaction is completed.',
      '',
      'Thank you,',
      'NetBounce Placement LLC',
    ].join('\r\n')
  } else {
    textBody = [
      `Hello ${normalizedDoc.client_name || 'Candidate'},`,
      '',
      `Here is your ${docLabel}. Kindly review it.`,
      '',
      `Link: ${actionUrl}`,
      '',
      'Thank you,',
      'NetBounce Placement LLC',
    ].join('\r\n')
  }

  const htmlBody = buildDocumentBundleEmailHtml(normalizedDoc.client_name, docLabel, documentActions, normalizedDoc.type)

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
  return type === 'agreement' || type === 'final-onboarding' ? buildDocumentViewUrl(documentId, source) : buildDocumentPdfUrl(documentId, source)
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

function buildDocumentBundleEmailHtml(
  clientName: string,
  docLabel: string,
  actions: { label: string; filename: string; url: string; isAgreement: boolean; docType?: string }[],
  docType?: string
) {
  const isInvoice = docType && ['pre-invoice', 'slot-invoice-receipt'].includes(docType)
  const isBundle = actions.length > 1
  const docNames = actions.length > 0
    ? actions.map(action => action.label).join(' and ')
    : docLabel
  const pronoun = actions.length > 1 ? 'them' : 'it'

  if (isInvoice && !isBundle) {
    const action = actions[0]
    const actionUrl = action?.url || '#'
    const invoiceLabel = docType === 'pre-invoice'
      ? 'Pre-invoice'
      : 'Slot-invoice receipt'
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 16px;background:#f8fafc">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
        <tr><td style="background:#0b1a30;padding:22px 28px;color:#fff">
          <p style="margin:0;color:#60a5fa;font-size:11px;font-weight:700">NetBounce DocSign</p>
          <h1 style="margin:4px 0 0;font-size:18px">Review document</h1>
        </td></tr>
        <tr><td style="padding:28px;color:#333333;line-height:1.6;">
          <p style="margin:0 0 14px;color:#0b1a30;font-size:14px">Hello ${escapeHtml(clientName)},</p>
          <p style="margin:0 0 14px;color:#334155;font-size:14px">Here is your ${escapeHtml(invoiceLabel)}. Kindly review it.</p>
          <p style="margin:0 0 14px;color:#334155;font-size:14px">Here is the payment link -</p>
          
          <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f9f9f9; border: 1px solid #e5e7eb; border-radius: 6px; border-collapse: collapse;">
            <tr>
              <td style="padding: 15px; font-weight: bold; font-size: 15px; color: #111827; vertical-align: middle; text-align: left;">
                ${invoiceLabel}
              </td>
              <td style="padding: 15px; vertical-align: middle; text-align: right; width: 1%; white-space: nowrap;">
                <a href="${actionUrl}" style="background-color: #111827; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: bold; display: inline-block; white-space: nowrap;">Review Document</a>
              </td>
            </tr>
          </table>

          <p style="margin: 0 0 14px; color:#334155; font-size:14px;">Kindly make the payment and share the payment screenshot with us for confirmation after the transaction is completed.</p>
          
          <p style="margin: 24px 0 0; color:#334155; font-size:14px;">Thank you,</p>
          <p style="margin: 4px 0 0; color:#334155; font-size:14px; font-weight: bold;">NetBounce Placement LLC</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
  }

  const hasInvoice = actions.some(action => 
    action.docType && ['pre-invoice', 'slot-invoice-receipt'].includes(action.docType)
  ) || (docType && ['pre-invoice', 'slot-invoice-receipt'].includes(docType))

  const rows = actions.map(action => `
          <tr>
            <td style="padding:16px 0;border-top:1px solid #e5e7eb">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:16px">
                    <p style="margin:0;color:#0b1a30;font-size:14px;font-weight:700">${escapeHtml(action.label)}</p>
                  </td>
                  <td align="right" style="vertical-align:middle;width:190px">
                    <a href="${action.url}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:11px 18px;border-radius:8px;white-space:nowrap">${action.isAgreement ? 'Review &amp; Sign Document' : `View ${escapeHtml(action.label)}`}</a>
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
        <tr><td style="background:#0b1a30;padding:22px 28px;color:#fff">
          <p style="margin:0;color:#60a5fa;font-size:11px;font-weight:700">NetBounce DocSign</p>
          <h1 style="margin:4px 0 0;font-size:18px">Review and sign required</h1>
        </td></tr>
        <tr><td style="padding:28px">
          <p style="margin:0 0 14px;color:#0b1a30;font-size:14px">Hello ${escapeHtml(clientName)},</p>
          <p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.6">Here is your ${escapeHtml(docNames)}. Kindly review ${pronoun}.</p>
          ${hasInvoice ? `<p style="margin:0 0 14px;color:#334155;font-size:14px">Here is the payment link -</p>` : ''}
          <table width="100%" cellpadding="0" cellspacing="0">
            ${rows || `<tr><td style="padding:16px 0;border-top:1px solid #e5e7eb"><a href="#" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px">View ${escapeHtml(docLabel)}</a></td></tr>`}
          </table>
          ${hasInvoice ? `
          <p style="margin:20px 0 0;color:#1e293b;font-size:13px;line-height:1.5;font-weight:700;background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px">
            ℹ️ Kindly make the payment and share the payment screenshot with us for confirmation after the transaction is completed.
          </p>
          ` : ''}
          <p style="margin: 24px 0 0; color:#334155; font-size:14px;">Thank you,</p>
          <p style="margin: 4px 0 0; color:#334155; font-size:14px; font-weight: bold;">NetBounce Placement LLC</p>
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

export async function prepareTrackedBundleDocuments(supabase: any, doc: Document) {
  const bundleDocs = parseBundleDocuments(doc.fields?.__bundleDocuments)
  if (!bundleDocs.length) {
    return { doc, childDocs: [] as Document[], documentIds: [doc.id] }
  }

  const childDocs: Document[] = []
  const nextBundleDocs = []

  for (const bundleDoc of bundleDocs) {
    const childFields = sanitizeBundleFields(bundleDoc.fields || {})
    let childDoc: Document | null = null

    if (bundleDoc.documentId) {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('id', bundleDoc.documentId)
        .single()
      if (data) childDoc = normalizeDocument(data as Document)
    }

    if (!childDoc) {
      const payload = {
        type: bundleDoc.type,
        status: 'draft',
        client_name: doc.client_name,
        client_email: doc.client_email,
        client_company: doc.client_company,
        fields: childFields,
      }
      const inserted = await insertBundleDocument(supabase, payload, bundleDoc.type)
      childDoc = normalizeDocument(inserted as Document)
    }

    childDocs.push(childDoc)
    nextBundleDocs.push({
      id: bundleDoc.id,
      type: childDoc.type,
      fields: childDoc.fields || childFields,
      documentId: childDoc.id,
      signingToken: childDoc.signing_token,
    })
  }

  const updatedFields = {
    ...(doc.fields || {}),
    __bundleDocuments: JSON.stringify(nextBundleDocs),
  }

  await supabase
    .from('documents')
    .update({ fields: updatedFields })
    .eq('id', doc.id)

  return {
    doc: { ...doc, fields: updatedFields },
    childDocs,
    documentIds: [doc.id, ...childDocs.map(child => child.id)],
  }
}

async function insertBundleDocument(supabase: any, payload: Record<string, unknown>, type: DocType) {
  const result = await supabase.from('documents').insert(payload).select().single()
  if (!result.error) return result.data
  if (!String(result.error.message || '').includes('documents_type_check')) throw result.error

  const legacyResult = await supabase
    .from('documents')
    .insert({
      ...payload,
      type: getLegacyDatabaseType(type),
      fields: { ...((payload.fields as Record<string, string>) || {}), __docType: type },
    })
    .select()
    .single()

  if (legacyResult.error) throw legacyResult.error
  return legacyResult.data
}

function sanitizeBundleFields(fields: Record<string, string>) {
  const { __bundleDocuments, ...rest } = fields || {}
  return rest
}
