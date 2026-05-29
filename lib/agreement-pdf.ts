import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { readFile } from 'fs/promises'
import path from 'path'

type AgreementFields = Record<string, string>

async function embedSignature(pdf: PDFDocument, dataUrl: string) {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!match) return null

  const bytes = Buffer.from(match[2], 'base64')
  return match[1].toLowerCase() === 'png'
    ? pdf.embedPng(bytes)
    : pdf.embedJpg(bytes)
}

export async function buildFilledAgreementPdf(fields: AgreementFields) {
  const templateBytes = await readFile(path.join(process.cwd(), 'public', 'templates', 'agreement-template.pdf'))
  const pdf = await PDFDocument.load(templateBytes)
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const pages = pdf.getPages()

  const drawOnPage = (pageIndex: number, text: string, x: number, y: number, isBold = false, size = 10.5) => {
    if (!text || pageIndex >= pages.length) return
    pages[pageIndex].drawText(text, {
      x,
      y,
      size,
      font: isBold ? bold : regular,
      color: rgb(0, 0, 0)
    })
  }

  const name = String(fields.agreementName || '').trim()
  const address = String(fields.agreementAddress || '').trim()
  const contact = String(fields.agreementContact || '').trim()
  const effectiveDate = String(fields.effectiveDate || '').trim()
  const plan = String(fields.enrollmentPlanType || '').trim()
  const finalPay = String(fields.finalPaymentConditions || '').trim()
  const currentPay = String(fields.currentAgreedPaymentConditions || fields.currentAgreedPaymentCondition || '').trim()
  const authoritySignature = String(fields.priAuthoritySignatureImage || '').trim()

  // 0. Effective Date on Page 1 — covers the "(the "Effective Date")" placeholder text
  if (effectiveDate) {
    // White rectangle to erase the placeholder text
    pages[0].drawRectangle({
      x: 92,
      y: 658,
      width: 220,
      height: 14,
      color: rgb(1, 1, 1),
    })
    // Draw the actual date value
    pages[0].drawText(effectiveDate, {
      x: 92,
      y: 661,
      size: 10.5,
      font: regular,
      color: rgb(0, 0, 0),
    })
  }

  // 1. Candidate Details on Page 1 (index 0)
  if (name) {
    drawOnPage(0, name, 150, 500, true)
  }
  if (address) {
    const addressLines = wrapText(address, regular, 10.5, 350)
    let addressY = 450
    for (const line of addressLines) {
      drawOnPage(0, line, 150, addressY, false, 10.5)
      addressY -= 14
    }
  }
  if (contact) {
    drawOnPage(0, contact, 150, 400, false)
  }

  // 2. Section 5 'PAYMENT TERM'
  // 5.1. Enrollment Plan type (Page 5, index 4) below label (at Y=168)
  if (plan) {
    const planLines = wrapText(plan, regular, 10.5, 450)
    let planY = 168
    for (const line of planLines) {
      drawOnPage(4, line, 100, planY, false, 10.5)
      planY -= 14
    }
  }

  // 5.2. Final payment conditions (Page 6, index 5) below label (at Y=730)
  if (finalPay) {
    const finalPayLines = wrapText(finalPay, regular, 10.5, 450)
    let finalPayY = 710
    for (const line of finalPayLines) {
      drawOnPage(5, line, 100, finalPayY, false, 10.5)
      finalPayY -= 14
    }
  }

  // 5.3. Current agreed payment condition (Page 6, index 5) below label (at Y=630)
  if (currentPay) {
    const currentPayLines = wrapText(currentPay, regular, 10.5, 450)
    let currentPayY = 610
    for (const line of currentPayLines) {
      drawOnPage(5, line, 100, currentPayY, false, 10.5)
      currentPayY -= 14
    }
  }

  // 3. Authority signature on Page 9 (index 8) if present
  if (authoritySignature) {
    try {
      const signatureImg = await embedSignature(pdf, authoritySignature)
      if (signatureImg) {
        // Align with the 'Authority Signature' label at X=55.9 — same offset as candidate (label=402.7, image=390)
        pages[8].drawImage(signatureImg, {
          x: 55,
          y: 420,
          width: 150,
          height: 54,
        })
      }
    } catch (err) {
      console.error('[buildFilledAgreementPdf] Failed to embed authority signature image', err)
    }
  }

  return pdf.save()
}

function wrapText(value: string, font: { widthOfTextAtSize(text: string, size: number): number }, size: number, width: number) {
  const lines: string[] = []
  for (const paragraph of String(value || '').split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    let line = ''
    for (const word of words) {
      const next = `${line} ${word}`.trim()
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    if (line) lines.push(line)
  }
  return lines.length ? lines : ['']
}
