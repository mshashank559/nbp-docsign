'use client'
import { useEffect, useState } from 'react'
import { Document } from '@/lib/types'

export default function SignCompletePage({ params }: { params: { token: string } }) {
  const [doc, setDoc] = useState<Document | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    fetch(`/api/signing-document?token=${encodeURIComponent(params.token)}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(body => { if (body.document) setDoc(body.document as Document) })
      .catch(() => {})
  }, [params.token])

  async function emailCopy() {
    if (!doc) return
    setSendingEmail(true)
    await fetch('/api/email-copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: params.token }) })
    setSendingEmail(false)
    setEmailSent(true)
  }

  const signedDate = doc?.signed_at ? new Date(doc.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-brand-900 px-6 py-4 no-print">
        <p className="text-brand-200 text-xs font-bold">NetBounce Placement LLC</p>
        <p className="text-white text-sm font-bold">Document Signing Portal</p>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-50 border-2 border-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M7 14l5 5 9-9" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Document signed</h1>
            <p className="text-gray-500 text-sm mb-1">Thank you{doc?.client_name ? `, ${doc.client_name}` : ''}. Your signature has been recorded.</p>
            {signedDate && <p className="text-gray-400 text-xs">{signedDate}</p>}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-50"><p className="text-sm font-medium text-gray-900">What would you like to do?</p></div>
            <div className="divide-y divide-gray-50">
              <button onClick={() => window.print()} className="w-full flex items-center gap-3 px-6 py-4 text-sm text-gray-900 hover:bg-gray-50 transition-colors text-left">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="2.5" y="1" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 9H1.5A1 1 0 0 0 .5 10v3.5h14V10a1 1 0 0 0-1-1H12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><rect x="3.5" y="10" width="8" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                </div>
                <div><p className="font-medium">Print document</p><p className="text-xs text-gray-400">Print or save as PDF via your browser</p></div>
              </button>
              <a href={`/api/download-pdf?token=${params.token}`} target="_blank" className="w-full flex items-center gap-3 px-6 py-4 text-sm text-gray-900 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v8M5 8l2.5 2.5L10 8" stroke="#1A3C28" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12h11" stroke="#1A3C28" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </div>
                <div><p className="font-medium">Download PDF</p><p className="text-xs text-gray-400">Download the signed document</p></div>
              </a>
              <button onClick={emailCopy} disabled={sendingEmail || emailSent} className="w-full flex items-center gap-3 px-6 py-4 text-sm text-gray-900 hover:bg-gray-50 transition-colors text-left disabled:opacity-60">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x=".5" y="2.5" width="14" height="10" rx="1.5" stroke="#1D6FA4" strokeWidth="1.2"/><path d="m.5 3.5 7 5 7-5" stroke="#1D6FA4" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </div>
                <div><p className="font-medium">{emailSent ? 'Email sent!' : sendingEmail ? 'Sending…' : 'Email me a copy'}</p><p className="text-xs text-gray-400">Send to {doc?.client_email}</p></div>
              </button>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-xs text-green-800">
            <p className="font-medium mb-1">Confirmation</p>
            <p>A copy of this signed document has been sent to the NetBounce Placement team. Both parties will receive email confirmation.</p>
          </div>
          <p className="text-center text-xs text-gray-400 mt-5">Questions? <a href="mailto:enroll@netbounceplacement.com" className="text-brand-700 hover:underline">enroll@netbounceplacement.com</a></p>
        </div>
      </div>
    </div>
  )
}
