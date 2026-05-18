import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { normalizeDocument } from '@/lib/document-normalize'
import { Document } from '@/lib/types'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN = 42.52
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const HEADER_HEIGHT = 156
const HEADER_BOTTOM_Y = PAGE_HEIGHT - HEADER_HEIGHT
const HEADER_CONTENT_GAP = 42
const GRADIENT_START_HEX = '#0033FF'
const GRADIENT_MID_HEX = '#0000FF'
const GRADIENT_GLOW_HEX = '#001A66'
const GRADIENT_END_HEX = '#000000'
const BRAND_DARK = hexRgb('#020617')
const ELECTRIC_BLUE = hexRgb(GRADIENT_START_HEX)
const ELECTRIC_BLUE_MID = hexRgb(GRADIENT_MID_HEX)
const ELECTRIC_GLOW = hexRgb(GRADIENT_GLOW_HEX)
const BLACK = hexRgb(GRADIENT_END_HEX)
const BODY = rgb(0.12, 0.16, 0.23)
const MUTED = rgb(0.39, 0.45, 0.55)
const BORDER = rgb(0.88, 0.91, 0.95)
const SURFACE = hexRgb('#F8FAFC')
const ZEBRA = hexRgb('#F3F6FB')
const WHITE = rgb(1, 1, 1)

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return new NextResponse('Missing document id', { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).single()
  if (error || !data) return new NextResponse('Document not found', { status: 404 })

  const doc = normalizeDocument(data as Document)
  const { data: auditRows } = await supabase
    .from('audit_trail')
    .select('*')
    .eq('document_id', doc.id)
    .order('created_at', { ascending: true })

  const audit = auditRows ?? []
  const viewEvents = audit.filter(entry => {
    const event = String(entry.event || '').toLowerCase()
    return event.includes('view') || event.includes('opened') || event.includes('button clicked')
  })
  const firstViewed = viewEvents[0]?.created_at || ''
  const lastViewed = viewEvents[viewEvents.length - 1]?.created_at || ''
  const totalViews = Number(doc.view_count || viewEvents.length)

  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const logoBytes = await readFile(path.join(process.cwd(), 'public', 'nb-logo-full-white.png')).catch(() => null)
  const logo = logoBytes ? await pdf.embedPng(logoBytes) : null
  const generatedOn = formatFooterDateTime(new Date().toISOString())
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = 792

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - MARGIN
  }

  drawHeader(page, bold, DOCUMENT_TYPE_LABELS[doc.type] || doc.type, logo)
  y = HEADER_BOTTOM_Y - HEADER_CONTENT_GAP

  y = drawRecipientSection(page, regular, bold, y, [
    ['Recipient Name', doc.client_name],
    ['Recipient Email', doc.client_email],
    ['Document ID', doc.id],
    ['Document Type', DOCUMENT_TYPE_LABELS[doc.type] || doc.type],
  ])

  y = drawStatusSection(page, regular, bold, y - 18, {
    status: doc.status === 'signed' ? 'Signed' : doc.status === 'viewed' ? 'Viewed / Pending Signature' : 'Pending',
    signedAt: formatDate(doc.signed_at),
    sentAt: formatDate(doc.sent_at),
    totalViews: String(totalViews),
    firstViewed: formatDate(firstViewed) || 'Not viewed',
    lastViewed: formatDate(lastViewed) || 'Not viewed',
  })

  y = drawSectionTitle(page, bold, y - 18, 'Tracking Logs')
  y = drawTableHeader(page, bold, y)

  audit.forEach((entry, index) => {
    if (y < 92) {
      newPage()
      y = drawSectionTitle(page, bold, y, 'Tracking Logs Continued')
      y = drawTableHeader(page, bold, y)
    }
    y = drawLogRow(page, regular, y, [
      formatDateTime(entry.created_at),
      String(entry.event || ''),
      String(entry.ip_address || ''),
      compactUserAgent(String(entry.user_agent || '')),
    ], index)
  })

  if (!audit.length) {
    drawText(page, regular, 'No tracking logs have been recorded yet.', MARGIN, y - 18, 10, MUTED)
    y -= 36
  }

  if (y < 122) newPage()

  const pages = pdf.getPages()
  pages.forEach((pdfPage, index) => {
    drawFooter(pdfPage, regular, index + 1, pages.length, generatedOn)
  })

  const bytes = await pdf.save()
  const filename = `document_report_${doc.client_name || doc.id}.pdf`.replace(/[^\w.-]+/g, '_')

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

