'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Document, STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { getEffectiveDocType } from '@/lib/document-normalize'
import { requiresSignatureType } from '@/lib/document-workflow'
import AgreementPdfPreview from '@/components/preview/AgreementPdfPreview'
import DocPreview from '@/components/preview/DocPreview'
import GeneratedEmailButton from '@/components/ui/GeneratedEmailButton'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'

interface Props {
  doc: Document
  audit: any[]
  signingUrl?: string
}

export default function DocumentDetailClient({ doc, audit }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const effectiveType = getEffectiveDocType(doc)
  const requiresSignature = requiresSignatureType(effectiveType)

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left info panel */}
      <div className="w-72 min-w-72 bg-white dark:bg-brand-900 border-r border-gray-100 dark:border-gray-800 overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <Link href="/dashboard" className="text-brand-700 dark:text-brand-200 text-xs font-medium hover:underline mb-3 inline-block">
            ← Back
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', `type-${effectiveType}`)}>{effectiveType}</span>
            <span className={clsx('text-xs font-medium px-2.5 py-0.5 rounded-full', STATUS_COLORS[doc.status])}>
              {STATUS_LABELS[doc.status]}
            </span>
          </div>
          <h1 className="text-base font-bold text-brand-900 dark:text-white">
            {DOCUMENT_TYPE_LABELS[effectiveType] || effectiveType}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Created {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
          </p>
        </div>

        <div className="p-6 border-b border-gray-100 dark:border-gray-800 space-y-4">
          <InfoBlock label="Client" value={doc.client_name} sub={doc.client_email} />
          {doc.client_company && <InfoBlock label="Company" value={doc.client_company} />}
          {doc.sent_at && <InfoBlock label="Sent" value={format(new Date(doc.sent_at), 'MMM d, yyyy h:mm a')} />}
          {doc.signed_at && <InfoBlock label="Signed" value={format(new Date(doc.signed_at), 'MMM d, yyyy h:mm a')} />}
        </div>

        {!requiresSignature && (
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 space-y-2">
            <a href={`/api/generated-document-pdf?id=${doc.id}`} target="_blank" className="block w-full text-center bg-brand-900 text-white text-xs font-bold py-2.5 rounded-lg">
              Preview / Download PDF
            </a>
            <GeneratedEmailButton documentId={doc.id} />
          </div>
        )}

        {/* Audit trail */}
        {audit.length > 0 && (
          <div className="p-6 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">Activity</p>
            <div className="space-y-3">
              {audit.map((entry: any) => (
                <div key={entry.id} className="flex gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-200 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs text-brand-900 dark:text-white font-medium">{entry.event}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="p-6 mt-auto">
          <DeleteDocButton id={doc.id} onDeleted={() => router.push('/dashboard')} supabase={supabase} />
        </div>
      </div>

      {/* Document preview */}
      <div className="flex-1 bg-gray-100 overflow-y-auto">
        {requiresSignature ? (
          <AgreementPdfPreview fields={doc.fields} clientName={doc.client_name} clientSignature={doc.client_signature ?? undefined} />
        ) : (
          <DocPreview
            type={effectiveType}
            fields={doc.fields}
            clientName={doc.client_name}
            nbgSignature={doc.nbg_signature ?? undefined}
            clientSignature={doc.client_signature ?? undefined}
            readOnly
          />
        )}
      </div>
    </div>
  )
}

function InfoBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-brand-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  )
}

function DeleteDocButton({ id, onDeleted, supabase }: { id: string; onDeleted: () => void; supabase: any }) {
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('audit_trail').delete().eq('document_id', id)
    await supabase.from('documents').delete().eq('id', id)
    onDeleted()
  }

  if (confirm) return (
    <div className="space-y-2">
      <p className="text-xs text-red-500 font-medium">This will permanently delete the document and all activity. Are you sure?</p>
      <div className="flex gap-2">
        <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 disabled:opacity-60">
          {deleting ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button onClick={() => setConfirm(false)} className="flex-1 py-2 border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  )

  return (
    <button onClick={() => setConfirm(true)} className="w-full flex items-center gap-2 text-sm text-red-400 hover:text-red-600 transition-colors py-1">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5.5 3.5V2.5h3v1M4.5 3.5v8a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      Delete document
    </button>
  )
}
