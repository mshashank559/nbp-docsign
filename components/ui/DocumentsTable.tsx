'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'
import { Document, STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { createClient } from '@/lib/supabase'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { getEffectiveDocType } from '@/lib/document-normalize'

type SortKey = 'created_at' | 'client_name' | 'status' | 'type'
type SortDir = 'asc' | 'desc'
type FilterStatus = 'all' | Document['status']
type FilterType   = 'all' | Document['type']

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all',     label: 'All' },
  { value: 'draft',   label: 'Draft' },
  { value: 'sent',    label: 'Sent' },
  { value: 'viewed',  label: 'Viewed' },
  { value: 'signed',  label: 'Signed' },
]

export default function DocumentsTable({ documents }: { documents: Document[] }) {
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [typeFilter,   setTypeFilter]   = useState<FilterType>('all')
  const [sortKey,      setSortKey]      = useState<SortKey>('created_at')
  const [sortDir,      setSortDir]      = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    let list = [...documents]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(d =>
        d.client_name.toLowerCase().includes(q) ||
        d.client_email.toLowerCase().includes(q) ||
        (d.client_company ?? '').toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') list = list.filter(d => d.status === statusFilter)
    if (typeFilter   !== 'all') list = list.filter(d => getEffectiveDocType(d) === typeFilter)

    list.sort((a, b) => {
      let av: string, bv: string
      if (sortKey === 'created_at') { av = a.created_at; bv = b.created_at }
      else if (sortKey === 'client_name') { av = a.client_name.toLowerCase(); bv = b.client_name.toLowerCase() }
      else if (sortKey === 'status') { av = a.status; bv = b.status }
      else { av = getEffectiveDocType(a); bv = getEffectiveDocType(b) }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [documents, search, statusFilter, typeFilter, sortKey, sortDir])

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-muted ml-1">↕</span>
    return <span className="text-brand-700 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div>
      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client name, email, or company…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-card text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-brand-700"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                statusFilter === f.value
                  ? 'bg-brand-900 text-white'
                  : 'bg-card border border-border text-secondary hover:bg-surface'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Type toggle */}
        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-card">
          {(['all', ...DOCUMENT_TYPES.map(d => d.type)] as FilterType[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                typeFilter === t ? 'bg-brand-900 text-white' : 'text-secondary hover:bg-surface'
              )}
            >
              {t === 'all' ? 'All types' : DOCUMENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center">
          <p className="text-muted text-sm mb-2">
            {documents.length === 0 ? 'No documents yet.' : 'No documents match your filters.'}
          </p>
          {documents.length === 0 && (
            <Link href="/dashboard/new" className="text-brand-700 text-sm font-medium hover:underline">
              Create your first document →
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3.5">
                  <button onClick={() => toggleSort('type')} className="flex items-center text-xs font-medium text-muted uppercase tracking-wide hover:text-foreground">
                    Document <SortIcon col="type" />
                  </button>
                </th>
                <th className="text-left px-6 py-3.5">
                  <button onClick={() => toggleSort('client_name')} className="flex items-center text-xs font-medium text-muted uppercase tracking-wide hover:text-foreground">
                    Client <SortIcon col="client_name" />
                  </button>
                </th>
                <th className="text-left px-6 py-3.5">
                  <button onClick={() => toggleSort('status')} className="flex items-center text-xs font-medium text-muted uppercase tracking-wide hover:text-foreground">
                    Status <SortIcon col="status" />
                  </button>
                </th>
                <th className="text-left px-6 py-3.5">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center text-xs font-medium text-muted uppercase tracking-wide hover:text-foreground">
                    Created <SortIcon col="created_at" />
                  </button>
                </th>
                <th className="px-6 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(doc => {
                const effectiveType = getEffectiveDocType(doc)
                return (
                <tr key={doc.id} className="hover:bg-surface transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', `type-${effectiveType}`)}>{effectiveType}</span>
                      <span className="font-medium text-foreground">
                        {DOCUMENT_TYPE_LABELS[effectiveType] || effectiveType}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-foreground">{doc.client_name}</p>
                    <p className="text-muted text-xs">{doc.client_email}</p>
                    {doc.client_company && <p className="text-muted text-xs">{doc.client_company}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx('text-xs font-medium px-2.5 py-1 rounded-full', STATUS_COLORS[doc.status])}>
                      {STATUS_LABELS[doc.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted text-xs">
                    {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="text-brand-700 text-xs font-medium hover:underline"
                      >
                        View →
                      </Link>
                      <a
                        href={`/api/document-report?id=${doc.id}`}
                        className="text-gray-400 hover:text-brand-700"
                        title="Download report"
                      >
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1.5v7M4 6.5 6.5 9 9 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 11h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                      </a>
                      <DeleteButton id={doc.id} />
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          <div className="px-6 py-3 border-t border-border text-xs text-muted">
            Showing {filtered.length} of {documents.length} document{documents.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

function DeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('audit_trail').delete().eq('document_id', id)
    await supabase.from('documents').delete().eq('id', id)
    router.refresh()
  }

  if (confirm) return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-500">Delete?</span>
      <button onClick={handleDelete} disabled={deleting} className="text-xs text-red-600 font-bold hover:underline">{deleting ? '…' : 'Yes'}</button>
      <button onClick={() => setConfirm(false)} className="text-xs text-gray-400 hover:underline">No</button>
    </div>
  )

  return (
    <button onClick={() => setConfirm(true)} className="text-xs text-gray-300 hover:text-red-500 transition-colors" title="Delete">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3h9M5 3V2h3v1M4 3v7.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5V3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
    </button>
  )
}
