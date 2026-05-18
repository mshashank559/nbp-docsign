'use client'
import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Document } from '@/lib/types'
import { DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { getEffectiveDocType } from '@/lib/document-normalize'
import {
  ACCOUNTS_DOC_TYPE_LABELS,
  HR_DOC_TYPE_LABELS,
  getAllowedDatabaseTypes,
  getAllowedDocTypes,
  getMetricsForRole,
  isDocAllowedForRole,
  toRoleView,
} from '@/lib/rbac'
import { useUserRole } from '@/lib/use-user-role'
import { formatDistanceToNow } from 'date-fns'

const TYPE_LABELS: Record<string, string> = DOCUMENT_TYPE_LABELS
const ACCOUNTS_DOC_TYPES = [...ACCOUNTS_DOC_TYPE_LABELS]
const HR_DOC_TYPES = [...HR_DOC_TYPE_LABELS]

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', viewed: 'Viewed', signed: 'Signed',
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All', activeClass: 'active' },
  { key: 'draft', label: 'Draft', activeClass: 'active-slate' },
  { key: 'sent', label: 'Sent', activeClass: 'active-amber' },
  { key: 'viewed', label: 'Viewed', activeClass: 'active-sky' },
  { key: 'signed', label: 'Signed', activeClass: 'active-emerald' },
]

