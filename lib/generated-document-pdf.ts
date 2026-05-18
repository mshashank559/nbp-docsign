import { readFile } from 'fs/promises'
import path from 'path'
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { Document } from './types'
import { normalizeDocument } from './document-normalize'

type DrawTextOptions = {
  x: number
  y: number
  size?: number
  width?: number
  bold?: boolean
  color?: ReturnType<typeof rgb>
}

type TextPart = {
  text: string
  bold?: boolean
}

export async function buildGeneratedDocumentPdf(doc: Document) {
  const normalizedDoc = normalizeDocument(doc)
  if (normalizedDoc.type === 'review-agreement') {
    return readFile(path.join(process.cwd(), 'public', 'templates', 'review-agreement.pdf'))
  }

  if (isInvoiceType(normalizedDoc.type)) {
    return buildInvoicePdf(normalizedDoc)
  }

  return buildHrLetterPdf(normalizedDoc)
}

async function buildInvoicePdf(doc: Document) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([794, 1123])
  const values = getInvoiceValues(doc)
  const black = rgb(0.02, 0.02, 0.02)
  const muted = rgb(0.32, 0.35, 0.42)
  const purple = rgb(0.77, 0.76, 0.96)
  const white = rgb(1, 1, 1)
  const emblemBlue = rgb(0.071, 0.188, 0.906)
  const pageWidth = 794
  const pageHeight = 1123
  const marginX = 54
  const contentWidth = pageWidth - marginX * 2

  const text = (value: string, x: number, y: number, size = 10, font = regular, color = black, maxWidth?: number) => {
    if (!String(value || '').trim()) return
    page.drawText(String(value), { x, y, size, font, color, maxWidth, lineHeight: size + 3 })
  }
  const right = (value: string, x: number, y: number, width: number, size = 10, font = regular, color = black) => {
    if (!String(value || '').trim()) return
    const textWidth = font.widthOfTextAtSize(value, size)
    text(value, x + Math.max(0, width - textWidth), y, size, font, color)
  }
  const center = (value: string, x: number, y: number, width: number, size = 10, font = regular, color = black) => {
    if (!String(value || '').trim()) return
    const textWidth = font.widthOfTextAtSize(value, size)
    text(value, x + Math.max(0, (width - textWidth) / 2), y, size, font, color)
  }
  const wrapped = (value: string, x: number, y: number, width: number, size = 10, font = regular, color = black, maxLines = 4, lineHeight = size + 4) => {
    const lines = wrapByWidth(String(value || ''), width, font, size).slice(0, maxLines)
    lines.forEach((line, index) => text(line, x, y - index * lineHeight, size, font, color))
    return lines.length * lineHeight
  }
  const pill = (label: string, x: number, y: number, width: number) => {
    page.drawRectangle({ x, y, width, height: 21, color: purple })
    center(label, x, y + 7, width, 8, regular, black)
  }

  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: white })

  const headerHeight = 150
  const headerY = pageHeight - headerHeight
  drawHorizontalGradient(page, 0, headerY, pageWidth, headerHeight, [
    { at: 0, color: [0xf8, 0xf8, 0xfc] },
    { at: 0.28, color: [0xb8, 0xbc, 0xf7] },
    { at: 0.62, color: [0x5b, 0x67, 0xf0] },
    { at: 1, color: [0x1e, 0x3a, 0xfa] },
  ])

  const emblemSize = 130
  const emblemRadius = emblemSize / 2
  const emblemCenterX = 40 + emblemRadius
  const emblemCenterY = pageHeight - 40 - emblemRadius
  page.drawCircle({ x: emblemCenterX + 4, y: emblemCenterY - 4, size: emblemRadius, color: rgb(0, 0, 0), opacity: 0.14 })
  page.drawCircle({ x: emblemCenterX, y: emblemCenterY, size: emblemRadius, color: emblemBlue })
  center('NB', emblemCenterX - 46, emblemCenterY + 17, 92, 39, bold, white)
  center('NETBOUNCE', emblemCenterX - 58, emblemCenterY - 18, 116, 18, bold, white)
  center('PLACEMENT LLC', emblemCenterX - 43, emblemCenterY - 38, 86, 7.4, regular, white)

  drawTrackedText(page, 'INVOICE', pageWidth - 282, headerY + headerHeight / 2 - 18, 34, bold, white, 8.5)

  const infoTop = 858
  const colW = contentWidth / 3
  pill('Invoice to:', marginX, infoTop + 36, 70)
  text(values.candidateName || doc.client_name || 'Candidate Name', marginX, infoTop + 12, 18, bold, black, colW - 16)
  wrapped(values.candidateEmail || doc.client_email || '', marginX, infoTop - 8, colW - 18, 8.5, regular, black, 1, 11)
  wrapped(values.candidatePhone, marginX, infoTop - 22, colW - 18, 8.5, regular, black, 1, 11)

  pill('Date:', marginX + colW + 56, infoTop + 36, 70)
  text(formatLongDate(values.date), marginX + colW + 56, infoTop + 12, 16, bold, black)
  wrapped('Netbounce Placement LLC', marginX + colW + 56, infoTop - 34, colW - 20, 8.5, regular, black, 1, 11)
  wrapped('billingsupport@netbounceplacement.com', marginX + colW + 56, infoTop - 47, colW - 20, 8.5, regular, rgb(0, 0.12, 0.8), 1, 11)
  wrapped('2404, 1007 N Orange St. 4th Floor,', marginX + colW + 56, infoTop - 60, colW - 20, 8.5, regular, black, 1, 11)
  wrapped('Wilmington, DE, New Castle, US, 19801', marginX + colW + 56, infoTop - 73, colW - 20, 8.5, regular, black, 1, 11)

  pill('Invoice number:', marginX + colW * 2 + colW - 110, infoTop + 36, 110)
  right(values.invoiceNo, marginX + colW * 2, infoTop + 12, colW, 16, regular, black)

  const tableTop = 640
  const itemW = 270
  const deliverableW = 306
  const costW = 110
  page.drawRectangle({ x: marginX, y: tableTop, width: contentWidth, height: 49, color: purple })
  text('Item:', marginX + 16, tableTop + 28, 8.5, regular, black)
  center('Deliverables:', marginX + itemW, tableTop + 28, deliverableW, 8.5, regular, black)
  center('Cost:(US $)', marginX + itemW + deliverableW, tableTop + 28, costW, 8.5, regular, black)

  const rowY = tableTop - 34
  wrapped(values.packName || 'Plan', marginX + 16, rowY, itemW - 28, 10, regular, black, 3)
  wrapped(values.deliverables || 'As per the services mentioned in pricing document', marginX + itemW + 16, rowY, deliverableW - 32, 9.5, regular, black, 4)
  right(values.packAmount, marginX + itemW + deliverableW, rowY, costW - 16, 10, regular, black)

  const summaryTop = 442
  const notesX = marginX + 16
  const notesW = 300
  wrapped(values.upfrontDetails, notesX, summaryTop, notesW, 9, bold, black, 2, 12)
  wrapped(values.remainingDetails, notesX, summaryTop - 13, notesW, 9, bold, black, 2, 12)
  wrapped(values.termsComment || '', notesX, summaryTop - 38, notesW, 8.6, regular, black, 4, 11)

  const summaryX = pageWidth - marginX - 260
  const advanceLabel = doc.type === 'pre-invoice' ? 'Advance' : 'Advance Received'
  const advanceAmount = values.advancePaid || values.advanceReceived || values.totalPaid || ''
  const pendingAmount = values.finalPending || values.pendingBalance || values.pendingAmount || values.packAmount
  text(advanceLabel, summaryX, summaryTop - 10, 8.5, regular, black)
  center(advanceAmount, summaryX + 130, summaryTop - 10, 110, 8.5, regular, black)
  page.drawRectangle({ x: summaryX, y: summaryTop - 92, width: 260, height: 49, color: purple })
  text('Total Pending', summaryX + 14, summaryTop - 64, 8.5, bold, black)
  center(pendingAmount, summaryX + 130, summaryTop - 64, 110, 8.5, bold, black)
  if (doc.type !== 'pre-invoice' && values.dueDate && !isZeroInvoiceMoney(pendingAmount)) {
    center(`Due by: ${values.dueDate}`, summaryX + 12, summaryTop - 82, 236, 7.5, regular, muted)
  }

  const paymentY = 262
  text('Payment Details:', marginX, paymentY, 8.5, regular, black)
  text('Account Name: Netbounce Placement LLC', marginX, paymentY - 14, 8.5, regular, black)
  text('Bank Name: Choice Financial Group', marginX, paymentY - 28, 8.5, regular, black)
  text('Account Number: 202302824963', marginX, paymentY - 42, 8.5, regular, black)
  text('Routing Number: 091311229', marginX, paymentY - 56, 8.5, regular, black)

  const terms = [
    'This invoice is issued in accordance with the mutually agreed service agreement and chosen plan.',
    'The upfront amount is required to start the service.',
    'The amount mentioned at the time of offer letter must be paid when you receive the job offer or pre-background check confirmation.',
    'The percentage amount will be calculated on the basis of your gross annual salary package and will be due in 4 installments.',
  ]
  text('Terms & Conditions:', marginX, 162, 8.5, bold, black)
  terms.forEach((term, index) => wrapped(`* ${term}`, marginX, 146 - index * 27, contentWidth, 8.2, regular, black, 2, 10))

  return pdf.save()
}

