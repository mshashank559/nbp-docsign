'use client'

import type React from 'react'

type Props = {
  fields: Record<string, string>
  clientName: string
  clientEmail?: string
}

const PAGE_WIDTH = 794
const PAGE_HEIGHT = 1123
const PURPLE = '#c5c3f4'
const HEADER_GRADIENT = 'linear-gradient(90deg, #f8f8fc 0%, #b8bcf7 28%, #5b67f0 62%, #1E3AFA 100%)'
const EMBLEM_BLUE = '#1230E7'
const TEXT = '#050505'

export default function PreInvoiceTemplate({ fields, clientName, clientEmail = '' }: Props) {
  const v = getPreInvoiceValues(fields, clientName, clientEmail)

  return (
    <div style={{ background: '#e6ebf2', padding: '24px 0', minHeight: '100%', overflowX: 'auto' }}>
      <article
        aria-label="Pre-Invoice preview"
        style={{
          position: 'relative',
          width: PAGE_WIDTH,
          minHeight: PAGE_HEIGHT,
          margin: '0 auto',
          background: '#FFFFFF',
          color: TEXT,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
          overflow: 'hidden',
          fontFamily: 'Inter, Roboto, Arial, Helvetica, sans-serif',
          fontSize: 10,
          lineHeight: 1.35,
          isolation: 'isolate',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#FFFFFF' }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Header />

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.05fr 1fr',
              columnGap: 58,
              padding: '60px 54px 0',
              alignItems: 'start',
            }}
          >
            <InfoBlock label="Invoice to:" align="left">
              <p style={nameStyle}>{v.candidateName}</p>
              <p style={smallLineStyle}>{v.candidateEmail}</p>
              <p style={smallLineStyle}>{v.candidatePhone}</p>
            </InfoBlock>

            <InfoBlock label="Date:" align="left">
              <p style={nameStyle}>{v.date}</p>
              <div style={{ height: 15 }} />
              <p style={smallLineStyle}>Netbounce Placement LLC</p>
              <p style={{ ...smallLineStyle, color: '#0718d6', textDecoration: 'underline' }}>billingsupport@netbounceplacement.com</p>
              <p style={smallLineStyle}>2404, 1007 N Orange St. 4th Floor ,</p>
              <p style={smallLineStyle}>Wilmington, DE, New Castle, US, 19801</p>
            </InfoBlock>

            <InfoBlock label="Invoice number:" align="right">
              <p style={{ ...valueStyle, textAlign: 'right', marginTop: 13 }}>{v.invoiceNo}</p>
            </InfoBlock>
          </section>

          <section style={{ padding: '40px 54px 0' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.25fr 0.58fr',
                alignItems: 'center',
                height: 49,
                background: PURPLE,
                borderRadius: 4,
                padding: '0 16px',
                color: TEXT,
                fontSize: 8,
              }}
            >
              <span>Item:</span>
              <span style={{ textAlign: 'center' }}>Deliverables:</span>
              <span style={{ textAlign: 'center' }}>Cost:(US $)</span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1.25fr 0.58fr',
                columnGap: 16,
                padding: '13px 16px 0',
                minHeight: 56,
                color: TEXT,
              }}
            >
              <div>
                <p style={itemTextStyle}>{v.packName}</p>
              </div>
              <div>
                <p style={{ ...itemTextStyle, textAlign: 'left' }}>{v.deliverables}</p>
              </div>
              <div>
                <p style={{ ...itemTextStyle, textAlign: 'center' }}>{v.packAmount}</p>
              </div>
            </div>
          </section>

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 256px',
              columnGap: 64,
              padding: '0 54px',
              alignItems: 'start',
            }}
          >
            <div style={{ paddingLeft: 16 }}>
              <p style={commentStyle}>{v.upfrontDetails}</p>
              <p style={commentStyle}>{v.remainingDetails}</p>
              <p style={commentStyle}>{v.termsCommentLine1}</p>
              <p style={commentStyle}>{v.termsCommentLine2}</p>
            </div>

            <div style={{ paddingTop: 28 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  alignItems: 'center',
                  height: 40,
                  background: PURPLE,
                  borderRadius: 5,
                  padding: '0 9px',
                }}
              >
                <span style={{ fontSize: 8, fontWeight: 700 }}>Total Pending</span>
                <strong style={{ fontSize: 8, textAlign: 'center' }}>{v.pendingAmount}</strong>
              </div>
            </div>
          </section>

          <section style={{ padding: '34px 54px 0' }}>
            <p style={paymentStyle}>Payment Details:</p>
            <p style={paymentStyle}>Account Name: Netbounce Placement LLC</p>
            <p style={paymentStyle}>Bank Name: Choice Financial Group</p>
            <p style={paymentStyle}>Account Number: 202302824963</p>
            <p style={paymentStyle}>Routing Number: 091311229</p>
          </section>

          <section style={{ position: 'absolute', left: 54, right: 54, top: 926 }}>
            <p style={termsHeadingStyle}>Terms & Conditions:</p>
            {[
              'This invoice is issued in accordance with the mutually agreed service agreement and chosen plan.',
              'The upfront is amount is required to start the service.',
              'The amount mentioned at the time of offer letter must be paid by you when you receive the job offer by our service or pre background check which confirms your employment.',
              'The percentage amount will be calculated on basis of your gross annual salary package in job offer you received by our services which will be due in 4 installments.',
            ].map(term => (
              <p key={term} style={termStyle}>• {term}</p>
            ))}
          </section>
        </div>
      </article>
    </div>
  )
}

