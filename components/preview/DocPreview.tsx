'use client'

import { useEffect, useMemo, useState } from 'react'
import { DocType } from '@/lib/types'
import PreInvoiceTemplate from './PreInvoiceTemplate'
import SlotInvoiceTemplate from './SlotInvoiceTemplate'

interface Props {
  type: DocType
  fields: Record<string, string>
  clientName: string
  clientEmail?: string
  clientCompany?: string
  nbgSignature?: string
  clientSignature?: string
  readOnly?: boolean
  onFieldChange?: (name: string, value: string) => void
  onSignatureClick?: () => void
}

const STATIC_TEMPLATES: Partial<Record<DocType, string>> = {
  'pre-invoice': '/templates/pre-invoice.pdf',
  'slot-invoice-receipt': '/templates/slot-invoice-receipt.pdf',
  'final-invoice-receipt': '/templates/final-invoice-receipt.pdf',
  appointment: '/templates/letter-of-appointment.pdf',
  offer: '/templates/nb-offer-letter.pdf',
  confirmation: '/templates/confirmation-letter.pdf',
  'review-agreement': '/templates/review-agreement.pdf',
  'final-onboarding': '/templates/final-onboarding.pdf',
}

export default function DocPreview({ type, fields, clientName, clientEmail = '', clientCompany = '', clientSignature }: Props) {
  const [pdfUrl, setPdfUrl] = useState(STATIC_TEMPLATES[type] || '')
  const payload = useMemo(
    () => JSON.stringify({ type, fields, clientName, clientEmail, clientCompany, clientSignature }),
    [type, fields, clientName, clientEmail, clientCompany, clientSignature]
  )

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''

    async function loadFilledPdf() {
      const data = JSON.parse(payload)
      const hasValues =
        Object.values(data.fields || {}).some(value => String(value).trim()) ||
        String(data.clientName || '').trim() ||
        String(data.clientEmail || '').trim()

      if (!hasValues && STATIC_TEMPLATES[type]) {
        setPdfUrl(STATIC_TEMPLATES[type]!)
        return
      }

      const res = await fetch('/api/generated-preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })
      if (!res.ok) return
      const blob = await res.blob()
      objectUrl = URL.createObjectURL(blob)
      if (!cancelled) setPdfUrl(objectUrl)
    }

    loadFilledPdf()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [payload, type])

  if (type === 'pre-invoice') {
    return <PreInvoiceTemplate fields={fields} clientName={clientName} clientEmail={clientEmail} />
  }

  if (type === 'slot-invoice-receipt' || type === 'final-invoice-receipt') {
    return <SlotInvoiceTemplate type={type} fields={fields} clientName={clientName} clientEmail={clientEmail} />
  }

  return (
    <div style={{ background: '#e6ebf2', padding: '24px 0', minHeight: '100%' }}>
      <div
        style={{
          width: '794px',
          maxWidth: 'calc(100% - 32px)',
          aspectRatio: '1 / 1.4142',
          margin: '0 auto',
          background: 'white',
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16)',
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {pdfUrl ? (
          <iframe
            title={`${type} preview`}
            src={`${pdfUrl}#toolbar=0&navpanes=0&view=Fit`}
            style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        ) : (
          <div style={{ padding: 24, color: '#64748b', fontSize: 14 }}>Generating preview...</div>
        )}
        {clientSignature && type !== 'final-onboarding' && <CandidateSignatureBlock signature={clientSignature} />}
      </div>
    </div>
  )
}

function CandidateSignatureBlock({ signature }: { signature: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: '68%',
        bottom: '25%',
        zIndex: 2,
        width: 150,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <img
        src={signature}
        alt="Candidate Signature"
        style={{ width: 128, height: 48, objectFit: 'contain' }}
      />
    </div>
  )
}
