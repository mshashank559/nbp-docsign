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
  candidate_dob: string
  candidate_ssn: string
  candidate_email: string
  candidate_current_address: string
  candidate_past_address: string
  candidate_address_dates: string
  candidate_university: string
  candidate_degree: string
  candidate_grad_dates: string
  candidate_bank_name: string
  candidate_bank_routing: string
  candidate_bank_account: string
  attachment_ead_front: string
  attachment_ead_back: string
  attachment_dl_front: string
  attachment_dl_back: string
  attachment_void_check: string
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
    candidate_dob: doc.fields?.candidate_dob || '',
    candidate_ssn: doc.fields?.candidate_ssn || '',
    candidate_email: doc.fields?.candidate_email || doc.client_email || '',
    candidate_current_address: doc.fields?.candidate_current_address || '',
    candidate_past_address: doc.fields?.candidate_past_address || '',
    candidate_address_dates: doc.fields?.candidate_address_dates || '',
    candidate_university: doc.fields?.candidate_university || '',
    candidate_degree: doc.fields?.candidate_degree || '',
    candidate_grad_dates: doc.fields?.candidate_grad_dates || '',
    candidate_bank_name: doc.fields?.candidate_bank_name || '',
    candidate_bank_routing: doc.fields?.candidate_bank_routing || '',
    candidate_bank_account: doc.fields?.candidate_bank_account || '',
    attachment_ead_front: doc.fields?.attachment_ead_front || '',
    attachment_ead_back: doc.fields?.attachment_ead_back || '',
    attachment_dl_front: doc.fields?.attachment_dl_front || '',
    attachment_dl_back: doc.fields?.attachment_dl_back || '',
    attachment_void_check: doc.fields?.attachment_void_check || '',
  })
  const [signMethod, setSignMethod] = useState<SignMethod>('type')
  const [signature, setSignature] = useState(doc.client_signature || '')
  const [confirmedSignature, setConfirmedSignature] = useState(Boolean(doc.client_signature))
  const [agreed, setAgreed] = useState(doc.status === 'signed')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const requiresSignature = doc.type === 'agreement' || doc.type === 'final-onboarding'
  const title = DOCUMENT_TYPE_LABELS[doc.type] || doc.type
  const signed = doc.status === 'signed'

  const previewFields = useMemo(() => ({
    ...(doc.fields || {}),
    ...candidate,
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

    if (doc.type === 'final-onboarding') {
      if (
        !candidate.candidate_name.trim() ||
        !candidate.candidate_dob.trim() ||
        !candidate.candidate_ssn.trim() ||
        !candidate.candidate_email.trim() ||
        !candidate.candidate_current_address.trim() ||
        !candidate.candidate_past_address.trim() ||
        !candidate.candidate_address_dates.trim() ||
        !candidate.candidate_university.trim() ||
        !candidate.candidate_degree.trim() ||
        !candidate.candidate_grad_dates.trim() ||
        !candidate.candidate_bank_name.trim() ||
        !candidate.candidate_bank_routing.trim() ||
        !candidate.candidate_bank_account.trim()
      ) {
        setError('Please complete all candidate and banking details.')
        return
      }
      if (
        !candidate.attachment_ead_front ||
        !candidate.attachment_ead_back ||
        !candidate.attachment_dl_front ||
        !candidate.attachment_dl_back ||
        !candidate.attachment_void_check
      ) {
        setError('Please upload all required attachments (EAD, Driver License, Voided Check).')
        return
      }
    } else {
      if (!candidate.candidate_name.trim() || !candidate.candidate_address.trim() || !candidate.candidate_phone.trim()) {
        setError('Please complete your name, address, and contact number.')
        return
      }
    }

    if (requiresSignature && (!confirmedSignature || !signature)) {
      setError('Please confirm your signature before submitting.')
      return
    }
    if (requiresSignature && !agreed) {
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
        candidateAddress: doc.type === 'final-onboarding' ? candidate.candidate_current_address : candidate.candidate_address,
        candidatePhone: doc.type === 'final-onboarding' ? '' : candidate.candidate_phone,
        signature: requiresSignature ? signature : '',
        onboardingFields: doc.type === 'final-onboarding' ? {
          candidate_name: candidate.candidate_name,
          candidate_dob: candidate.candidate_dob,
          candidate_ssn: candidate.candidate_ssn,
          candidate_email: candidate.candidate_email,
          candidate_current_address: candidate.candidate_current_address,
          candidate_past_address: candidate.candidate_past_address,
          candidate_address_dates: candidate.candidate_address_dates,
          candidate_university: candidate.candidate_university,
          candidate_degree: candidate.candidate_degree,
          candidate_grad_dates: candidate.candidate_grad_dates,
          candidate_bank_name: candidate.candidate_bank_name,
          candidate_bank_routing: candidate.candidate_bank_routing,
          candidate_bank_account: candidate.candidate_bank_account,
          attachment_ead_front: candidate.attachment_ead_front,
          attachment_ead_back: candidate.attachment_ead_back,
          attachment_dl_front: candidate.attachment_dl_front,
          attachment_dl_back: candidate.attachment_dl_back,
          attachment_void_check: candidate.attachment_void_check,
        } : null
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
        <aside style={{ background: '#ffffff', borderRight: '1px solid #e5e7eb', overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: requiresSignature ? 'space-between' : 'center' }}>
          {requiresSignature ? (
            <>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{signed ? 'Document signed' : 'Review and sign'}</p>
                <p style={{ margin: '0 0 18px', fontSize: 12, lineHeight: 1.5, color: '#64748b' }}>
                  Verify details and apply your signature.
                </p>

                {doc.type === 'final-onboarding' ? (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <p style={{ margin: '10px 0 2px', fontSize: 13, fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>Personal Information</p>
                    <Field label="Full Legal Name" required>
                      <input value={candidate.candidate_name} disabled={signed} onChange={e => updateCandidate('candidate_name', e.target.value)} className="input" placeholder="Full legal name" />
                    </Field>
                    <Field label="Date of Birth" required>
                      <input value={candidate.candidate_dob} disabled={signed} onChange={e => updateCandidate('candidate_dob', e.target.value)} className="input" placeholder="MM/DD/YYYY" />
                    </Field>
                    <Field label="Social Security Number (SSN)" required>
                      <input value={candidate.candidate_ssn} disabled={signed} onChange={e => updateCandidate('candidate_ssn', e.target.value)} className="input" placeholder="XXX-XX-XXXX" />
                    </Field>
                    <Field label="Email Address" required>
                      <input value={candidate.candidate_email} disabled={signed} onChange={e => updateCandidate('candidate_email', e.target.value)} className="input" placeholder="Email address" />
                    </Field>

                    <p style={{ margin: '10px 0 2px', fontSize: 13, fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>Address &amp; Education</p>
                    <Field label="Current Physical Address" required>
                      <textarea value={candidate.candidate_current_address} disabled={signed} onChange={e => updateCandidate('candidate_current_address', e.target.value)} className="input" placeholder="Current address" rows={2} style={{ resize: 'vertical' }} />
                    </Field>
                    <Field label="Past 7 Years Address" required>
                      <textarea value={candidate.candidate_past_address} disabled={signed} onChange={e => updateCandidate('candidate_past_address', e.target.value)} className="input" placeholder="Previous addresses (last 7 years)" rows={2} style={{ resize: 'vertical' }} />
                    </Field>
                    <Field label="Started Living to Ending Dates" required>
                      <input value={candidate.candidate_address_dates} disabled={signed} onChange={e => updateCandidate('candidate_address_dates', e.target.value)} className="input" placeholder="e.g. 2018 - 2024" />
                    </Field>
                    <Field label="University Name and Zip Code" required>
                      <input value={candidate.candidate_university} disabled={signed} onChange={e => updateCandidate('candidate_university', e.target.value)} className="input" placeholder="University &amp; Zip" />
                    </Field>
                    <Field label="Degree Obtained" required>
                      <input value={candidate.candidate_degree} disabled={signed} onChange={e => updateCandidate('candidate_degree', e.target.value)} className="input" placeholder="Degree name" />
                    </Field>
                    <Field label="Graduation Start to End (MM/YYYY)" required>
                      <input value={candidate.candidate_grad_dates} disabled={signed} onChange={e => updateCandidate('candidate_grad_dates', e.target.value)} className="input" placeholder="MM/YYYY - MM/YYYY" />
                    </Field>

                    <p style={{ margin: '10px 0 2px', fontSize: 13, fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>Banking Details</p>
                    <Field label="Bank Name" required>
                      <input value={candidate.candidate_bank_name} disabled={signed} onChange={e => updateCandidate('candidate_bank_name', e.target.value)} className="input" placeholder="Bank Name" />
                    </Field>
                    <Field label="Routing Number" required>
                      <input value={candidate.candidate_bank_routing} disabled={signed} onChange={e => updateCandidate('candidate_bank_routing', e.target.value)} className="input" placeholder="9-digit Routing Number" />
                    </Field>
                    <Field label="Account Number" required>
                      <input value={candidate.candidate_bank_account} disabled={signed} onChange={e => updateCandidate('candidate_bank_account', e.target.value)} className="input" placeholder="Account Number" />
                    </Field>

                    <p style={{ margin: '10px 0 2px', fontSize: 13, fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>Required Attachments</p>
                    <FileUploadField label="EAD Card Front" value={candidate.attachment_ead_front} onChange={val => updateCandidate('attachment_ead_front', val)} disabled={signed} />
                    <FileUploadField label="EAD Card Back" value={candidate.attachment_ead_back} onChange={val => updateCandidate('attachment_ead_back', val)} disabled={signed} />
                    <FileUploadField label="Driver License Front" value={candidate.attachment_dl_front} onChange={val => updateCandidate('attachment_dl_front', val)} disabled={signed} />
                    <FileUploadField label="Driver License Back" value={candidate.attachment_dl_back} onChange={val => updateCandidate('attachment_dl_back', val)} disabled={signed} />
                    <FileUploadField label="Voided Check" value={candidate.attachment_void_check} onChange={val => updateCandidate('attachment_void_check', val)} disabled={signed} />
                  </div>
                ) : (
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
                )}

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
            {doc.type === 'agreement' ? (
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

function FileUploadField({
  label,
  value,
  onChange,
  disabled
}: {
  label: string
  value: string
  onChange: (base64: string) => void
  disabled?: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      onChange(String(ev.target?.result || ''))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ display: 'block', marginBottom: 5, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
        {label} <span style={{ color: '#dc2626' }}>*</span>
      </span>
      <div 
        onClick={() => !disabled && fileInputRef.current?.click()}
        style={{
          border: '1px dashed #cbd5e1',
          borderRadius: 8,
          background: '#f8fafc',
          padding: '10px 14px',
          cursor: disabled ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12
        }}
      >
        <span style={{ color: value ? '#16a34a' : '#64748b', fontWeight: value ? '700' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
          {value ? '✓ Uploaded Successfully' : 'Choose file or image...'}
        </span>
        {!disabled && (
          <button 
            type="button" 
            style={{ border: 'none', background: '#e2e8f0', color: '#0f172a', padding: '4px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}
          >
            Browse
          </button>
        )}
      </div>
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*,application/pdf" 
        hidden 
        disabled={disabled}
        onChange={handleFile} 
      />
    </div>
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

  useEffect(() => {
    if (method === 'type' && !disabled) {
      const name = typedName.trim() || signerName.trim()
      if (name) {
        const dataUrl = createTypedSignature(name, typedFont.font)
        onConfirm(dataUrl)
      } else {
        onClear()
      }
    }
  }, [method, typedName, typedFont, signerName, disabled, onConfirm, onClear])

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
