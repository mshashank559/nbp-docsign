'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AgreementPdfPreview from '@/components/preview/AgreementPdfPreview'
import DocPreview from '@/components/preview/DocPreview'
import DocumentActivityTracker from '@/components/ui/DocumentActivityTracker'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { Document } from '@/lib/types'

type CandidateFields = {
  candidate_name: string
  candidate_address: string
  candidate_phone: string
}

type SignMethod = 'type' | 'draw' | 'upload'
type SignatureFont = typeof SIGNATURE_FONTS[number]

const SIGNATURE_FONTS = [
  { label: 'Great Vibes', font: '"Great Vibes", cursive' },
  { label: 'Alex Brush', font: '"Alex Brush", cursive' },
  { label: 'Monsieur La Doulaise', font: '"Monsieur La Doulaise", cursive' },
] as const

export default function PublicSigningWizard({ doc }: { doc: Document }) {
  const router = useRouter()
  const [candidate, setCandidate] = useState<CandidateFields>({
    candidate_name: doc.fields?.candidate_name || doc.fields?.agreementName || doc.client_name || '',
    candidate_address: doc.fields?.candidate_address || doc.fields?.agreementAddress || '',
    candidate_phone: doc.fields?.candidate_phone || doc.fields?.agreementContact || '',
  })
  const [signMethod, setSignMethod] = useState<SignMethod>('type')
  const [signature, setSignature] = useState(doc.client_signature || '')
  const [confirmedSignature, setConfirmedSignature] = useState(Boolean(doc.client_signature))
  const [agreed, setAgreed] = useState(doc.status === 'signed')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isAgreement = doc.type === 'agreement'
  const title = DOCUMENT_TYPE_LABELS[doc.type] || doc.type
  const signed = doc.status === 'signed'

  const previewFields = useMemo(() => ({
    ...(doc.fields || {}),
    candidate_name: candidate.candidate_name,
    candidate_address: candidate.candidate_address,
    candidate_phone: candidate.candidate_phone,
    agreementName: candidate.candidate_name,
    agreementAddress: candidate.candidate_address,
    agreementContact: candidate.candidate_phone,
    receivingSignatoryName: candidate.candidate_name,
    receivingSignatoryDate: new Date().toISOString().slice(0, 10),
  }), [candidate, doc.fields])

  function updateCandidate(key: keyof CandidateFields, value: string) {
    setCandidate(prev => ({ ...prev, [key]: value }))
  }

  async function submitSignature() {
    if (signed) return
    setError('')
    setMessage('')

    if (!candidate.candidate_name.trim() || !candidate.candidate_address.trim() || !candidate.candidate_phone.trim()) {
      setError('Please complete your name, address, and contact number.')
      return
    }
    if (isAgreement && (!confirmedSignature || !signature)) {
      setError('Please confirm your signature before submitting.')
      return
    }
    if (isAgreement && !agreed) {
      setError('Please confirm that you agree to sign electronically.')
      return
    }

    setSubmitting(true)
    const res = await fetch('/api/document/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: doc.id,
        candidateName: candidate.candidate_name,
        candidateAddress: candidate.candidate_address,
        candidatePhone: candidate.candidate_phone,
        signature: isAgreement ? signature : '',
      }),
    })
    const body = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(body.error || 'Your signature was saved, but email delivery failed. Please contact NetBounce support.')
      setSubmitting(false)
      router.refresh()
      return
    }

    setMessage('Your signed document has been submitted. A copy will be sent to your email.')
    router.refresh()
  }

  return (
    <main style={{ minHeight: '100vh', background: '#dce2eb', display: 'flex', flexDirection: 'column' }}>
      <DocumentActivityTracker
        documentId={doc.id}
        actor={doc.client_email}
        source="signing"
        scrollContainerId="public-document-scroll"
      />

      <header style={{ height: 60, background: '#ffffff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#64748b' }}>NetBounce DocSign</p>
          <h1 style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
        </div>
        <a href={`/api/generated-document-pdf?id=${doc.id}`} target="_blank" style={{ flexShrink: 0, borderRadius: 8, background: '#111827', color: '#ffffff', padding: '10px 14px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Open PDF
        </a>
      </header>

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)' }}>
        <aside style={{ background: '#ffffff', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: isAgreement ? 'space-between' : 'center' }}>
          {isAgreement ? (
            <>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{signed ? 'Document signed' : 'Review and sign'}</p>
                <p style={{ margin: '0 0 18px', fontSize: 12, lineHeight: 1.5, color: '#64748b' }}>
                  Verify details and apply your signature.
                </p>

                <div style={{ display: 'grid', gap: 12 }}>
                  <Field label="Candidate Name" required>
                    <input value={candidate.candidate_name} disabled={signed} onChange={e => updateCandidate('candidate_name', e.target.value)} className="input" placeholder="Full legal name" />
                  </Field>
                  <Field label="Candidate Address" required>
                    <textarea value={candidate.candidate_address} disabled={signed} onChange={e => updateCandidate('candidate_address', e.target.value)} className="input" placeholder="Full address" rows={3} style={{ resize: 'vertical' }} />
                  </Field>
                  <Field label="Contact Number" required>
                    <input value={candidate.candidate_phone} disabled={signed} onChange={e => updateCandidate('candidate_phone', e.target.value)} className="input" placeholder="Phone number" />
                  </Field>
                </div>

                <div style={{ marginTop: 18, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Candidate Signature *</p>
                  <SignaturePad
                    method={signMethod}
                    onMethodChange={setSignMethod}
                    signerName={candidate.candidate_name}
                    disabled={signed}
                    value={signature}
                    onClear={() => {
                      setSignature('')
                      setConfirmedSignature(false)
                    }}
                    onConfirm={dataUrl => {
                      setSignature(dataUrl)
                      setConfirmedSignature(true)
                    }}
                  />
                </div>

                {!signed && (
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16, cursor: 'pointer' }}>
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 3 }} />
                    <span style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                      I agree that this electronic signature is legally binding and that the information above is accurate.
                    </span>
                  </label>
                )}
              </div>

              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  disabled={signed || submitting}
                  onClick={submitSignature}
                  style={{ width: '100%', border: 'none', borderRadius: 10, padding: '12px 14px', background: signed ? '#16a34a' : '#111827', color: '#ffffff', fontSize: 13, fontWeight: 800, cursor: signed || submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}
                >
                  {signed ? 'Signed Complete' : submitting ? 'Submitting...' : 'Submit & Sign'}
                </button>

                {error && <p style={{ margin: '12px 0 0', color: '#dc2626', fontSize: 12, lineHeight: 1.5 }}>{error}</p>}
                {message && <p style={{ margin: '12px 0 0', color: '#166534', fontSize: 12, lineHeight: 1.5 }}>{message}</p>}
              </div>
            </>
          ) : (
            <div style={{ width: '100%', border: '1px dashed #d1d5db', borderRadius: 12, background: '#f8fafc', padding: 24, textAlign: 'center' }}>
              <span aria-hidden="true" style={{ display: 'block', marginBottom: 12, fontSize: 30, lineHeight: 1 }}>PDF</span>
              <h3 style={{ margin: '0 0 4px', color: '#1f2937', fontSize: 14, fontWeight: 800 }}>Document View Only</h3>
              <p style={{ maxWidth: 220, margin: '0 auto', color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
                This document category is an informative template and does not require form responses or signature execution.
              </p>
            </div>
          )}
        </aside>

        <section id="public-document-scroll" style={{ minWidth: 0, overflowY: 'auto', position: 'relative' }}>
          <div style={{ minHeight: '100%' }}>
            {isAgreement ? (
              <AgreementPdfPreview fields={previewFields} clientName={candidate.candidate_name} clientSignature={signature || undefined} />
            ) : (
              <DocPreview
                type={doc.type}
                fields={previewFields}
                clientName={candidate.candidate_name || doc.client_name}
                clientEmail={doc.client_email}
                clientCompany={doc.client_company}
                nbgSignature={doc.nbg_signature ?? undefined}
                clientSignature={signature || undefined}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </span>
      {children}
    </label>
  )
}

function SignaturePad({
  method,
  onMethodChange,
  signerName,
  disabled,
  value,
  onClear,
  onConfirm,
}: {
  method: SignMethod
  onMethodChange: (method: SignMethod) => void
  signerName: string
  disabled?: boolean
  value: string
  onClear: () => void
  onConfirm: (dataUrl: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)
  const [typedName, setTypedName] = useState(signerName)
  const [typedFont, setTypedFont] = useState<SignatureFont>(SIGNATURE_FONTS[0])
  const [uploadedImage, setUploadedImage] = useState('')

  useEffect(() => {
    if (!value && signerName && !typedName.trim()) setTypedName(signerName)
  }, [signerName, typedName, value])

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    drawing.current = true
    last.current = point(event)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || disabled) return
    const canvas = canvasRef.current
    if (!canvas || !last.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const next = point(event)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(next.x, next.y)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    last.current = next
    setHasInk(true)
  }

  function stop() {
    drawing.current = false
    last.current = null
  }

  function clear() {
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    setUploadedImage('')
    onClear()
  }

  function confirm() {
    if (method === 'draw') {
      const canvas = canvasRef.current
      if (!canvas || !hasInk) return
      onConfirm(canvas.toDataURL('image/png'))
      return
    }

    if (method === 'type') {
      const name = typedName.trim() || signerName.trim()
      if (!name) return
      onConfirm(createTypedSignature(name, typedFont.font))
      return
    }

    if (method === 'upload' && uploadedImage) onConfirm(uploadedImage)
  }

  function handleUpload(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = event => {
      setUploadedImage(String(event.target?.result || ''))
      onClear()
    }
    reader.readAsDataURL(file)
  }

  const tabs: Array<{ key: SignMethod; label: string }> = [
    { key: 'type', label: 'Type' },
    { key: 'draw', label: 'Draw' },
    { key: 'upload', label: 'Upload' },
  ]
  const activePreview = value || uploadedImage
  const canConfirm = method === 'draw'
    ? hasInk
    : method === 'type'
      ? Boolean((typedName || signerName).trim())
      : Boolean(uploadedImage)

  return (
    <div>
      <style>{'@import url("https://fonts.googleapis.com/css2?family=Alex+Brush&family=Great+Vibes&family=Monsieur+La+Doulaise&display=swap");'}</style>
      {!disabled && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                onMethodChange(tab.key)
                clear()
              }}
              style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 999, padding: '8px 10px', background: method === tab.key ? '#0f172a' : '#f8fafc', color: method === tab.key ? '#ffffff' : '#475569', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {method === 'type' && !disabled && (
        <div style={{ display: 'grid', gap: 8 }}>
          <input
            value={typedName}
            onChange={event => {
              setTypedName(event.target.value)
              onClear()
            }}
            className="input"
            placeholder="Enter your name for signature"
          />
          <div style={{ display: 'grid', gap: 7 }}>
            {SIGNATURE_FONTS.map(font => (
              <button
                key={font.label}
                type="button"
                onClick={() => {
                  setTypedFont(font)
                  onClear()
                }}
                style={{ border: `2px solid ${typedFont.label === font.label ? '#0f172a' : '#e2e8f0'}`, borderRadius: 10, background: '#ffffff', padding: '9px 12px', minHeight: 48, textAlign: 'left', cursor: 'pointer' }}
              >
                <span style={{ fontFamily: font.font, fontSize: 27, lineHeight: 1, color: '#0f172a' }}>{typedName || signerName || 'Your Name'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {method === 'draw' && (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, overflow: 'hidden', background: '#ffffff', position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={560}
            height={180}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={stop}
            onPointerLeave={stop}
            style={{ display: 'block', width: '100%', height: 130, touchAction: 'none', cursor: disabled ? 'default' : 'crosshair' }}
          />
          {!hasInk && !activePreview && <p style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', margin: 0, color: '#94a3b8', fontSize: 13, pointerEvents: 'none' }}>Sign here</p>}
          {activePreview && <img src={activePreview} alt="Confirmed signature" style={{ position: 'absolute', inset: 8, width: 'calc(100% - 16px)', height: 'calc(100% - 16px)', objectFit: 'contain', background: '#ffffff' }} />}
        </div>
      )}

      {method === 'upload' && !disabled && (
        <div>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault()
              handleUpload(event.dataTransfer.files?.[0])
            }}
            style={{ border: '2px dashed #cbd5e1', borderRadius: 10, background: '#f8fafc', minHeight: 118, display: 'grid', placeItems: 'center', padding: 14, cursor: 'pointer' }}
          >
            {uploadedImage ? (
              <img src={uploadedImage} alt="Uploaded signature preview" style={{ maxWidth: '100%', maxHeight: 88, objectFit: 'contain' }} />
            ) : (
              <p style={{ margin: 0, color: '#64748b', fontSize: 12, textAlign: 'center', lineHeight: 1.5 }}>Drop signature image here<br />or click to upload</p>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={event => handleUpload(event.target.files?.[0])} />
        </div>
      )}

      {disabled && activePreview && (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, background: '#ffffff', padding: 10 }}>
          <img src={activePreview} alt="Confirmed signature" style={{ width: '100%', maxHeight: 90, objectFit: 'contain' }} />
        </div>
      )}

      {value && !disabled && method !== 'draw' && (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: 10, background: '#ffffff', padding: 10, marginTop: 8 }}>
          <img src={value} alt="Confirmed signature" style={{ width: '100%', maxHeight: 72, objectFit: 'contain' }} />
        </div>
      )}

      {!disabled && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {method === 'draw' && <button type="button" onClick={clear} style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: 8, background: '#ffffff', padding: '8px 10px', fontSize: 12, fontWeight: 700, color: '#475569' }}>Clear</button>}
          <button type="button" onClick={confirm} disabled={!canConfirm} style={{ flex: method === 'draw' ? 1 : undefined, width: method === 'draw' ? undefined : '100%', border: 'none', borderRadius: 8, background: '#0f172a', padding: '8px 10px', fontSize: 12, fontWeight: 800, color: '#ffffff', opacity: canConfirm ? 1 : 0.45 }}>Confirm Signature</button>
        </div>
      )}
    </div>
  )
}

function createTypedSignature(name: string, font: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 220
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#0f172a'
  ctx.font = `82px ${font}`
  ctx.textBaseline = 'middle'
  ctx.fillText(name, 28, 112)
  return canvas.toDataURL('image/png')
}
