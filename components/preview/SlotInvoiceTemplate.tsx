'use client'

import type React from 'react'

type Props = {
  type?: 'slot-invoice-receipt' | 'final-invoice-receipt'
  fields: Record<string, string>
  clientName: string
  clientEmail?: string
}

const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123
const TEXT = '#050505'
const RECEIPT_PURPLE = '#C5C3F4'
const HEADER_GRADIENT = 'linear-gradient(90deg, #f8f8fc 0%, #b8bcf7 28%, #5b67f0 62%, #1E3AFA 100%)'
const EMBLEM_BLUE = '#1230E7'

const CONTENT_LEFT = 54
const CONTENT_WIDTH = 686
const COST_COLUMN_WIDTH = 92
const SUMMARY_WIDTH = 260
const SUMMARY_RIGHT = 110
const SUMMARY_BOTTOM = 354

export default function SlotInvoiceTemplate({ type = 'slot-invoice-receipt', fields, clientName, clientEmail = '' }: Props) {
  const v = getReceiptValues(type, fields, clientName, clientEmail)

  return (
    <div style={previewShellStyle}>
      <article aria-label="Slot-Invoice Receipt preview" style={pageStyle}>
        <div style={whiteResetStyle} />
        <Header />

        <section style={{ ...infoSectionStyle, left: CONTENT_LEFT, width: CONTENT_WIDTH }}>
          <InfoBlock label="Invoice to:" style={{ left: 0, width: 190 }}>
            <p style={nameStyle}>{v.candidateName}</p>
            <p style={smallLineStyle}>{v.candidatePhone}</p>
            <p style={emailLineStyle}>{v.candidateEmail}</p>
          </InfoBlock>

          <InfoBlock label="Date:" style={{ left: 326, width: 210 }}>
            <p style={dateStyle}>{v.date}</p>
            <div style={{ height: 16 }} />
            <p style={smallLineStyle}>Netbounce Placement LLC</p>
            <p style={emailLineStyle}>billingsupport@netbounceplacement.com</p>
            <p style={smallLineStyle}>2404, 1007 N Orange St. 4th Floor ,</p>
            <p style={smallLineStyle}>Wilmington, DE, New Castle, US, 19801</p>
          </InfoBlock>

          <InfoBlock label="Invoice number:" style={{ left: 594, width: 92 }}>
            <p style={invoiceNoStyle}>{v.invoiceNo}</p>
          </InfoBlock>
        </section>

        <section style={tableStyle}>
          <div style={tableHeaderStyle}>
            <span style={{ textAlign: 'left' }}>Item:</span>
            <span style={{ textAlign: 'center' }}>Deliverables:</span>
            <span style={{ textAlign: 'center' }}>Cost:(US $)</span>
          </div>
          <div style={tableRowStyle}>
            <p style={itemTextStyle}>{v.packName}</p>
            <p style={itemTextStyle}>{v.deliverables}</p>
            <p style={{ ...itemTextStyle, textAlign: 'right' }}>{v.packAmount}</p>
          </div>
        </section>

        <section style={commentStyle}>
          <p style={commentLineStyle}>{v.upfrontDetails}</p>
          <p style={commentLineStyle}>{v.remainingDetails}</p>
          {v.termsLines.map(line => (
            <p key={line} style={commentLineStyle}>{line}</p>
          ))}
        </section>

        <ReceiptSummary
          advanceReceived={v.advanceReceived}
          pendingBalance={v.pendingBalance}
          dueDate={v.dueDate}
        />

        <section style={paymentDetailsStyle}>
          <p style={paymentLineStyle}>Payment Details:</p>
          <p style={paymentLineStyle}>Account Name: Netbounce Placement LLC</p>
          <p style={paymentLineStyle}>Bank Name: Choice Financial Group</p>
          <p style={paymentLineStyle}>Account Number: 202302824963</p>
          <p style={paymentLineStyle}>Routing Number: 091311229</p>
        </section>

        <section style={termsStyle}>
          <p style={termsHeadingStyle}>Terms & Conditions:</p>
          {terms.map(term => (
            <p key={term} style={termStyle}>* {term}</p>
          ))}
        </section>
      </article>
    </div>
  )
}