function isInvoiceType(type: Document['type']) {
  return type === 'pre-invoice' || type === 'slot-invoice-receipt' || type === 'final-invoice-receipt'
}

function getInvoiceTemplateName(type: Document['type']) {
  if (type === 'slot-invoice-receipt') return 'slot-invoice-receipt.pdf'
  if (type === 'final-invoice-receipt') return 'final-invoice-receipt.pdf'
  return 'pre-invoice.pdf'
}

function getInvoiceValues(doc: Document) {
  const f = doc.fields || {}
  return {
    candidateName: field(f, 'candidate_name', 'candidateName') || doc.client_name || '',
    candidateEmail: field(f, 'candidate_email', 'candidateEmail') || doc.client_email || '',
    candidatePhone: field(f, 'candidate_phone', 'candidatePhone'),
    date: field(f, 'date', 'invoiceDate'),
    invoiceNo: field(f, 'invoice_no', 'invoiceNumber'),
    packName: field(f, 'pack_name', 'packName'),
    deliverables: field(f, 'deliverables', 'comments'),
    packAmount: formatInvoiceMoney(field(f, 'pack_amount', 'packAmount')),
    upfrontDetails: field(f, 'upfront_details'),
    remainingDetails: field(f, 'remaining_details'),
    termsComment: field(f, 'terms_comment'),
    advancePaid: formatInvoiceMoney(field(f, 'advance_amount')),
    pendingAmount: formatInvoiceMoney(field(f, 'pending_amount')),
    advanceReceived: formatInvoiceMoney(field(f, 'advance_received')),
    pendingBalance: formatInvoiceMoney(field(f, 'pending_balance')),
    dueDate: formatLongDate(field(f, 'dueDate', 'due_date')),
    totalPaid: formatInvoiceMoney(field(f, 'total_paid')),
    finalPending: formatInvoiceMoney(field(f, 'final_pending')),
  }
}

