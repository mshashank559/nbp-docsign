import { PDFDocument } from 'pdf-lib'
import { buildFilledAgreementPdf } from './agreement-pdf'
import { buildGeneratedDocumentPdf } from './generated-document-pdf'
import { normalizeDocument } from './document-normalize'
import { Document } from './types'

export async function buildSignedDocumentPdf(input: Document) {
  const doc = normalizeDocument(input)
  const baseBytes = doc.type === 'agreement'
    ? await buildFilledAgreementPdf(doc.fields || {})
    : await buildGeneratedDocumentPdf(doc)

  if (!doc.client_signature) return Buffer.from(baseBytes)

  if (doc.type === 'final-onboarding') {
    const pdf = await PDFDocument.load(baseBytes)
    const pages = pdf.getPages()
    if (pages[2] && doc.client_signature) {
      const signature = await embedSignature(pdf, doc.client_signature)
      if (signature) {
        // "Customer Signature" label starts at x:429, spans ~99pt, center at ~x:478
        // Center a 120pt-wide image → start at x: 418
        pages[2].drawImage(signature, {
          x: 418,
          y: 370,
          width: 120,
          height: 32,
        })
      }
    }
    return Buffer.from(await pdf.save())
  }

  const pdf = await PDFDocument.load(baseBytes)
  const pages = pdf.getPages()
  const page = pages[pages.length - 1]
  const signature = await embedSignature(pdf, doc.client_signature)
  if (!signature) return Buffer.from(await pdf.save())

  const { width, height } = page.getSize()
  const pos = parseSignaturePosition(doc.fields?.signaturePosition)
  const imageWidth = 150
  const imageHeight = 54
  const x = (width * pos.x) / 100
  const y = height - (height * pos.y) / 100 - imageHeight

  const drawX = doc.type === 'agreement' ? 390 : Math.min(width - imageWidth - 24, Math.max(24, x))
  const drawY = doc.type === 'agreement' ? 420 : Math.min(height - imageHeight - 24, Math.max(24, y))

  page.drawImage(signature, {
    x: drawX,
    y: drawY,
    width: imageWidth,
    height: imageHeight,
  })

  return Buffer.from(await pdf.save())
}

async function embedSignature(pdf: PDFDocument, dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!match) return null

  const bytes = Buffer.from(match[2], 'base64')
  return match[1].toLowerCase() === 'png'
    ? pdf.embedPng(bytes)
    : pdf.embedJpg(bytes)
}

function parseSignaturePosition(value: unknown) {
  if (!value) return { x: 68, y: 72 }
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return {
      x: Math.min(86, Math.max(4, Number(parsed?.x) || 68)),
      y: Math.min(88, Math.max(8, Number(parsed?.y) || 72)),
    }
  } catch {
    return { x: 68, y: 72 }
  }
}