function drawHeader(page: any, bold: any, title: string, logo: any) {
  drawHeaderGradient(page, 0, HEADER_BOTTOM_Y, PAGE_WIDTH, HEADER_HEIGHT)

  const logoHeight = 58
  const logoWidth = 232
  const logoY = HEADER_BOTTOM_Y + (HEADER_HEIGHT - logoHeight) / 2
  if (logo) {
    page.drawImage(logo, { x: MARGIN, y: logoY, width: logoWidth, height: logoHeight })
  } else {
    page.drawText('NETBOUNCE', { x: MARGIN, y: logoY + 18, size: 24, font: bold, color: WHITE, characterSpacing: 1.1 })
  }

  const documentTitle = title.toUpperCase().includes('REPORT') ? 'ACTIVITY REPORT' : title.toUpperCase()
  drawRightText(page, bold, documentTitle, PAGE_WIDTH - MARGIN, HEADER_BOTTOM_Y + 68, 18, WHITE, 2.8)
}

function drawFooter(page: any, regular: any, pageNumber: number, pageCount: number, generatedOn: string) {
  page.drawLine({ start: { x: MARGIN, y: 56 }, end: { x: PAGE_WIDTH - MARGIN, y: 56 }, thickness: 0.8, color: BORDER })
  page.drawText(`Generated on: ${generatedOn} | Authorized by NetBounce Placement LLC`, { x: MARGIN, y: 38, size: 7.2, font: regular, color: MUTED })
  const pageText = `Page ${pageNumber} of ${pageCount}`
  const pageTextWidth = regular.widthOfTextAtSize(pageText, 7.2)
  page.drawText(pageText, { x: PAGE_WIDTH - MARGIN - pageTextWidth, y: 38, size: 7.2, font: regular, color: MUTED })
}

function drawRecipientSection(page: any, regular: any, bold: any, y: number, rows: string[][]) {
  y = drawSectionTitle(page, bold, y, 'Recipient Details')
  const cardTop = y - 10
  const cardHeight = 104
  page.drawRectangle({ x: MARGIN, y: cardTop - cardHeight, width: CONTENT_WIDTH, height: cardHeight, color: SURFACE, borderColor: BORDER, borderWidth: 1 })
  let rowY = cardTop - 24
  for (const [label, value] of rows) {
    drawText(page, bold, label, MARGIN + 16, rowY, 9, MUTED)
    drawText(page, regular, value || '-', MARGIN + 126, rowY, 9, BODY)
    rowY -= 20
  }
  return cardTop - cardHeight - 18
}

function drawStatusSection(page: any, regular: any, bold: any, y: number, summary: Record<string, string>) {
  y = drawSectionTitle(page, bold, y, 'Status & Tracking Summary')
  const cards = [
    ['Final Status', summary.status],
    ['Sent', summary.sentAt || '-'],
    ['Total Views', summary.totalViews],
    ['Completed', summary.signedAt || 'Pending'],
    ['First Viewed', summary.firstViewed],
    ['Last Viewed', summary.lastViewed],
  ]

  let x = MARGIN
  let rowY = y - 60
  const cardWidth = (CONTENT_WIDTH - 26) / 3
  cards.forEach((card, index) => {
    if (index === 3) {
      x = MARGIN
      rowY -= 74
    }
    page.drawRectangle({ x: x + 1.5, y: rowY - 1.5, width: cardWidth, height: 54, color: rgb(0.91, 0.93, 0.98) })
    page.drawRectangle({ x, y: rowY, width: cardWidth, height: 54, color: WHITE, borderColor: BORDER, borderWidth: 1 })
    drawText(page, bold, card[0], x + 12, rowY + 33, 8, MUTED)
    drawText(page, regular, card[1], x + 12, rowY + 15, 8.5, BODY)
    x += cardWidth + 13
  })

  return rowY - 22
}

function drawSectionTitle(page: any, bold: any, y: number, title: string) {
  drawText(page, bold, title, MARGIN, y, 12, BRAND_DARK)
  page.drawLine({ start: { x: MARGIN, y: y - 9 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 9 }, thickness: 1, color: BORDER })
  return y - 26
}

function drawTableHeader(page: any, bold: any, y: number) {
  drawLinearGradient(page, MARGIN, y - 24, CONTENT_WIDTH, 24, BRAND_DARK, BLACK)
  drawText(page, bold, 'Timestamp', MARGIN + 10, y - 15, 7.2, WHITE)
  drawText(page, bold, 'Event', MARGIN + 154, y - 15, 7.2, WHITE)
  drawText(page, bold, 'IP Address', MARGIN + 350, y - 15, 7.2, WHITE)
  drawText(page, bold, 'Device', MARGIN + 424, y - 15, 7.2, WHITE)
  return y - 24
}

