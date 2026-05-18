import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

type AgreementFields = Record<string, string>

export async function buildFilledAgreementPdf(fields: AgreementFields) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  let page = pdf.addPage([612, 792])
  const marginX = 54
  const pageBottom = 58
  let y = 736

  const ensure = (height = 18) => {
    if (y - height >= pageBottom) return
    page = pdf.addPage([612, 792])
    y = 736
  }

  const text = (value: string, size = 10, isBold = false, gap = size + 8) => {
    for (const line of wrapText(value, isBold ? bold : regular, size, 504)) {
      ensure(size + 4)
      page.drawText(line, { x: marginX, y, size, font: isBold ? bold : regular, color: rgb(0, 0, 0) })
      y -= gap
    }
  }

  const field = (label: string, ...keys: string[]) => {
    const value = keys.map(key => String(fields[key] || '').trim()).find(Boolean) || ''
    text(`${label}: ${value || '-'}`, 10, false, 16)
  }

  text('Job Acquire Program by Netbounce Placement LLC - Terms of Enrollment', 14, true, 20)
  y -= 8
  text('Made as of the Effective Date', 10, true, 18)
  text('Between Netbounce Placement LLC and the candidate identified below.', 10, false, 18)
  y -= 8
  field('Name', 'agreementName')
  field('Address', 'agreementAddress')
  field('Contact', 'agreementContact')
  field('Enrollment Plan type', 'enrollmentPlanType')
  field('Final payment conditions', 'finalPaymentConditions')
  field('Current agreed payment condition', 'currentAgreedPaymentConditions', 'currentAgreedPaymentCondition')
  y -= 8
  text('This generated copy is provided for review and in-platform signing. Please use the secure document link in the email to complete the signing request.', 10, false, 17)

  const signature = String(fields.priAuthoritySignatureImage || fields.preAuthoritySign || '').trim()
  if (signature && !signature.startsWith('data:image')) {
    y -= 8
    text(`Authority Signature: ${signature}`, 10, false, 16)
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