async function buildHrLetterPdf(doc: Document) {
  const templateName = getHrTemplateName(doc.type)
  if (!templateName) return buildStructuredHrLetterPdf(doc)

  try {
    const templateBytes = await readFile(path.join(process.cwd(), 'public', 'templates', templateName))
    const pdf = await PDFDocument.load(templateBytes)
    await drawHrTemplateFields(pdf, doc)
    return pdf.save()
  } catch {
    return buildStructuredHrLetterPdf(doc)
  }
}

async function buildStructuredHrLetterPdf(doc: Document) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const logoBytes = await readFile(path.join(process.cwd(), 'public', 'templates', 'hr-assets', 'image9.png')).catch(() => null)
  const logo = logoBytes ? await pdf.embedPng(logoBytes) : null
  const pageSize: [number, number] = doc.type === 'appointment' ? [612, 792] : [595.2, 841.92]
  const marginX = doc.type === 'appointment' ? 94 : 72
  const contentWidth = pageSize[0] - marginX * 2
  let page = pdf.addPage(pageSize)
  let y = pageSize[1] - (doc.type === 'appointment' ? 108 : 95)

  const drawHeader = () => {
    if (doc.type === 'appointment' && logo) {
      page.drawImage(logo, { x: 66, y: pageSize[1] - 68, width: 210, height: 42 })
    }
  }

  drawHeader()

  const pageBottomY = 80
  const pageBreakBuffer = doc.type === 'offer' ? 30 : doc.type === 'confirmation' ? 22 : 14
  const ensure = (height = 40, buffer = pageBreakBuffer) => {
    if (y > Math.max(pageBottomY, pageBottomY + height - buffer)) return
    page = pdf.addPage(pageSize)
    y = pageSize[1] - 80
    drawHeader()
  }

  const white = rgb(1, 1, 1)
  const black = rgb(0, 0, 0)
  const maskTextArea = (x: number, baselineY: number, width: number, size: number, extraHeight = 4) => {
    page.drawRectangle({
      x: x - 2,
      y: baselineY - 3,
      width: width + 4,
      height: size + extraHeight,
      color: white,
    })
  }

  const line = (text = '', options: { size?: number; bold?: boolean; x?: number; align?: 'center' | 'right'; gap?: number; width?: number } = {}) => {
    const value = String(text)
    const size = options.size ?? 10
    const font = options.bold ? bold : regular
    const x = options.x ?? marginX
    const width = options.width ?? contentWidth

    ensure(size + 8)

    if (value) {
      const textWidth = font.widthOfTextAtSize(value, size)
      const dx = options.align === 'center' ? Math.max(0, (width - textWidth) / 2) : options.align === 'right' ? Math.max(0, width - textWidth) : 0
      maskTextArea(x, y, width, size)
      page.drawText(value, { x: x + dx, y, size, font, color: black, maxWidth: width })
    }
    y -= options.gap ?? size + 8
  }

  const wrapped = (parts: TextPart[], options: { size?: number; gap?: number; indent?: number; firstIndent?: number } = {}) => {
    const size = options.size ?? 10
    const indent = options.indent ?? 0
    const firstIndent = options.firstIndent ?? indent
    const rows = wrapRichText(parts, contentWidth - firstIndent, regular, bold, size)

    rows.forEach((row, rowIndex) => {
      ensure(size + 6)
      let x = marginX + (rowIndex === 0 ? firstIndent : indent)
      maskTextArea(marginX, y, contentWidth, size)

      row.forEach(part => {
        const font = part.bold ? bold : regular
        page.drawText(part.text, { x, y, size, font, color: black })
        x += font.widthOfTextAtSize(part.text, size)
      })
      y -= size + 5
    })
    y -= options.gap ?? 8
  }

  const rule = () => {
    ensure(10)
    page.drawLine({ start: { x: marginX, y }, end: { x: marginX + contentWidth, y }, thickness: 0.8, color: rgb(0.65, 0.65, 0.65) })
    y -= 18
  }

  const bullet = (label: string, value: string) => {
    wrapped([{ text: '-', bold: true }, { text: `    ${label}: `, bold: true }, { text: value }], { firstIndent: 28, indent: 56, gap: 2 })
  }

  if (doc.type === 'appointment') {
    const v = getHrValues(doc)

    line('LETTER OF APPOINTMENT', { bold: true, align: 'center', gap: 58, size: 11 })
    line(v.employeeName, { bold: true, gap: 13 })
    line(v.workLocation, { bold: true, gap: 13 })
    line(v.employeeState, { bold: true, gap: 27 })
    wrapped([{ text: 'Date: ', bold: true }, { text: v.letterDate, bold: true }], { gap: 31 })
    wrapped([{ text: 'Dear ' }, { text: v.employeeName, bold: true }, { text: ',' }], { gap: 16 })
    wrapped([
      { text: 'We are pleased to inform you that you are appointed as ' },
      { text: v.designation, bold: true },
      { text: ' with ' },
      { text: 'Netbounce Placements LLP', bold: true },
      { text: ', effective ' },
      { text: v.doj, bold: true },
      { text: ', subject to the following terms and conditions:' },
    ], { gap: 14 })
    line('1. Designation & Department', { bold: true, gap: 10 })
    bullet('Designation', v.designation)
    bullet('Department', v.department)
    y -= 14
    line('2. Place of Posting', { bold: true, gap: 10 })
    wrapped([
      { text: 'Your initial place of posting will be ' },
      { text: v.location, bold: true },
      { text: '. The Company reserves the right to transfer you to any other location or assign duties as per business requirements.' },
    ], { gap: 8 })
    rule()
    line('3. Date of Joining', { bold: true, gap: 10 })
    wrapped([{ text: 'Your date of joining shall be ' }, { text: v.doj, bold: true }, { text: '.' }], { gap: 8 })
    rule()
    line('4. Compensation', { bold: true, gap: 10 })
    wrapped([
      { text: 'Your total monthly gross salary will be ' },
      { text: v.monthlyGross, bold: true },
      { text: ', subject to applicable statutory deductions as per law.' },
    ], { gap: 8 })
    return pdf.save()
  }

  if (doc.type === 'offer') {
    const v = getHrValues(doc)
    line(v.letterDate, { gap: 14 })
    line(`${v.employeeTitle} ${v.employeeName}`.trim(), { bold: true, gap: 4 })
    line(v.address1, { gap: 4 })
    line(v.address2, { gap: 4 })
    line(v.address3, { gap: 18 })
    line('Subject: Offer of Employment', { bold: true, gap: 18 })
    wrapped([{ text: 'Dear ' }, { text: `${v.employeeTitle} ${v.employeeName}`.trim(), bold: true }, { text: ',' }], { gap: 11 })
    wrapped([{ text: 'With reference to your application and subsequent interview with us, we are pleased to offer you employment with Netbounce Placements LLP on the following terms and conditions:' }], { gap: 14 })
    line('1. Position & Department', { bold: true, gap: 9 })
    bullet('Designation', v.designation)
    bullet('Department', v.department)
    y -= 8
    line('2. Date of Joining', { bold: true, gap: 9 })
    wrapped([{ text: 'You are required to join the organization on or before ' }, { text: v.doj, bold: true }, { text: '.' }], { gap: 10 })
    line('3. Place of Posting', { bold: true, gap: 9 })
    wrapped([{ text: 'Your initial place of posting will be ' }, { text: v.location, bold: true }, { text: '.' }], { gap: 10 })
    line('4. Compensation', { bold: true, gap: 7 })
    wrapped([
      { text: 'Your Cost to Company (CTC) will be ' },
      { text: v.yearlyCtc, bold: true },
      { text: ' per annum (' },
      { text: v.monthlyCtc, bold: true },
      { text: ').' },
    ], { gap: 7 })
    line('5. Probation', { bold: true, gap: 7 })
    wrapped([{ text: 'You will be on probation for a period of three (3) months from the date of joining.' }])
    return pdf.save()
  }

  const v = getHrValues(doc)
  wrapped([{ text: 'Date: ', bold: true }, { text: v.confirmationDate }], { gap: 18 })
  wrapped([{ text: 'Employee Name: ', bold: true }, { text: v.employeeName }], { gap: 6 })
  wrapped([{ text: 'Employee Code: ', bold: true }, { text: v.employeeCode }], { gap: 34 })
  line('Confirmation Letter', { bold: true, align: 'center', gap: 34, size: 12 })
  wrapped([{ text: 'Dear ' }, { text: v.employeeName, bold: true }, { text: ',' }], { gap: 14 })
  wrapped([
    { text: 'Congratulations! Consequent to the review of your performance during your probation period, we have the pleasure in informing you that your services are being confirmed as ' },
    { text: v.designation, bold: true },
    { text: ' with effect from ' },
    { text: v.confirmationEffectiveDate, bold: true },
    { text: '.' },
  ], { gap: 14 })
  wrapped([{ text: 'All the other terms and conditions as detailed in your appointment letter remain unchanged.' }], { gap: 14 })
  wrapped([{ text: 'As an organization, we look forward to your valuable contributions and long term association with Netbounce Placements LLP.' }], { gap: 14 })
  wrapped([{ text: 'We wish you all the very best for a rewarding career with Netbounce Placements LLP.' }], { gap: 24 })
  line('Your Sincerely,', { gap: 12 })
  line('For Netbounce Placements LLP', { bold: true, gap: 44 })
  line('Nisarg Patel', { bold: true, gap: 5 })
  line('Chief Executive Officer', { gap: 5 })
  return pdf.save()
}