function drawLogRow(page: any, regular: any, y: number, cells: string[], index: number) {
  const height = 28
  const fill = index % 2 === 0 ? WHITE : ZEBRA
  page.drawRectangle({ x: MARGIN, y: y - height, width: CONTENT_WIDTH, height, color: fill, borderColor: BORDER, borderWidth: 0.6 })
  drawFittedText(page, regular, cells[0] || '-', MARGIN + 10, y - 16, 136, 6.1, BODY)
  drawFittedText(page, regular, cells[1] || '-', MARGIN + 154, y - 16, 184, 6.4, BODY)
  drawFittedText(page, regular, cells[2] || '-', MARGIN + 350, y - 16, 62, 6.4, BODY)
  drawFittedText(page, regular, cells[3] || '-', MARGIN + 424, y - 16, 78, 6.4, BODY)
  return y - height
}

function drawText(page: any, font: any, text: string, x: number, y: number, size: number, color: any) {
  page.drawText(sanitizePdfText(text), { x, y, size, font, color })
}

function drawFittedText(page: any, font: any, text: string, x: number, y: number, width: number, size: number, color: any) {
  let value = sanitizePdfText(text)
  let fontSize = size
  while (fontSize > 5.1 && font.widthOfTextAtSize(value, fontSize) > width) fontSize -= 0.25
  while (value.length > 4 && font.widthOfTextAtSize(value, fontSize) > width) value = `${value.slice(0, -4)}...`
  page.drawText(value, { x, y, size: fontSize, font, color })
}

function drawWrappedText(page: any, font: any, text: string, x: number, y: number, width: number, size: number, color: any, lineHeight = size + 2, maxLines = 2) {
  const lines = wrapByWidth(sanitizePdfText(text), width, font, size).slice(0, maxLines)
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * lineHeight, size, font, color })
  })
}

function wrapByWidth(text: string, width: number, font: any, size: number) {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
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
  return lines.length ? lines : ['-']
}

function formatDate(value?: string | null) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return value
  }
}

function formatFooterDateTime(value?: string | null) {
  if (!value) return ''
  try {
    const date = new Date(value)
    const datePart = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    })
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    return `${datePart} at ${timePart}`
  } catch {
    return value
  }
}

function sanitizePdfText(value: string) {
  return String(value || '-').replace(/[^\x20-\x7E]/g, '-')
}

function hexRgb(hex: string) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  return rgb(r, g, b)
}

function drawLinearGradient(page: any, x: number, y: number, width: number, height: number, start: any, end: any) {
  const steps = 80
  const stepWidth = width / steps
  for (let i = 0; i < steps; i += 1) {
    const ratio = i / Math.max(1, steps - 1)
    page.drawRectangle({
      x: x + i * stepWidth,
      y,
      width: stepWidth + 0.5,
      height,
      color: rgb(
        start.red + (end.red - start.red) * ratio,
        start.green + (end.green - start.green) * ratio,
        start.blue + (end.blue - start.blue) * ratio,
      ),
    })
  }
}

function drawHeaderGradient(page: any, x: number, y: number, width: number, height: number) {
  drawGradientStops(page, x, y, width, height, [
    { position: 0, color: ELECTRIC_BLUE },
    { position: 0.3, color: ELECTRIC_BLUE_MID },
    { position: 0.56, color: ELECTRIC_GLOW },
    { position: 1, color: BLACK },
  ])
}

function drawGradientStops(page: any, x: number, y: number, width: number, height: number, stops: Array<{ position: number; color: any }>) {
  const steps = 120
  const stepWidth = width / steps
  for (let i = 0; i < steps; i += 1) {
    const ratio = i / Math.max(1, steps - 1)
    const current = stops.find((stop, index) => {
      const next = stops[index + 1]
      return next ? ratio >= stop.position && ratio <= next.position : ratio >= stop.position
    }) || stops[0]
    const next = stops[stops.indexOf(current) + 1] || current
    const localRatio = next.position === current.position ? 0 : (ratio - current.position) / (next.position - current.position)
    page.drawRectangle({
      x: x + i * stepWidth,
      y,
      width: stepWidth + 0.5,
      height,
      color: rgb(
        current.color.red + (next.color.red - current.color.red) * localRatio,
        current.color.green + (next.color.green - current.color.green) * localRatio,
        current.color.blue + (next.color.blue - current.color.blue) * localRatio,
      ),
    })
  }
}

function drawRightText(page: any, font: any, text: string, rightX: number, y: number, size: number, color: any, characterSpacing = 0) {
  const width = font.widthOfTextAtSize(text, size) + Math.max(0, text.length - 1) * characterSpacing
  page.drawText(sanitizePdfText(text), { x: rightX - width, y, size, font, color, characterSpacing })
}

function compactUserAgent(userAgent: string) {
  if (userAgent.includes('Edg/')) return 'Microsoft Edge'
  if (userAgent.includes('Chrome/')) return 'Chrome'
  if (userAgent.includes('Firefox/')) return 'Firefox'
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari'
  return userAgent ? userAgent.slice(0, 60) : ''
}
