'use client'

import { useState } from 'react'

export default function GeneratedEmailButton({ documentId }: { documentId: string }) {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  async function openDraft() {
    setSending(true)
    setMessage('')
    try {
      const res = await fetch('/api/compose-document-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setMessage(data.error || 'Unable to prepare email draft.')
        return
      }
      await openEmailDraftResponse(res, 'netbounce_document_draft.eml')
      setMessage('Gmail draft opened with tracked document links.')
    } catch {
      setMessage('Unable to prepare email draft.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <button
        onClick={openDraft}
        disabled={sending}
        className="w-full rounded-lg border border-border text-xs font-bold py-2.5 text-foreground disabled:opacity-60"
      >
        {sending ? 'Preparing...' : 'Open email draft'}
      </button>
      {message && <p className="text-xs text-muted mt-2">{message}</p>}
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
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