function Header() {
  return (
    <header style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 250, margin: 0, padding: 0 }}>
      <div style={headerBarStyle} />
      <div style={logoStyle}>
        <div style={{ fontSize: 39, fontWeight: 800, letterSpacing: -3 }}>NB</div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>NETBOUNCE</div>
        <div style={{ fontSize: 7, letterSpacing: 3.5, marginTop: 7 }}>PLACEMENT LLC</div>
      </div>
      <h1 style={invoiceTitleStyle}>INVOICE</h1>
    </header>
  )
}

function InfoBlock({ label, style, children }: { label: string; style: React.CSSProperties; children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', top: 0, textAlign: 'left', ...style }}>
      <span style={{ ...labelPillStyle, minWidth: label === 'Invoice number:' ? 82 : 58 }}>{label}</span>
      <div style={{ marginTop: 15 }}>{children}</div>
    </div>
  )
}

function ReceiptSummary({
  advanceReceived,
  pendingBalance,
  dueDate,
}: {
  advanceReceived: string
  pendingBalance: string
  dueDate?: string
}) {
  const showDueDate = Boolean(dueDate && !isZeroMoney(pendingBalance))

  return (
    <section style={summaryStyle}>
      <div style={advanceRowStyle}>
        <span>Advance Received</span>
        <strong style={amountTextStyle}>{advanceReceived}</strong>
      </div>
      <div style={pendingBoxStyle}>
        <span style={pendingLabelStyle}>Total Pending</span>
        <strong style={pendingAmountStyle}>{pendingBalance}</strong>
        {showDueDate ? <span style={pendingDueDateStyle}>Due by: {dueDate}</span> : null}
      </div>
    </section>
  )
}

function getReceiptValues(type: NonNullable<Props['type']>, fields: Record<string, string>, clientName: string, clientEmail: string) {
  const termsComment = value(fields, 'terms_comment') || '8% of your gross annual salary package in 4 installments calculated as per offer letter'
  const isFinalReceipt = type === 'final-invoice-receipt'

  return {
    candidateName: value(fields, 'candidate_name', 'candidateName') || clientName || 'Xyz Sharma',
    candidateEmail: value(fields, 'candidate_email', 'candidateEmail') || clientEmail || 'xyz@gmail.com',
    candidatePhone: value(fields, 'candidate_phone', 'candidatePhone') || '+1 66996 96969',
    date: formatLongDate(value(fields, 'date', 'invoiceDate')) || '27 March 2026',
    invoiceNo: value(fields, 'invoice_no', 'invoiceNumber') || 'INV/26/001',
    packName: value(fields, 'pack_name', 'packName') || 'Starter Plan:',
    deliverables: value(fields, 'deliverables', 'comments') || 'As per the services mentioned in pricing document',
    packAmount: formatMoney(value(fields, 'pack_amount', 'packAmount')) || '$3000.00',
    upfrontDetails: value(fields, 'upfront_details') || '$3000 upfront,',
    remainingDetails: value(fields, 'remaining_details') || '$2500 payable when offer letter is received,',
    termsLines: splitComment(termsComment, 54),
    advanceReceived: isFinalReceipt
      ? formatMoney(value(fields, 'total_paid', 'advance_received', 'advance_amount')) || '$3000.00'
      : formatMoney(value(fields, 'advance_received', 'advance_amount')) || '$1500.00',
    pendingBalance: isFinalReceipt
      ? formatMoney(value(fields, 'final_pending', 'pending_balance', 'pending_amount')) || '$0.00'
      : formatMoney(value(fields, 'pending_balance', 'pending_amount')) || '$1500.00',
    dueDate: isFinalReceipt ? '' : formatLongDate(value(fields, 'dueDate', 'due_date')) || '10 April 2026',
  }
}