async function buildFallbackHrLetterPdf(doc: Document) {
  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const logoBytes = await readFile(path.join(process.cwd(), 'public', 'templates', 'hr-assets', 'image9.png')).catch(() => null)
  const signatureBytes = await readFile(path.join(process.cwd(), 'public', 'templates', 'hr-assets', 'image11.jpeg')).catch(() => null)
  const logo = logoBytes ? await pdf.embedPng(logoBytes) : null
  const signature = signatureBytes ? await pdf.embedJpg(signatureBytes) : null
  const f = doc.fields || {}

  const pages = getHrLines(doc)
  const addPage = () => {
    const nextPage = pdf.addPage([595.56, 842.04])
    if (logo) nextPage.drawImage(logo, { x: 64, y: 778, width: 210, height: 42 })
    nextPage.drawLine({ start: { x: 64, y: 766 }, end: { x: 532, y: 766 }, thickness: 1, color: rgb(0.15, 0.15, 0.15) })
    return nextPage
  }

  let page = addPage()
  let y = 790

  const drawLine = (text: string, size = 10.5, isBold = false) => {
    if (y < 64) {
      page = addPage()
      y = 744
    }
    page.drawText(text, { x: 64, y, size, font: isBold ? bold : regular, maxWidth: 468, lineHeight: size + 4 })
    y -= size + 8
  }

  y = 752

  for (const block of pages) {
    if (!block) {
      y -= 10
      continue
    }
    if (block === '[SIGNATURE]' && signature) {
      if (y < 130) {
        page = addPage()
        y = 744
      }
      page.drawImage(signature, { x: 64, y: y - 58, width: 95, height: 58 })
      y -= 70
      continue
    }
    const isHeading = block === block.toUpperCase() || /^\d+\./.test(block) || block.endsWith('Letter')
    for (const line of wrap(block, 92)) drawLine(line, isHeading ? 11 : 10, isHeading)
  }

  return pdf.save()
}