function Header() {
  return (
    <header style={{ position: 'relative', height: 250, margin: 0, padding: 0, width: '100%' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          height: 150,
          background: HEADER_GRADIENT,
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 40,
          width: 130,
          height: 130,
          borderRadius: '50%',
          background: EMBLEM_BLUE,
          color: '#fff',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
          lineHeight: 1,
        }}
      >
        <div style={{ fontSize: 39, fontWeight: 800, letterSpacing: -3 }}>NB</div>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>NETBOUNCE</div>
        <div style={{ fontSize: 7, letterSpacing: 3.5, marginTop: 7 }}>PLACEMENT LLC</div>
      </div>
      <h1
        style={{
          position: 'absolute',
          right: 54,
          top: 54,
          zIndex: 3,
          margin: 0,
          color: '#fff',
          fontSize: 42,
          fontWeight: 400,
          letterSpacing: '0.12em',
        }}
      >
        INVOICE
      </h1>
    </header>
  )
}

function InfoBlock({ label, align, children }: { label: string; align: 'left' | 'right'; children: React.ReactNode }) {
  return (
    <div style={{ textAlign: align }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: label === 'Invoice number:' ? 84 : 58,
          height: 22,
          padding: '0 7px',
          borderRadius: 3,
          background: PURPLE,
          color: TEXT,
          fontSize: 8,
        }}
      >
        {label}
      </span>
      <div style={{ marginTop: 15 }}>{children}</div>
    </div>
  )
}

function getPreInvoiceValues(fields: Record<string, string>, clientName: string, clientEmail: string) {
  const terms = value(fields, 'terms_comment') || '8% of your gross annual salary package in 4 installments calculated as per offer letter'
  const termsLines = splitComment(terms)

  return {
    candidateName: value(fields, 'candidate_name', 'candidateName') || clientName || 'Xyz Sharma',
    candidateEmail: value(fields, 'candidate_email', 'candidateEmail') || clientEmail || 'xyz.sharma@needjob.com',
    candidatePhone: value(fields, 'candidate_phone', 'candidatePhone') || '+91 66996 96969',
    date: formatLongDate(value(fields, 'date', 'invoiceDate')) || '27 March 2026',
    invoiceNo: value(fields, 'invoice_no', 'invoiceNumber') || 'INV/26/001',
    packName: value(fields, 'pack_name', 'packName') || 'Starter Plan:',
    deliverables: value(fields, 'deliverables', 'comments') || 'As per the services mentioned in pricing document',
    packAmount: formatMoney(value(fields, 'pack_amount', 'packAmount')) || '$ 5000.00',
    upfrontDetails: value(fields, 'upfront_details') || '$3000 upfront,',
    remainingDetails: value(fields, 'remaining_details') || '$2500 payable when offer letter is received,',
    termsCommentLine1: termsLines[0],
    termsCommentLine2: termsLines[1] || '',
    advanceAmount: formatMoney(value(fields, 'advance_amount')) || '$ 500.00',
    pendingAmount: formatMoney(value(fields, 'pending_amount')) || '$ 4500.00',
  }
}

function value(fields: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const item = fields[key]
    if (item !== undefined && String(item).trim()) return String(item).trim()
  }
  return ''
}

function splitComment(text: string) {
  if (text.length <= 48) return [text]
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = `${line} ${word}`.trim()
    if (next.length > 48 && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, 2)
}

function formatLongDate(raw?: string) {
  if (!raw) return ''
  const date = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

function formatMoney(raw?: string) {
  if (!raw) return ''
  if (raw.includes('$')) return raw
  const amount = Number(raw.replace(/[^0-9.-]/g, ''))
  if (!Number.isFinite(amount)) return raw
  return `$ ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`
}

const nameStyle: React.CSSProperties = { margin: '0 0 17px', fontSize: 16, fontWeight: 800, color: TEXT }
const valueStyle: React.CSSProperties = { margin: 0, fontSize: 16, color: TEXT }
const smallLineStyle: React.CSSProperties = { margin: '0 0 5px', fontSize: 8.2, color: TEXT }
const itemTextStyle: React.CSSProperties = { margin: 0, fontSize: 9.2, color: TEXT }
const commentStyle: React.CSSProperties = { margin: 0, fontSize: 8.6, lineHeight: '12px', color: TEXT, fontWeight: 400 }
const paymentStyle: React.CSSProperties = { margin: '0 0 4px', fontSize: 8.2, color: TEXT }
const termsHeadingStyle: React.CSSProperties = { margin: '0 0 5px', fontSize: 8.2, color: TEXT }
const termStyle: React.CSSProperties = { margin: '0 0 3px', fontSize: 7.4, lineHeight: '10px', color: TEXT }