function value(fields: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const item = fields[key]
    if (item !== undefined && String(item).trim()) return String(item).trim()
  }
  return ''
}

function splitComment(text: string, maxLength: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const next = `${line} ${word}`.trim()
    if (next.length > maxLength && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }

  if (line) lines.push(line)
  return lines.slice(0, 4)
}

function formatLongDate(raw?: string) {
  if (!raw) return ''
  const date = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatMoney(raw?: string) {
  if (!raw) return ''
  if (raw.includes('$')) return raw.replace(/\$\s+/, '$')
  const amount = Number(raw.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(amount)) return raw
  return `$${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`
}

function isZeroMoney(value: string) {
  const amount = Number(String(value || '').replace(/[^0-9.-]/g, ''))
  return Number.isFinite(amount) && amount === 0
}

const previewShellStyle: React.CSSProperties = {
  background: '#FFFFFF',
  padding: '24px 0',
  minHeight: '100%',
  overflowX: 'auto',
}

const pageStyle: React.CSSProperties = {
  position: 'relative',
  width: PAGE_WIDTH,
  minHeight: PAGE_HEIGHT,
  margin: '0 auto',
  overflow: 'hidden',
  isolation: 'isolate',
  background: '#FFFFFF',
  color: TEXT,
  boxShadow: 'none',
  fontFamily: 'Inter, Arial, Helvetica, sans-serif',
  fontSize: 8,
  lineHeight: 1.2,
}

const whiteResetStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 0,
  background: '#FFFFFF',
}

const headerBarStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  right: 0,
  height: 150,
  background: HEADER_GRADIENT,
  zIndex: 1,
}

const logoStyle: React.CSSProperties = {
  position: 'absolute',
  left: 40,
  top: 40,
  width: 130,
  height: 130,
  borderRadius: '50%',
  background: EMBLEM_BLUE,
  color: '#FFFFFF',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
  lineHeight: 1,
}

const invoiceTitleStyle: React.CSSProperties = {
  position: 'absolute',
  right: 54,
  top: 54,
  zIndex: 2,
  margin: 0,
  color: '#FFFFFF',
  fontSize: 42,
  fontWeight: 400,
  letterSpacing: '0.12em',
}

const infoSectionStyle: React.CSSProperties = {
  position: 'absolute',
  top: 340,
  height: 132,
  zIndex: 1,
}

const labelPillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 22,
  padding: '0 7px',
  borderRadius: 3,
  background: RECEIPT_PURPLE,
  color: TEXT,
  fontSize: 8,
  fontWeight: 400,
  whiteSpace: 'nowrap',
}

const tableStyle: React.CSSProperties = {
  position: 'absolute',
  top: 528,
  left: CONTENT_LEFT,
  width: CONTENT_WIDTH,
  zIndex: 1,
}

const tableHeaderStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `200px 1fr ${COST_COLUMN_WIDTH}px`,
  alignItems: 'center',
  height: 49,
  padding: '0 16px',
  borderRadius: 4,
  background: RECEIPT_PURPLE,
  color: TEXT,
  boxSizing: 'border-box',
}

const tableRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `200px 1fr ${COST_COLUMN_WIDTH}px`,
  columnGap: 16,
  padding: '18px 16px 0',
  boxSizing: 'border-box',
}

const commentStyle: React.CSSProperties = {
  position: 'absolute',
  top: 630,
  left: 70,
  width: 282,
  maxHeight: 72,
  overflow: 'hidden',
  zIndex: 1,
}

const summaryStyle: React.CSSProperties = {
  position: 'absolute',
  right: SUMMARY_RIGHT,
  bottom: SUMMARY_BOTTOM,
  width: SUMMARY_WIDTH,
  zIndex: 1,
}

const advanceRowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `1fr ${COST_COLUMN_WIDTH}px`,
  alignItems: 'center',
  height: 18,
  marginBottom: 14,
  color: TEXT,
  fontSize: 8,
}

