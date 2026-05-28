'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { Document } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import AgreementPdfPreview from '@/components/preview/AgreementPdfPreview'
import DocPreview from '@/components/preview/DocPreview'
import SignatureModal from '@/components/ui/SignatureModal'
import DocumentActivityTracker from '@/components/ui/DocumentActivityTracker'

export default function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const unwrappedParams = React.use(params)
  const token = unwrappedParams.token
  const router = useRouter()
  const searchParams = useSearchParams()
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [contact, setContact] = useState('')
  const [title, setTitle] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signaturePosition, setSignaturePosition] = useState({ x: 68, y: 72 })

  useEffect(() => {
    async function loadDoc() {
      const tracked = searchParams.get('tracked') === '1' ? '&tracked=1' : ''
      const res = await fetch(`/api/signing-document?token=${encodeURIComponent(token)}${tracked}`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.document) {
        setError(body.error || 'This signing link is invalid or has expired.')
        setLoading(false)
        return
      }

      const data = body.document as Document
      if (data.status === 'signed') {
        router.replace(`/sign/${token}/complete`)
        return
      }
      setDoc(data)
      setName(data.fields?.agreementName || data.fields?.receivingSignatoryName || data.client_name || '')
      setAddress(data.fields?.agreementAddress || '')
      setContact(data.fields?.agreementContact || '')
      setTitle(data.fields?.receivingSignatoryTitle || '')
      setLoading(false)
    }
    loadDoc()
  }, [token, router, searchParams])

  async function handleApprove() {
    const isSignedDoc = ['agreement', 'offer', 'appointment', 'final-onboarding'].includes(doc?.type || '')
    if (!doc || (isSignedDoc && !signature) || !agreed) return
    setSubmitting(true)
    setError('')

    const res = await fetch('/api/signing-document', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: token,
        signature: signature || 'reviewed',
        signatoryName: name,
        signatoryTitle: title,
        agreementAddress: address,
        agreementContact: contact,
        signaturePosition,
      }),
    })

    if (res.ok) {
      await fetch('/api/notify-signed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id, signatoryName: name, signatoryEmail: doc.client_email }),
      })
      router.push(`/sign/${token}/complete`)
      return
    }

    const body = await res.json().catch(() => ({}))
    setError(body.error || 'Unable to submit signature. Please try again.')
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="w-8 h-8 border-2 border-brand-700 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div><p className="text-gray-400 text-sm">Loading document...</p></div>
    </div>
  )

  if (error && !doc) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="max-w-sm text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 6v4M10 14h.01" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="10" r="8" stroke="#dc2626" strokeWidth="1.5"/></svg>
        </div>
        <h1 className="text-base font-bold text-gray-900 mb-2">Link unavailable</h1>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  )

  if (!doc) return null
  const isAgreement = doc.type === 'agreement'
  const isSignedDoc = ['agreement', 'offer', 'appointment', 'final-onboarding'].includes(doc.type)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <DocumentActivityTracker token={token} actor={doc.client_email} source="signing" scrollContainerId="signing-document-scroll" trackOpen={false} />
      <div className="bg-brand-900 px-6 py-4 flex items-center justify-between no-print">
        <div><p className="text-brand-200 text-xs font-bold">NetBounce Placement LLC</p><p className="text-white text-sm font-bold">Document Signing Portal</p></div>
        <span className="text-brand-200 text-xs">{DOCUMENT_TYPE_LABELS[doc.type] || doc.type}</span>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 min-w-72 bg-white border-r border-gray-100 overflow-y-auto flex flex-col no-print">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-1">{isSignedDoc ? 'Your signature required' : 'Review Document'}</h2>
            <p className="text-xs text-gray-500">{isSignedDoc ? 'Review the full document, place your signature, then submit.' : 'Please review the document details on the right. Once read, check the box below and complete the review.'}</p>
          </div>
          <div className="p-6 flex-1">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1.5">Full legal name <span className="text-red-400">*</span></label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700" placeholder="Your full name" />
              </div>
              {isAgreement && <>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1.5">Address <span className="text-red-400">*</span></label>
                  <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700" placeholder="Your full address" rows={3} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1.5">Contact number <span className="text-red-400">*</span></label>
                  <input type="tel" value={contact} onChange={e => setContact(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700" placeholder="Your contact number" />
                </div>
              </>}
              {!isAgreement && isSignedDoc && <div>
                <label className="block text-xs font-medium text-gray-900 mb-1.5">Title / designation <span className="text-red-400">*</span></label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-700" placeholder="e.g. Owner, Partner" />
              </div>}
            </div>
            {isSignedDoc && (
              <>
                <p className="text-xs font-medium text-gray-900 mb-2">{isAgreement ? 'Custom Sign' : 'Your signature'} <span className="text-red-400">*</span></p>
                <div onClick={() => setShowModal(true)} className="w-full border-2 border-dashed border-gray-200 rounded-xl p-4 mb-5 cursor-pointer hover:border-brand-300 transition-colors min-h-20 flex items-center justify-center">
                  {signature ? <img src={signature} alt="signature" className="max-h-16 max-w-full" /> : <div className="text-center"><p className="text-gray-300 text-sm mb-1">Click to add signature</p><p className="text-gray-200 text-xs">Type name, draw, or upload</p></div>}
                </div>
              </>
            )}
            <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 accent-brand-700" />
              <span className="text-xs text-gray-500 leading-relaxed">{isSignedDoc ? 'I have read and agree to the terms of this document. I understand this constitutes a legally binding electronic signature.' : 'I have reviewed and downloaded this document.'}</span>
            </label>
            <button onClick={handleApprove} disabled={(isSignedDoc && !signature) || !name || (isAgreement && (!address || !contact)) || (!isAgreement && isSignedDoc && !title) || !agreed || submitting} className="w-full bg-brand-900 text-white py-3 rounded-xl text-sm font-bold hover:bg-brand-800 disabled:opacity-40 transition-colors">
              {submitting ? 'Submitting...' : (isSignedDoc ? 'Submit signed document' : 'Complete Review')}
            </button>
            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
            {isSignedDoc && <p className="text-xs text-gray-400 leading-relaxed mt-3">Drag the signature on the document preview to place it where you want it before submitting.</p>}
          </div>
        </div>
        <div id="signing-document-scroll" className="flex-1 overflow-y-auto relative">
          {isAgreement ? (
            <AgreementPdfPreview
              fields={{ ...doc.fields, agreementName: name, agreementAddress: address, agreementContact: contact, receivingSignatoryName: name }}
              clientName={doc.client_name}
              onSignatureClick={() => setShowModal(true)}
            />
          ) : (
            <DocPreview type={doc.type} fields={{ ...doc.fields, receivingSignatoryName: name, receivingSignatoryTitle: title }} clientName={doc.client_name} nbgSignature={doc.nbg_signature ?? undefined} readOnly onSignatureClick={() => setShowModal(true)} />
          )}
          {isSignedDoc && signature && (
            <DraggableSignature
              src={signature}
              position={signaturePosition}
              onChange={setSignaturePosition}
            />
          )}
          {isSignedDoc && !signature && (
            <button
              onClick={() => setShowModal(true)}
              className="absolute left-1/2 bottom-8 z-20 -translate-x-1/2 rounded-xl border-2 border-dashed border-brand-700 bg-white px-8 py-4 text-sm font-bold text-brand-900 shadow-lg no-print hover:bg-brand-50"
            >
              {doc.fields?.signatureBoxLabel || 'Sign Here'}
            </button>
          )}
        </div>
      </div>
      {showModal && <SignatureModal name={name} onConfirm={sig => { setSignature(sig); setShowModal(false) }} onCancel={() => setShowModal(false)} />}
    </div>
  )
}