function getHrTemplateName(type: Document['type']) {
  if (type === 'appointment') return 'letter-of-appointment.pdf'
  if (type === 'offer') return 'nb-offer-letter.pdf'
  if (type === 'confirmation') return 'confirmation-letter.pdf'
  return ''
}

async function drawHrTemplateFields(pdf: PDFDocument, doc: Document) {
  const regular = await pdf.embedFont(StandardFonts.TimesRoman)
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold)
  const pages = pdf.getPages()
  const f = doc.fields || {}
  const v = getHrValues(doc)
  const employeeName = v.employeeName || f.employeeName || f.candidateName || doc.client_name || ''
  const letterDate = v.letterDate || formatLongDate(f.letterDate)
  const doj = v.doj || formatLongDate(f.dateOfJoining)
  const black = rgb(0.05, 0.05, 0.05)
  const white = rgb(1, 1, 1)

  const textWidth = (value: string, font: PDFFont, size: number) => font.widthOfTextAtSize(value, size)
  const drawMask = (page: PDFPage, x: number, y: number, width: number, height: number) => {
    page.drawRectangle({ x, y, width, height: Math.max(height, 1), color: white })
  }
  const textMask = (page: PDFPage, x: number, y: number, width: number, size: number) => {
    drawMask(page, x - 2, y - 3, width + 4, size + 6)
  }
  const optionMask = (page: PDFPage, mask: [number, number, number, number] | undefined, x: number, y: number, width: number, size: number) => {
    if (mask) {
      const [mx, my, mw, mh] = mask
      drawMask(page, mx, my, mw, Math.max(mh, size + 4))
      return
    }
    textMask(page, x, y, width, size)
  }

  const fittedSize = (value: string, font: PDFFont, size: number, width: number, minSize = 8.2) => {
    const measured = textWidth(value, font, size)
    if (measured <= width) return size
    return Math.max(minSize, size * (width / measured))
  }

  const drawValue = (
    page: PDFPage,
    value: string,
    x: number,
    y: number,
    width: number,
    options: { size?: number; font?: PDFFont; bold?: boolean; align?: 'left' | 'center' | 'right'; shrink?: boolean } = {},
  ) => {
    const clean = String(value || '').trim()
    if (!clean) return
    const font = options.font || (options.bold ? bold : regular)
    const size = options.shrink === false ? options.size ?? 10 : fittedSize(clean, font, options.size ?? 10, width)
    const measured = textWidth(clean, font, size)
    const dx = options.align === 'right' ? Math.max(0, width - measured) : options.align === 'center' ? Math.max(0, (width - measured) / 2) : 0
    page.drawText(clean, { x: x + dx, y, size, font, color: black, maxWidth: width, lineHeight: size + 3 })
  }

  const drawAnchoredValue = (
    pageIndex: number,
    label: string,
    value: string | undefined,
    labelX: number,
    y: number,
    width: number,
    options: { size?: number; labelFont?: PDFFont; valueFont?: PDFFont; mask?: [number, number, number, number]; padding?: number } = {},
  ) => {
    const page = pages[pageIndex]
    const clean = String(value || '').trim()
    if (!page || !clean) return
    const size = options.size ?? 10
    const labelFont = options.labelFont || bold
    const valueFont = options.valueFont || regular
    const padding = options.padding ?? 4
    const valueX = labelX + textWidth(label, labelFont, size) + padding
    optionMask(page, options.mask, valueX, y, width - (valueX - labelX), size)
    drawValue(page, clean, valueX, y, width - (valueX - labelX), { size, font: valueFont })
  }

  const drawRichBlock = (
    pageIndex: number,
    parts: TextPart[],
    x: number,
    y: number,
    width: number,
    options: { size?: number; mask?: [number, number, number, number]; lineHeight?: number } = {},
  ) => {
    const page = pages[pageIndex]
    if (!page) return
    const size = options.size ?? 10
    const lineHeight = options.lineHeight ?? size + 4
    const rows = wrapRichText(parts, width, regular, bold, size)
    if (options.mask) {
      const [mx, my, mw, mh] = options.mask
      drawMask(page, mx, my, mw, Math.max(mh, rows.length * lineHeight + 4))
    }
    rows.forEach((row, rowIndex) => {
      let cx = x
      if (!options.mask) textMask(page, x, y - rowIndex * lineHeight, width, size)
      row.forEach(part => {
        const font = part.bold ? bold : regular
        page.drawText(part.text, { x: cx, y: y - rowIndex * lineHeight, size, font, color: black })
        cx += textWidth(part.text, font, size)
      })
    })
  }

  const draw = (
    pageIndex: number,
    text: string | undefined,
    x: number,
    y: number,
    width: number,
    options: { size?: number; bold?: boolean; mask?: [number, number, number, number]; align?: 'left' | 'center' | 'right' } = {},
  ) => {
    const page = pages[pageIndex]
    const value = String(text || '').trim()
    if (!page || !value) return
    const size = options.size ?? 10
    optionMask(page, options.mask, x, y, width, size)
    drawValue(page, value, x, y, width, { size, bold: options.bold, align: options.align })
  }

  const drawWrapped = (
    pageIndex: number,
    text: string | undefined,
    x: number,
    y: number,
    width: number,
    options: { size?: number; mask?: [number, number, number, number] } = {},
  ) => {
    const page = pages[pageIndex]
    const value = String(text || '').trim()
    if (!page || !value) return
    const size = options.size ?? 10
    const lineHeight = size + 4
    const lines = wrapByWidth(value, width, regular, size)
    if (options.mask) {
      const [mx, my, mw, mh] = options.mask
      drawMask(page, mx, my, mw, Math.max(mh, lines.length * lineHeight + 4))
    }
    lines.forEach((line, index) => {
      if (!options.mask) textMask(page, x, y - index * lineHeight, width, size)
      page.drawText(line, { x, y: y - index * lineHeight, size, font: regular, color: black, maxWidth: width })
    })
  }

  if (doc.type === 'confirmation') {
    draw(0, letterDate, 410, 728, 120, { size: 10, mask: [398, 723, 140, 18], align: 'right' })
    draw(0, employeeName, 145, 665, 270, { size: 10, bold: true, mask: [140, 660, 300, 18] })
    draw(0, f.employeeCode, 145, 640, 180, { size: 10, mask: [140, 635, 220, 18] })
    draw(0, employeeName, 93, 572, 260, { size: 10, mask: [88, 567, 290, 18] })
    draw(0, v.designation, 342, 511, 160, { size: 10, mask: [334, 506, 190, 18] })
    draw(0, v.confirmationEffectiveDate, 265, 496, 125, { size: 10, mask: [258, 491, 155, 18] })
    return
  }

  if (doc.type === 'appointment') {
    draw(0, employeeName, 72, 641, 250, { size: 10.5, bold: true, mask: [66, 636, 330, 20] })
    drawWrapped(0, [v.workLocation, v.employeeState].filter(Boolean).join(', '), 72, 621, 285, {
      size: 10,
      mask: [66, 596, 335, 41],
    })
    draw(0, letterDate, 410, 686, 120, { size: 10, mask: [396, 681, 145, 18], align: 'right' })
    drawAnchoredValue(0, 'Date: ', letterDate, 72, 568, 205, { size: 10, valueFont: bold, mask: [100, 563, 178, 18], padding: 0 })
    drawAnchoredValue(0, 'Dear ', employeeName, 72, 523, 270, { size: 10, labelFont: regular, mask: [95, 515, 270, 18], padding: 0 })
    drawRichBlock(0, [
      { text: 'We are pleased to inform you that you are appointed as ' },
      { text: v.designation, bold: true },
      { text: ' with ' },
      { text: 'Netbounce Placements LLP', bold: true },
      { text: ', effective ' },
      { text: doj, bold: true },
      { text: ', subject to the following terms and conditions:' },
    ], 72, 498, 468, { size: 10, lineHeight: 14, mask: [66, 470, 490, 45] })
    drawAnchoredValue(0, 'Designation: ', v.designation, 110, 426, 270, { size: 10, mask: [169, 418, 230, 19] })
    drawAnchoredValue(0, 'Department: ', v.department, 110, 404, 270, { size: 10, mask: [169, 400, 230, 19] })
    drawRichBlock(0, [
      { text: 'Your initial place of posting will be ' },
      { text: v.location || v.workLocation, bold: true },
      { text: '. The Company reserves the right to transfer you to any other location or assign duties as per business requirements.' },
    ], 72, 336, 468, { size: 10, lineHeight: 14, mask: [66, 322, 490, 34] })
    drawRichBlock(1, [
      { text: 'Your date of joining shall be ' },
      { text: doj, bold: true },
      { text: '.' },
    ], 72, 787, 468, { size: 10, lineHeight: 14, mask: [66, 770, 490, 19] })
    drawRichBlock(1, [
      { text: 'Your total monthly gross salary will be ' },
      { text: v.monthlyGross, bold: true },
      { text: ', subject to applicable statutory deductions as per law.' },
    ], 72, 750, 468, { size: 10, lineHeight: 14, mask: [66, 745, 490, 34] })
    return
  }

  draw(0, letterDate, 51, 736, 160, { size: 10, mask: [49, 731, 194, 18] })
  draw(0, `${f.employeeTitle || ''} ${employeeName}`.trim(), 51, 710, 260, { size: 10.5, bold: true, mask: [49, 704, 318, 20] })
  drawWrapped(0, [v.address1, v.address2, v.address3].filter(Boolean).join('\n'), 51, 684, 280, {
    size: 10,
    mask: [49, 644, 340, 64],
  })
  draw(0, `${v.employeeTitle} ${employeeName}`.trim(), 75, 591.5, 260, { size: 10, mask: [73, 587, 292, 18] })
  draw(0, v.designation, 115, 476, 180, { size: 10, mask: [108, 470, 212, 18] })
  draw(0, v.department, 115, 461, 180, { size: 10, mask: [108, 455, 212, 18] })
  draw(0, doj, 300, 389, 150, { size: 10, mask: [298, 384, 176, 18] })
  draw(0, v.location || v.workLocation, 215, 316, 190, { size: 11, mask: [212, 310, 222, 19] })
  draw(1, v.yearlyCtc, 232, 704, 135, { size: 10, mask: [228, 699, 162, 18] })
  draw(1, v.monthlyCtc, 405, 704, 110, { size: 10, mask: [398, 699, 140, 18] })
}