export default function DashboardPage() {
  const supabase = createClient()
  const { role } = useUserRole()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  const activeRole = toRoleView(role)
  const allowedTypes = useMemo(() => getAllowedDocTypes(role), [role])
  const activeRoleLabels: readonly string[] = activeRole === 'HR' ? HR_DOC_TYPES : ACCOUNTS_DOC_TYPES
  const typeFilters = useMemo(() => [
    { key: 'all', label: 'All types' },
    ...DOCUMENT_TYPES
      .filter(item => activeRoleLabels.includes(DOCUMENT_TYPE_LABELS[item.type]))
      .map(d => ({ key: d.type, label: d.shortLabel })),
  ], [activeRoleLabels])

  useEffect(() => {
    setLoading(true)
    const allowedDatabaseTypes = activeRole === 'HR'
      ? getAllowedDatabaseTypes('HR')
      : getAllowedDatabaseTypes('ACCOUNTS')

    let query = supabase
      .from('documents')
      .select('*', { count: 'exact' })

    if (activeRole === 'HR') {
      query = query.in('type', allowedDatabaseTypes)
    } else if (activeRole === 'Accounts') {
      query = query.in('type', allowedDatabaseTypes)
    }

    query.order('created_at', { ascending: false })
      .then(({ data }) => {
        setDocs(((data ?? []) as Document[]).filter(doc => isDocAllowedForRole(doc, role)))
        setLoading(false)
      })

    const channel = supabase
      .channel('dashboard-documents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, payload => {
        setDocs(current => {
          if (payload.eventType === 'DELETE') return current.filter(doc => doc.id !== (payload.old as Document).id)
          const nextDoc = payload.new as Document
          if (!isDocAllowedForRole(nextDoc, role)) return current.filter(doc => doc.id !== nextDoc.id)
          const exists = current.some(doc => doc.id === nextDoc.id)
          const next = exists ? current.map(doc => doc.id === nextDoc.id ? nextDoc : doc) : [nextDoc, ...current]
          return next.sort((a, b) => b.created_at.localeCompare(a.created_at))
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeRole, role])

  useEffect(() => {
    if (typeFilter !== 'all' && !allowedTypes.includes(typeFilter as Document['type'])) {
      setTypeFilter('all')
    }
  }, [allowedTypes, typeFilter])

  async function deleteDoc(id: string) {
    await supabase.from('audit_trail').delete().eq('document_id', id)
    await supabase.from('documents').delete().eq('id', id)
    setDocs(d => d.filter(x => x.id !== id))
  }

  const filtered = docs.filter(d => {
    const effectiveType = getEffectiveDocType(d)
    const q = search.toLowerCase()
    const matchSearch = !q || d.client_name.toLowerCase().includes(q) || d.client_email.toLowerCase().includes(q) || (d.client_company || '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    const matchType = typeFilter === 'all' || effectiveType === typeFilter
    return matchSearch && matchStatus && matchType
  })

  const stats = getMetricsForRole(docs, role)

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{ padding: '28px 32px', maxWidth: '1100px', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Documents</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{today}</p>
        </div>
        <Link href="/dashboard/new" className="btn btn-primary" style={{ borderRadius: '12px', padding: '11px 20px', textDecoration: 'none', fontSize: '14px' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          New document
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
        {stats.map(s => (
          <div key={s.label} className={`stat-card ${s.gradient}`}>
            <p className="stat-card-label">{s.label}</p>
            <p className="stat-card-value">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow-sm)',
        padding: '16px 20px', marginBottom: '12px',
      }}>
        {/* Search bar */}
        <div className="search-bar" style={{ marginBottom: '14px' }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by client name, email, or company…"
          />
        </div>

        {/* Status filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.key} className={`filter-pill ${statusFilter === f.key ? f.activeClass : ''}`} onClick={() => setStatusFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Type filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {typeFilters.map(f => (
            <button key={f.key} className={`filter-pill ${typeFilter === f.key ? 'active' : ''}`} onClick={() => setTypeFilter(f.key)}
              style={typeFilter === f.key && f.key !== 'all' ? { background: 'var(--text-1)', borderColor: 'var(--text-1)', color: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' } : {}}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 10px 4px' }}>
        Showing {filtered.length} of {docs.length} document{docs.length !== 1 ? 's' : ''}
      </p>

      {/* Document row cards */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-3)' }}>Loading documents…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)', padding: '64px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>📄</div>
          <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-2)', margin: '0 0 6px' }}>No documents found</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 20px' }}>
            {search || statusFilter !== 'all' || typeFilter !== 'all' ? 'Try clearing your filters' : 'Create your first document to get started'}
          </p>
          {!search && statusFilter === 'all' && typeFilter === 'all' && (
            <Link href="/dashboard/new" className="btn btn-primary" style={{ textDecoration: 'none', borderRadius: '10px' }}>
              Create your first document
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(doc => (
            <DocRowCard key={doc.id} doc={doc} onDelete={() => deleteDoc(doc.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function DocRowCard({ doc, onDelete }: { doc: Document; onDelete: () => void }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const effectiveType = getEffectiveDocType(doc)

  const typeClass = `type-${effectiveType}-row`
  const statusClass = `status-${doc.status}`
  const statusLabel = { draft: 'Draft', sent: 'Sent', viewed: 'Viewed', signed: 'Signed' }[doc.status] || doc.status
  const typeLabel = TYPE_LABELS[effectiveType] || effectiveType
  const totalViews = Number(doc.view_count || 0)

  return (
    <div className={`doc-row-card ${typeClass} fade-up`}>
      {/* Doc type badge + name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span className={`badge type-${effectiveType}`} style={{ fontSize: '11px', padding: '2px 9px' }}>{effectiveType}</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{typeLabel}</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
          {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
        </p>
      </div>

      {/* Client */}
      <div style={{ width: '200px', flexShrink: 0 }}>
        <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-1)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.client_name}</p>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.client_email}</p>
      </div>

      {/* Status */}
      <div style={{ width: '140px', flexShrink: 0 }}>
        <span className={`badge badge-dot ${statusClass}`}>{statusLabel}</span>
      </div>

      {/* Analytics */}
      <div style={{ width: '145px', flexShrink: 0 }}>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>Total Views: <strong style={{ color: 'var(--text-1)' }}>{totalViews}</strong></p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <Link href={`/dashboard/documents/${doc.id}`} className="btn-view">
          View
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M6 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <a href={`/api/document-report?id=${doc.id}`} className="btn-delete" title="Download report">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2v7M5 7l2.5 2.5L10 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
        </a>

        {confirmDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--rose-light)', border: '1px solid #fecdd3', borderRadius: '10px', padding: '4px 10px' }}>
            <span style={{ fontSize: '12px', color: '#e11d48', fontWeight: 600 }}>Delete?</span>
            <button className="btn-confirm-yes" onClick={onDelete}>Yes</button>
            <button className="btn-confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
          </div>
        ) : (
          <button className="btn-delete" onClick={() => setConfirmDelete(true)} title="Delete document">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M2 4h11M5.5 4V3h4v1M4 4l.5 9a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        )}
      </div>
    </div>
  )
}

function ViewHistoryModal({ doc, logs, onClose }: { doc: Document; logs: any[]; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.42)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 'min(620px, 100%)', maxHeight: '75vh', overflow: 'hidden', background: 'white', borderRadius: 14, boxShadow: '0 24px 70px rgba(15,23,42,0.28)', border: '1px solid var(--border-light)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>Document Activity</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>{doc.client_name} - {doc.client_email}</p>
          </div>
          <button onClick={onClose} aria-label="Close activity" style={{ border: 'none', background: 'var(--page-bg)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', fontSize: 18, color: 'var(--text-3)' }}>x</button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', maxHeight: 'calc(75vh - 72px)' }}>
          {logs.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 13 }}>No view events recorded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {logs.map(log => (
                <div key={log.id} style={{ border: '1px solid var(--border-light)', borderRadius: 10, padding: 12, background: 'var(--page-bg)' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{formatTimestamp(log.created_at)}</p>
                  <p style={{ margin: '0 0 3px', fontSize: 12, color: 'var(--text-2)' }}>{log.event}</p>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>IP: {log.ip_address || 'Unavailable'} · Device: {compactUserAgent(log.user_agent || 'Unavailable')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function groupAuditByDocument(rows: any[]) {
  return rows.reduce((acc, row) => {
    const id = String(row.document_id || '')
    if (!id) return acc
    acc[id] = acc[id] || []
    acc[id].push(row)
    return acc
  }, {} as Record<string, any[]>)
}

function formatTimestamp(value: string) {
  try {
    return new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return value
  }
}

function compactUserAgent(userAgent: string) {
  if (userAgent.includes('Edg/')) return 'Microsoft Edge'
  if (userAgent.includes('Chrome/')) return 'Chrome'
  if (userAgent.includes('Firefox/')) return 'Firefox'
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari'
  return userAgent.slice(0, 90)
}
