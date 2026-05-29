'use client'

import { useEffect, useMemo, useState } from 'react'

const AGREEMENT_TEMPLATE_URL = '/templates/agreement-template.pdf'

export default function AgreementPdfPreview({
  fields = {},
  clientSignature,
  pdfUrlOverride,
}: {
  fields?: Record<string, string>
  clientName?: string
  clientSignature?: string
  onSignatureClick?: () => void
  pdfUrlOverride?: string
}) {
  const [pdfUrl, setPdfUrl] = useState(AGREEMENT_TEMPLATE_URL)
  const [error, setError] = useState('')
  const payload = useMemo(() => JSON.stringify(fields), [fields])

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    const currentFields = JSON.parse(payload) as Record<string, string>

    async function loadFilledPdf() {
      if (pdfUrlOverride) {
        setError('')
        setPdfUrl(pdfUrlOverride)
        return
      }

      const hasValues = Object.values(currentFields).some(value => value.trim())
      if (!hasValues) {
        setError('')
        setPdfUrl(AGREEMENT_TEMPLATE_URL)
        return
      }

      try {
        const res = await fetch('/api/agreement-preview-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: currentFields }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const message = body.error || ''
          if (!cancelled) setError(message || 'Unable to generate agreement preview.')
          return
        }
        const contentType = res.headers.get('Content-Type') || ''
        if (contentType.includes('application/json')) {
          const data = await res.json()
          if (!cancelled) {
            setError('')
            setPdfUrl(data.pdfUrl || AGREEMENT_TEMPLATE_URL)
          }
        } else {
          const blob = await res.blob()
          objectUrl = URL.createObjectURL(blob)
          if (!cancelled) {
            setError('')
            setPdfUrl(objectUrl)
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[AgreementPdfPreview] preview request failed', err)
          setError('Preview is temporarily unavailable. You can continue filling the agreement fields.')
        }
      }
    }

    const timer = setTimeout(() => {
      loadFilledPdf()
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [payload, pdfUrlOverride])

  return (
    <div style={{ background: '#dce2eb', padding: '28px 0', minHeight: '100%' }}>
      <div
        style={{
          width: '794px',
          maxWidth: 'calc(100% - 32px)',
          aspectRatio: '1 / 1.4142',
          margin: '0 auto',
          background: 'white',
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          borderRadius: '2px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <iframe
          title="Agreement template"
          src={`${pdfUrl}#toolbar=0&navpanes=0&view=FitH`}
          style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        />
        {clientSignature && <CandidateSignatureBlock signature={clientSignature} />}
        {error && (
          <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
            {error}
          </div>
        )}
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
