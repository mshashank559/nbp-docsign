'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SignatureModal from '@/components/ui/SignatureModal'
import { Document } from '@/lib/types'
import clsx from 'clsx'

interface Props {
  doc: Document
  signingUrl?: string
}

export default function NbpSignOff({ doc, signingUrl }: Props) {
  const router = useRouter()
  const sb     = createClient()

  const [showModal,  setShowModal]  = useState(false)
  const [signature,  setSignature]  = useState<string>(doc.nbg_signature ?? '')
  const [saving,     setSaving]     = useState(false)
  const [sending,    setSending]    = useState(false)
  const [resent,     setResent]     = useState(false)
  const [resending,  setResending]  = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [sendError,  setSendError]  = useState('')

  async function saveNbgSignature(sig: string) {
    setSaving(true)
    await sb.from('documents').update({ nbg_signature: sig }).eq('id', doc.id)
    await sb.from('audit_trail').insert({
      document_id: doc.id,
      event: 'NPB signature applied',
      actor: 'NPB team',
    })
    setSaving(false)
    setSignature(sig)
    setShowModal(false)
    router.refresh()
  }

  async function sendForSigning() {
    setSending(true)
    setSendError('')
    const res = await fetch('/api/compose-document-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: doc.id }),
    })
    setSending(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSendError(data.error || 'Email draft could not be prepared. Check server logs for details.')
      return
    }
    await openEmailDraftResponse(res, `netbounce_${doc.type}_${doc.client_name || 'document'}_draft.eml`)
    router.refresh()
  }

  async function resend() {
    setResending(true)
    setSendError('')
    const res = await fetch('/api/compose-document-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: doc.id }),
    })
    setResending(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSendError(data.error || 'Email draft could not be prepared. Check server logs for details.')
      return
    }
    await openEmailDraftResponse(res, `netbounce_${doc.type}_${doc.client_name || 'document'}_draft.eml`)
    setResent(true)
    setTimeout(() => setResent(false), 3000)
  }

  async function deleteDocument() {
    setDeleting(true)
    await sb.from('documents').delete().eq('id', doc.id)
    router.push('/dashboard')
  }

  const isDraft  = doc.status === 'draft'
  const isSent   = doc.status === 'sent' || doc.status === 'viewed'
  const isSigned = doc.status === 'signed'

  return (
    <div className="space-y-2">

      {/* NPB Signature block */}
      <div className="p-4 bg-surface rounded-xl border border-border mb-4">
        <p className="text-xs font-medium text-secondary uppercase tracking-wide mb-3">NPB Signature</p>
        {signature ? (
          <div className="space-y-2">
            <div className="border border-border rounded-lg p-3 bg-card flex items-center justify-between">
              <img src={signature} alt="NPB signature" className="max-h-10 max-w-36" />
              {!isSigned && (
                <button
                  onClick={() => setShowModal(true)}
                  className="text-xs text-muted hover:text-secondary underline"
                >
                  Change
                </button>
              )}
            </div>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              NBP has signed
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="w-full border-2 border-dashed border-border rounded-lg py-3 text-xs text-muted hover:border-brand-300 hover:text-secondary transition-colors"
          >
            + Add NBP signature
          </button>
        )}
      </div>

      {/* Primary action */}
      {isDraft && (
        <button
          onClick={sendForSigning}
          disabled={sending}
          className="w-full bg-brand-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-800 disabled:opacity-60 transition-colors"
        >
          {sending ? 'Preparing...' : 'Open Email Draft'}
        </button>
      )}

      {isSent && (
        <button
          onClick={resend}
          disabled={resending}
          className="w-full bg-brand-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-800 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1 6.5A5.5 5.5 0 1 0 12 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M9.5 4l3-1.5-1.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {resent ? 'Draft downloaded!' : resending ? 'Preparing...' : 'Open email draft'}
        </button>
      )}

      {sendError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {sendError}
        </p>
      )}

      {isSigned && (
        <a
          href={`/api/download-pdf?id=${doc.id}`}
          className="w-full bg-brand-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-800 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1.5v7M4 7l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1.5 10.5h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          Download signed PDF
        </a>
      )}

      {/* Delete */}
      {!isSigned && (
        <div className="pt-1">
          {confirmDel ? (
            <div className="border border-red-200 rounded-lg p-3 bg-red-50">
              <p className="text-xs text-red-700 mb-2 font-medium">Delete this document?</p>
              <div className="flex gap-2">
                <button
                  onClick={deleteDocument}
                  disabled={deleting}
                  className="flex-1 text-xs bg-red-600 text-white rounded-md py-1.5 hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDel(false)}
                  className="flex-1 text-xs border border-red-200 text-red-600 rounded-md py-1.5 hover:bg-red-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="w-full text-xs text-muted hover:text-red-500 py-1.5 transition-colors"
            >
              Delete document
            </button>
          )}
        </div>
      )}

      {showModal && (
        <SignatureModal
          name={doc.fields?.disclosingSignatoryName || 'NetBounce Placement LLP'}
          onConfirm={saveNbgSignature}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

async function openEmailDraftResponse(res: Response, filename: string) {
  const contentType = res.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    if (data.url) {
      const opened = window.open(data.url, '_blank', 'noopener,noreferrer')
      if (!opened) window.location.href = data.url
      return
    }
  }
  downloadBlob(await res.blob(), filename)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.replace(/[^\w.-]+/g, '_')
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