function getHrLines(doc: Document) {
  const f = doc.fields || {}
  const employeeName = f.employeeName || f.candidateName || doc.client_name || 'Employee Name'
  const letterDate = formatLongDate(f.letterDate)
  const doj = formatLongDate(f.dateOfJoining)

  if (doc.type === 'confirmation') {
    return [
      `Date: ${letterDate}`,
      `Employee Name: ${employeeName}`,
      `Employee Code: ${f.employeeCode || 'Employee Code'}`,
      '',
      'Confirmation Letter',
      `Dear ${employeeName},`,
      `Congratulations! Consequent to the review of your performance during your probation period, we have the pleasure in informing you that your services are being confirmed as ${f.designation || 'Designation'} with effect from ${letterDate}.`,
      'All the other terms and conditions as detailed in your appointment letter remain unchanged.',
      'As an organization, we look forward to your valuable contributions and long term association with Netbounce Placements LLP.',
      'We wish you all the very best for a rewarding career with Netbounce Placements LLP.',
      '',
      'Your Sincerely,',
      'For Netbounce Placements LLP',
      '[SIGNATURE]',
      'Nisarg Patel',
      'Chief Executive Officer',
    ]
  }

  if (doc.type === 'appointment') {
    return [
      'LETTER OF APPOINTMENT',
      employeeName,
      f.work_location || 'work_location',
      f.employee_state || 'employee_state',
      `Date: ${letterDate}`,
      `Dear ${employeeName},`,
      `We are pleased to inform you that you are appointed as ${f.designation || 'designation'} with Netbounce Placements LLP, effective ${doj}, subject to the following terms and conditions:`,
      '1. Designation & Department',
      `Designation: ${f.designation || 'designation'}`,
      `Department: ${f.department || 'department'}`,
      '2. Place of Posting',
      `Your initial place of posting will be ${f.location || f.work_location || 'location'}. The Company reserves the right to transfer you to any other location or assign duties as per business requirements.`,
      '3. Date of Joining',
      `Your date of joining shall be ${doj}.`,
      '4. Compensation',
      `Your total monthly gross salary will be ${formatMoney(f.monthlyGrossSalary)}, subject to applicable statutory deductions as per law.`,
      '5. Probation Period',
      'You will be on probation for a period of three (3) months from the date of joining. Confirmation of employment will be subject to satisfactory completion of the probation period.',
      '6. Working Hours, Shifts and Location',
      'Working hours and shift timings may vary depending on the department and role assigned.',
      '7. Leave & Attendance',
      'Leave entitlement and attendance rules shall be governed by the Company policies in force from time to time.',
      '8. Notice Period',
      'Upon confirmation, either party may terminate employment by providing thirty (30) days written notice.',
      '9. Confidentiality & Data Protection',
      'You shall maintain strict confidentiality of all Company, client, vendor, and candidate information during and after employment.',
      '',
      'For Netbounce Placements LLP',
      '[SIGNATURE]',
      'Nisarg Patel',
      'Chief Executive Officer',
      '',
      'Employee Acceptance',
      'Signature: ____________________',
      'Date: ________________________',
    ]
  }

  return [
    f.letterDate ? formatLongDate(f.letterDate) : '',
    `${f.employeeTitle || ''} ${employeeName}`.trim(),
    f.addressLine1 || '',
    f.addressLine2 || '',
    f.addressLine3 || '',
    'Subject: Offer of Employment',
    `Dear ${f.employeeTitle || ''} ${employeeName},`,
    'With reference to your application and subsequent interview with us, we are pleased to offer you employment with Netbounce Placements LLP on the following terms and conditions:',
    '1. Position & Department',
    `Designation: ${f.designation || 'Designation'}`,
    `Department: ${f.department || 'Department'}`,
    '2. Date of Joining',
    `You are required to join the organization on or before ${doj}.`,
    '3. Place of Posting',
    `Your initial place of posting will be ${f.location || 'Location'}.`,
    '4. Compensation',
    `Your Cost to Company (CTC) will be ${formatMoney(f.annualCtc)} per annum (${formatMoney(f.monthlyCtc)} per month).`,
    '5. Probation',
    'You will be on probation for a period of three (3) months from the date of joining.',
    '6. Working Hours & Leave',
    'Your working hours, weekly offs, leaves, and holidays will be governed by the company policies in force from time to time.',
    '7. Notice Period & Termination',
    'Your employment with the Company may be terminated by either party by giving thirty (30) days written notice or salary in lieu thereof.',
    '',
    'For Netbounce Placements LLP',
    '[SIGNATURE]',
    'Nisarg Patel',
    'Chief Executive Officer',
  ].filter(Boolean)
}

