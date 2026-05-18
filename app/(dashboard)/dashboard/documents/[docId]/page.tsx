import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Document, STATUS_LABELS, STATUS_COLORS } from '@/lib/types'
import { normalizeDocument } from '@/lib/document-normalize'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import AgreementPdfPreview from '@/components/preview/AgreementPdfPreview'
import DocPreview from '@/components/preview/DocPreview'
import NbgSignOff from '@/components/ui/NbgSignOff'
import GeneratedEmailButton from '@/components/ui/GeneratedEmailButton'
import DocumentActivityTracker from '@/components/ui/DocumentActivityTracker'
import { formatDistanceToNow, format } from 'date-fns'
import clsx from 'clsx'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DocumentDetailPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('documents').select('*').eq('id', docId).single()
  if (error || !data) notFound()

  const doc = normalizeDocument(data as Document)

  const { data: auditRows } = await supabase
    .from('audit_trail')
    .select('*')
    .eq('document_id', doc.id)
    .order('created_at', { ascending: false })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const signingUrl = `${appUrl}/sign/${doc.signing_token}`
  const audit = (auditRows ?? []) as Array<Record<string, any>>
  const viewEvents = audit.filter(entry => String(entry.event || '').toLowerCase().includes('view') || String(entry.event || '').toLowerCase().includes('opened'))
  const totalViews = Number(doc.view_count || viewEvents.length)
  const completedViewEvents = audit.filter(entry => Boolean(entry.metadata?.completedView) || String(entry.event || '').toLowerCase().includes('completed view'))
  const signatureEvents = audit.filter(entry => String(entry.event || '').toLowerCase().includes('signed') || String(entry.event || '').toLowerCase().includes('signature'))
  const lastViewedAt = viewEvents[0]?.created_at ? new Date(viewEvents[0].created_at) : null

  return (
    <div className="h-full flex overflow-hidden">
      <DocumentActivityTracker documentId={doc.id} actor="NPB team" source="dashboard" scrollContainerId="dashboard-document-scroll" />

      {/* ── Left panel ──────────────────────────────── */}
      <div className="w-72 min-w-72 bg-card border-r border-border overflow-y-auto flex flex-col">

        {/* Back + title */}
        <div className="p-5 border-b border-border">
          <Link href="/dashboard" className="text-xs text-muted hover:text-secondary mb-3 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            All documents
          </Link>
          <div className="flex items-center gap-2 mb-2 mt-1">
            <span className={clsx('text-xs font-bold px-2 py-0.5 rounded', `type-${doc.type}`)}>{doc.type}</span>
            <span className={clsx('text-xs font-medium px-2.5 py-0.5 rounded-full', STATUS_COLORS[doc.status])}>
              {STATUS_LABELS[doc.status]}
            </span>
          </div>
          <h1 className="text-sm font-bold text-foreground leading-snug">
            {DOCUMENT_TYPE_LABELS[doc.type] || doc.type}
          </h1>
          <p className="text-xs text-muted mt-1">
            Created {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* Client info */}
        <div className="p-5 border-b border-border space-y-3">
          <InfoBlock label="Client" value={doc.client_name} sub={doc.client_email} />
          {doc.client_company && <InfoBlock label="Company" value={doc.client_company} />}
          {doc.sent_at   && <InfoBlock label="Sent"   value={format(new Date(doc.sent_at),   'MMM d, yyyy h:mm a')} />}
          {doc.signed_at && <InfoBlock label="Signed" value={format(new Date(doc.signed_at), 'MMM d, yyyy h:mm a')} />}
          {doc.expires_at && doc.status !== 'signed' && (
            <InfoBlock label="Expires" value={format(new Date(doc.expires_at), 'MMM d, yyyy')} />
          )}
        </div>

        <div className="p-5 border-b border-border">
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Engagement</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <StatBlock label="Total views" value={String(totalViews)} />
            <StatBlock label="Completed" value={completedViewEvents.length ? 'Yes' : 'No'} />
          </div>
          <div className="space-y-2">
            <InfoBlock label="Last viewed" value={lastViewedAt ? format(lastViewedAt, 'MMM d, yyyy h:mm a') : 'Not viewed yet'} />
            <InfoBlock label="Signature logs" value={`${signatureEvents.length} event${signatureEvents.length === 1 ? '' : 's'}`} />
          </div>
        </div>

        {doc.type !== 'agreement' && (
          <div className="p-5 border-b border-border space-y-2">
            <a
              href={`/api/generated-document-pdf?id=${doc.id}`}
              target="_blank"
              className="block w-full text-center rounded-lg bg-brand-900 text-white text-xs font-bold py-2.5"
            >
              Preview / Download PDF
            </a>
            <GeneratedEmailButton documentId={doc.id} />
          </div>
        )}

        {/* NPB sign-off + actions */}
        <div className="p-5 border-b border-border">
          <NbgSignOff doc={doc} signingUrl={signingUrl} />
        </div>

        {/* Audit trail */}
        {audit.length > 0 && (
          <div className="p-5 flex-1">
            <p className="text-xs font-medium text-muted uppercase tracking-wide mb-3">Activity timeline</p>
            <div className="space-y-3">
              {audit.map((entry: Record<string, any>) => (
                <div key={entry.id as string} className="flex gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-200 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground font-medium">{entry.event as string}</p>
                    <p className="text-xs text-muted">
                      {format(new Date(entry.created_at as string), 'MMM d, yyyy h:mm a')} - {formatDistanceToNow(new Date(entry.created_at as string), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {entry.actor ? `${entry.actor}` : 'Unknown viewer'}{entry.ip_address ? ` - IP ${entry.ip_address}` : ''}
                    </p>
                    {entry.user_agent && <p className="text-xs text-muted truncate">{compactUserAgent(String(entry.user_agent))}</p>}
                    {(entry.metadata?.city || entry.metadata?.region || entry.metadata?.country) && (
                      <p className="text-xs text-muted truncate">{[entry.metadata.city, entry.metadata.region, entry.metadata.country].filter(Boolean).join(', ')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Document preview ─────────────────────────── */}
      <div id="dashboard-document-scroll" className="flex-1 bg-surface overflow-y-auto p-6">
        {doc.type === 'agreement' ? (
          <AgreementPdfPreview fields={doc.fields} clientName={doc.client_name} clientSignature={doc.client_signature ?? undefined} />
        ) : (
          <DocPreview
            type={doc.type}
            fields={doc.fields}
            clientName={doc.client_name}
            nbgSignature={doc.nbg_signature ?? undefined}
            clientSignature={doc.client_signature ?? undefined}
          />
        )}
      </div>
    </div>
  )
}

function InfoBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-muted mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-lg font-bold text-foreground leading-none">{value}</p>
      <p className="text-xs text-muted mt-1">{label}</p>
    </div>
  )
}

function compactUserAgent(userAgent: string) {
  if (userAgent.includes('Edg/')) return 'Microsoft Edge'
  if (userAgent.includes('Chrome/')) return 'Chrome'
  if (userAgent.includes('Firefox/')) return 'Firefox'
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'Safari'
  return userAgent.slice(0, 80)
}