const pendingBoxStyle: React.CSSProperties = {
  width: SUMMARY_WIDTH,
  height: 63,
  borderRadius: 5,
  background: RECEIPT_PURPLE,
  boxSizing: 'border-box',
  padding: '8px 10px',
  display: 'grid',
  gridTemplateColumns: `1fr ${COST_COLUMN_WIDTH}px`,
  gridTemplateRows: '1fr auto auto 1fr',
  columnGap: 8,
  alignItems: 'center',
  color: TEXT,
  overflow: 'hidden',
}

const amountTextStyle: React.CSSProperties = {
  display: 'block',
  width: COST_COLUMN_WIDTH,
  textAlign: 'right',
  fontWeight: 800,
  color: TEXT,
  whiteSpace: 'nowrap',
}

const pendingLabelStyle: React.CSSProperties = {
  gridColumn: '1 / 2',
  gridRow: '2 / 3',
  alignSelf: 'center',
  justifySelf: 'start',
}

const pendingAmountStyle: React.CSSProperties = {
  gridColumn: '2 / 3',
  gridRow: '2 / 3',
  justifySelf: 'end',
  alignSelf: 'center',
  fontSize: 8.4,
  fontWeight: 800,
  color: TEXT,
  textAlign: 'right',
  whiteSpace: 'nowrap',
}

const pendingDueDateStyle: React.CSSProperties = {
  gridColumn: '1 / 3',
  gridRow: '3 / 4',
  justifySelf: 'start',
  marginTop: 9,
  fontSize: '0.8rem',
  lineHeight: '0.9rem',
  color: TEXT,
  whiteSpace: 'nowrap',
}

const paymentDetailsStyle: React.CSSProperties = {
  position: 'absolute',
  top: 720,
  left: CONTENT_LEFT,
  width: 260,
  zIndex: 1,
}

const termsStyle: React.CSSProperties = {
  position: 'absolute',
  top: 842,
  left: CONTENT_LEFT,
  width: 562,
  zIndex: 1,
}

const terms = [
  'This invoice is issued in accordance with the mutually agreed service agreement and chosen plan.',
  'The upfront is amount is required to start the service.',
  'The amount mentioned at the time of offer letter must be paid by you when you receive the job offer by our service or pre background check which confirms your employment.',
  'The percentage amount will be calculated on basis of your gross annual salary package in job offer you received by our services which will be due in 4 installments.',
  'Payments must be made as per the agreed payment plan',
  'For any clarifications, you may reach out to the support team.',
  'All services are governed by the signed agreement.',
]

const nameStyle: React.CSSProperties = { margin: '0 0 17px', fontSize: 16, fontWeight: 800, color: TEXT }
const dateStyle: React.CSSProperties = { margin: '0 0 15px', fontSize: 16, fontWeight: 800, color: TEXT }
const invoiceNoStyle: React.CSSProperties = { margin: '0 0 0', fontSize: 16, fontWeight: 400, color: TEXT, whiteSpace: 'nowrap' }
const smallLineStyle: React.CSSProperties = { margin: '0 0 5px', fontSize: 8.2, color: TEXT }
const emailLineStyle: React.CSSProperties = { ...smallLineStyle, color: '#0718D6', textDecoration: 'underline' }
const itemTextStyle: React.CSSProperties = { margin: 0, fontSize: 8.4, color: TEXT, fontWeight: 400 }
const commentLineStyle: React.CSSProperties = { margin: 0, fontSize: 8.4, lineHeight: '10.5px', color: TEXT, fontWeight: 700 }
const paymentLineStyle: React.CSSProperties = { margin: '0 0 4px', fontSize: 8.2, color: TEXT }
const termsHeadingStyle: React.CSSProperties = { margin: '0 0 5px', fontSize: 8.2, color: TEXT }
const termStyle: React.CSSProperties = { margin: '0 0 3px', fontSize: 7.4, lineHeight: '10px', color: TEXT }