function wrap(text: string, max: number) {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = `${line} ${word}`.trim()
    if (next.length > max && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function wrapRichText(parts: TextPart[], width: number, regular: any, bold: any, size: number) {
  const tokens = parts.flatMap(part => tokenizePart(part))
  const rows: TextPart[][] = []
  let row: TextPart[] = []
  let rowWidth = 0

  for (const token of tokens) {
    const font = token.bold ? bold : regular
    const tokenWidth = font.widthOfTextAtSize(token.text, size)
    if (row.length && rowWidth + tokenWidth > width) {
      rows.push(trimRichRow(row))
      row = []
      rowWidth = 0
      if (token.text.trim() === '') continue
    }
    row.push(token)
    rowWidth += tokenWidth
  }

  if (row.length) rows.push(trimRichRow(row))
  return rows
}

function tokenizePart(part: TextPart) {
  return part.text.split(/(\s+)/).filter(Boolean).map(text => ({ text, bold: part.bold }))
}

function trimRichRow(row: TextPart[]) {
  const next = [...row]
  while (next.length && next[0].text.trim() === '') next.shift()
  while (next.length && next[next.length - 1].text.trim() === '') next.pop()
  return next
}

function getHrValues(doc: Document) {
  const f = doc.fields || {}
  const employeeName = field(f, 'employee_name', 'employeename', 'Employee_Name', 'employeeName', 'candidateName') || doc.client_name || ''
  const letterDateRaw = field(f, 'letterdate', 'letterDate', 'date')
  const dojRaw = field(f, 'doj', 'dateOfJoining')
  const ctcTotal = numberField(f, 'CTC_TOTAL_FULL', 'annualCtc')
  const pli = numberField(f, 'PLI_FULL')
  const yearlyRate = f.annualCtc ? numberField(f, 'annualCtc') : ctcTotal ? ctcTotal * 12 : 0
  const monthlyTotal = ctcTotal || numberField(f, 'monthlyCtc')
  const monthlyWithPli = monthlyTotal || pli ? monthlyTotal + pli : 0

  return {
    employeeName,
    employeeTitle: field(f, 'employeetitle', 'employeeTitle'),
    employeeCode: field(f, 'Employee_Code', 'employeeCode'),
    workLocation: field(f, 'work_location', 'workLocation'),
    employeeState: field(f, 'employee_state'),
    letterDate: formatLongDate(letterDateRaw),
    confirmationDate: formatLongDate(field(f, 'date', 'letterdate', 'letterDate')),
    confirmationEffectiveDate: formatDateDash(field(f, 'DD-MM-YYYY')) || formatLongDate(field(f, 'date', 'letterdate', 'letterDate')),
    designation: field(f, 'designation', 'Designation', 'jobTitle'),
    doj: formatLongDate(dojRaw),
    department: field(f, 'department'),
    location: field(f, 'location', 'work_location', 'workLocation'),
    monthlyGross: formatRupees(field(f, 'MONTHLY_GROSS_FULL', 'monthlyGrossSalary')),
    address1: field(f, 'add line 1', 'addressLine1'),
    address2: field(f, 'add line 2', 'addressLine2'),
    address3: field(f, 'add line 3', 'addressLine3'),
    yearlyCtc: yearlyRate ? formatRupees(yearlyRate) : formatRupees(field(f, 'annualCtc')),
    monthlyCtc: monthlyWithPli ? `${formatRupees(Math.round(monthlyWithPli))} per month` : `${formatRupees(field(f, 'monthlyCtc'))} per month`,
  }
}

function field(fields: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = fields[key]
    if (value !== undefined && String(value).trim()) return String(value).trim()
  }
  return ''
}

function numberField(fields: Record<string, string>, ...keys: string[]) {
  const value = field(fields, ...keys)
  if (!value) return 0
  const number = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isFinite(number) ? number : 0
}

function wrapByWidth(text: string, width: number, font: { widthOfTextAtSize: (text: string, size: number) => number }, size: number) {
  const lines: string[] = []
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    let line = ''
    for (const word of words) {
      const next = `${line} ${word}`.trim()
      if (font.widthOfTextAtSize(next, size) > width && line) {
        lines.push(line)
        line = word
      } else {
        line = next
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

function drawHorizontalGradient(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  stops: Array<{ at: number; color: [number, number, number] }>,
) {
  const steps = 160
  const stepWidth = width / steps

  for (let index = 0; index < steps; index += 1) {
    const at = index / Math.max(1, steps - 1)
    const [from, to] = findGradientStops(stops, at)
    const span = Math.max(0.001, to.at - from.at)
    const local = Math.min(1, Math.max(0, (at - from.at) / span))
    const color = from.color.map((channel, channelIndex) => {
      const next = to.color[channelIndex]
      return (channel + (next - channel) * local) / 255
    }) as [number, number, number]

    page.drawRectangle({
      x: x + index * stepWidth,
      y,
      width: stepWidth + 0.8,
      height,
      color: rgb(color[0], color[1], color[2]),
    })
  }
}

function findGradientStops(stops: Array<{ at: number; color: [number, number, number] }>, at: number) {
  const ordered = [...stops].sort((a, b) => a.at - b.at)
  let from = ordered[0]
  let to = ordered[ordered.length - 1]

  for (let index = 0; index < ordered.length - 1; index += 1) {
    if (at >= ordered[index].at && at <= ordered[index + 1].at) {
      from = ordered[index]
      to = ordered[index + 1]
      break
    }
  }

  return [from, to] as const
}

function drawTrackedText(
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
  tracking: number,
) {
  let cursor = x
  for (const char of value) {
    page.drawText(char, { x: cursor, y, size, font, color })
    cursor += font.widthOfTextAtSize(char, size) + tracking
  }
}

function formatDateSlash(value?: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

function formatLongDate(value?: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatDateDash(value?: string) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
}

function formatMoney(value?: string | number) {
  if (value === undefined || value === null || String(value).trim() === '') return ''
  const raw = String(value)
  if (!/[0-9]/.test(raw)) return ''
  const amount = typeof value === 'number' ? value : Number(raw.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(amount)) return ''
  return `$ ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)}`
}

function formatInvoiceMoney(value?: string | number) {
  if (value === undefined || value === null || String(value).trim() === '') return ''
  const raw = String(value).trim()
  if (!/[0-9]/.test(raw)) return raw
  const amount = typeof value === 'number' ? value : Number(raw.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(amount)) return raw
  return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`
}

function isZeroInvoiceMoney(value?: string) {
  if (!value) return true
  const amount = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(amount) && amount === 0
}

function formatHrMoney(value?: string | number) {
  if (value === undefined || value === null || String(value).trim() === '') return ''
  const raw = String(value).trim()
  if (!/[0-9]/.test(raw)) return raw
  if (/[a-zA-Z$₹]/.test(raw)) return raw
  const amount = typeof value === 'number' ? value : Number(raw.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(amount)) return raw
  return `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`
}

function formatRupees(value?: string | number) {
  if (value === undefined || value === null || String(value).trim() === '') return ''
  const raw = String(value).trim()
  if (raw.startsWith('Rs.')) return raw.replace(/^Rs\.\s*/, 'Rs. ')
  const amount = typeof value === 'number' ? value : Number(raw.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(amount)) return raw
  return `Rs. ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`
}

function formatPercent(value?: string) {
  if (!value || !value.trim()) return ''
  return value.trim().endsWith('%') ? value.trim() : `${value.trim()}%`
}