function DraggableSignature({
  src,
  position,
  onChange,
}: {
  src: string
  position: { x: number; y: number }
  onChange: (position: { x: number; y: number }) => void
}) {
  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.currentTarget
    const parent = target.parentElement
    if (!parent) return
    target.setPointerCapture(event.pointerId)
    const rect = parent.getBoundingClientRect()
    const box = target.getBoundingClientRect()
    const offsetX = event.clientX - box.left
    const offsetY = event.clientY - box.top

    const move = (moveEvent: PointerEvent) => {
      const x = ((moveEvent.clientX - rect.left - offsetX) / rect.width) * 100
      const y = ((moveEvent.clientY - rect.top - offsetY) / rect.height) * 100
      onChange({
        x: Math.min(86, Math.max(4, x)),
        y: Math.min(88, Math.max(8, y)),
      })
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  return (
    <div
      onPointerDown={startDrag}
      className="absolute z-20 cursor-move rounded-lg border-2 border-brand-700 bg-white/80 p-2 shadow-lg no-print"
      style={{ left: `${position.x}%`, top: `${position.y}%`, width: 150 }}
      title="Drag to place signature"
    >
      <img src={src} alt="Placed signature" className="max-h-14 w-full object-contain pointer-events-none" />
    </div>
  )
}
