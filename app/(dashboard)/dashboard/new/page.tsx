'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AgreementPdfPreview from '@/components/preview/AgreementPdfPreview'
import DocPreview from '@/components/preview/DocPreview'
import { DOCUMENT_TYPE_VALUES, DOCUMENT_TYPES, getDocumentMeta } from '@/lib/document-catalog'
import { getLegacyDatabaseType } from '@/lib/document-normalize'
import { getAllowedDocTypes } from '@/lib/rbac'
import { createClient } from '@/lib/supabase'
import { DocType } from '@/lib/types'
import { useUserRole } from '@/lib/use-user-role'
import {
  AGREEMENT_SECTIONS,
  APPOINTMENT_LETTER_SECTIONS,
  CONFIRMATION_LETTER_SECTIONS,
  FINAL_INVOICE_RECEIPT_SECTIONS,
  HR_LETTER_SECTIONS,
  OFFER_LETTER_SECTIONS,
  OPERATIONS_DEFAULTS,
  OPERATIONS_FIELD_CONFIG,
  PRE_INVOICE_SECTIONS,
  SLOT_INVOICE_RECEIPT_SECTIONS,
} from '@/lib/templates/operations'

type Step = 'type' | 'client' | 'fields' | 'preview'

type BundleDocument = {
  id: string
  type: DocType
  fields: Record<string, string>
}

const STEPS = [
  { key: 'type', label: 'Document type', num: 1 },
  { key: 'client', label: 'Recipient details', num: 2 },
  { key: 'fields', label: 'Fill fields', num: 3 },
  { key: 'preview', label: 'Preview & Send', num: 4 },
] as const

function getSections(type: DocType) {
  if (type === 'agreement') return AGREEMENT_SECTIONS
  if (type === 'review-agreement') return []
  if (type === 'pre-invoice') return PRE_INVOICE_SECTIONS
  if (type === 'slot-invoice-receipt') return SLOT_INVOICE_RECEIPT_SECTIONS
  if (type === 'final-invoice-receipt') return FINAL_INVOICE_RECEIPT_SECTIONS
  if (type === 'appointment') return APPOINTMENT_LETTER_SECTIONS
  if (type === 'offer') return OFFER_LETTER_SECTIONS
  if (type === 'confirmation') return CONFIRMATION_LETTER_SECTIONS
  return AGREEMENT_SECTIONS
}

function createBundleDocument(type: DocType): BundleDocument {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    fields: { ...OPERATIONS_DEFAULTS },
  }
}

export default function NewDocumentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { role } = useUserRole()

  const hasCRMParams = !!(searchParams.get('name') || searchParams.get('email'))
  const crmType = (searchParams.get('type') as DocType) || null
  const validCrmType = crmType && DOCUMENT_TYPE_VALUES.includes(crmType) ? crmType : null

  const [docType, setDocType] = useState<DocType>(validCrmType || 'agreement')
  const [clientName, setClientName] = useState(searchParams.get('name') || '')
  const [clientEmail, setClientEmail] = useState(searchParams.get('email') || '')
  const [clientCo, setClientCo] = useState(searchParams.get('company') || '')
  const [step, setStep] = useState<Step>(hasCRMParams && validCrmType ? 'fields' : hasCRMParams ? 'client' : 'type')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [sendError, setSendError] = useState('')
  const [bundleDocs, setBundleDocs] = useState<BundleDocument[]>([])
  const [activeDocId, setActiveDocId] = useState('primary')
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [bundleError, setBundleError] = useState('')
  const [isMounted, setIsMounted] = useState(false)
  const allowedTypes = useMemo(() => getAllowedDocTypes(role), [role])
  const visibleDocumentTypes = useMemo(
    () => DOCUMENT_TYPES.filter(item => allowedTypes.includes(item.type)),
    [allowedTypes]
  )

  const activeBundleDoc = bundleDocs.find(doc => doc.id === activeDocId) || null
  const activeDocType = activeBundleDoc?.type || docType
  const activeFields = activeBundleDoc?.fields || fields
  const docMeta = getDocumentMeta(activeDocType)
  const stepIdx = STEPS.findIndex(s => s.key === step)
  const selectedDocuments = useMemo(() => [{ id: 'primary', type: docType, fields }, ...bundleDocs], [docType, fields, bundleDocs])
  const selectedDocumentCount = selectedDocuments.length
  const upd = (k: string, v: string) => {
    if (activeBundleDoc) {
      setBundleDocs(prev => prev.map(doc => doc.id === activeBundleDoc.id ? { ...doc, fields: { ...doc.fields, [k]: v } } : doc))
    } else {
      setFields(p => ({ ...p, [k]: v }))
    }
  }

  function sanitizeFieldsForInternalSave(type: DocType, input: Record<string, string>) {
    if (type === 'review-agreement') return {}
    if (type !== 'agreement') return input
    const {
      agreementName,
      agreementAddress,
      agreementContact,
      receivingSignatoryName,
      receivingSignatoryTitle,
      receivingSignatoryDate,
      signaturePosition,
      ...allowed
    } = input
    return allowed
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setFields(prev => ({ ...OPERATIONS_DEFAULTS, ...prev }))
  }, [])

  useEffect(() => {
    if (!allowedTypes.includes(docType)) {
      setDocType(allowedTypes[0])
      setFields({ ...OPERATIONS_DEFAULTS })
      setStep('type')
    }
    setBundleDocs(prev => {
      const next = prev.filter(doc => allowedTypes.includes(doc.type))
      return next.length === prev.length ? prev : next
    })
  }, [allowedTypes, docType])

  useEffect(() => {
    setBundleDocs([])
    setActiveDocId('primary')
    setBundleError('')
  }, [docType])

  async function saveDraft() {
    setSaveError('')
    setSaving(true)
    const { data, error } = await insertDocument('draft')
    setSaving(false)
    if (!error && data) router.push(`/dashboard/documents/${data.id}`)
    else setSaveError(error?.message || 'Draft could not be saved.')
  }

  async function insertDocument(status: 'draft') {
    const documentFields = {
      ...sanitizeFieldsForInternalSave(docType, fields),
      __bundleDocuments: JSON.stringify(bundleDocs.map(doc => ({
        id: doc.id,
        type: doc.type,
        fields: sanitizeFieldsForInternalSave(doc.type, doc.fields),
      }))),
    }
    const payload = {
      type: docType,
      status,
      client_name: clientName,
      client_email: clientEmail,
      client_company: clientCo,
      fields: documentFields,
    }
    const result = await supabase.from('documents').insert(payload).select().single()
    if (!result.error?.message?.includes('documents_type_check')) return result

    return supabase.from('documents').insert({
      ...payload,
      type: getLegacyDatabaseType(docType),
      fields: { ...documentFields, __docType: docType },
    }).select().single()
  }

  async function sendForSigning() {
    setSending(true)
    setSendError('')
    const { data, error } = await insertDocument('draft')

    if (!error && data) {
      const res = await fetch('/api/compose-document-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: data.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setSendError(body.error || 'Email draft could not be prepared. The document was saved as a draft.')
        setSending(false)
        return
      }
      await openEmailDraftResponse(res, `netbounce_${docType}_${clientName || 'document'}_draft.eml`)
      router.push(`/dashboard/documents/${data.id}`)
    } else {
      const message = error?.message || 'Document could not be saved.'
      setSendError(message)
    }
    setSending(false)
  }

  function addBundleDocument(type: DocType) {
    setBundleError('')
    setAddMenuOpen(false)
    if (!allowedTypes.includes(type)) {
      setBundleError(`${getDocumentMeta(type).label} is not available in your current role.`)
      return
    }
    if (selectedDocuments.some(doc => doc.type === type)) {
      setBundleError(`${getDocumentMeta(type).label} is already selected.`)
      return
    }
    const nextDoc = createBundleDocument(type)
    setBundleDocs(prev => [...prev, nextDoc])
    setActiveDocId(nextDoc.id)
  }

  function removeBundleDocument(id: string) {
    setBundleDocs(prev => prev.filter(doc => doc.id !== id))
    if (activeDocId === id) setActiveDocId('primary')
  }

  function goBack() {
    if (stepIdx > 0) {
      setStep(STEPS[stepIdx - 1].key)
      return
    }
    router.push('/dashboard')
  }

  if (!isMounted) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--page-bg)' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-light)', padding: '0 28px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={goBack} type="button" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-3)', fontSize: '13px', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Back
          </button>
          <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
          <h1 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>New Document</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {step !== 'type' && (
            <button onClick={saveDraft} disabled={saving} className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '10px' }}>
              {saving ? 'Saving...' : 'Save draft'}
            </button>
          )}
          {step === 'preview' && (
            <button onClick={sendForSigning} disabled={sending || !clientEmail} className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '10px' }}>
              {sending ? 'Preparing...' : `Open email draft for ${clientEmail}`}
            </button>
          )}
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border-light)', padding: '0 28px', height: '48px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        {STEPS.map((s, i) => {
          const done = i < stepIdx
          const active = s.key === step
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 10px', borderRadius: '99px', cursor: done ? 'pointer' : 'default', background: active ? '#eef2ff' : 'transparent' }} onClick={() => { if (done) setStep(s.key as Step) }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: active ? '#6366f1' : done ? '#10b981' : 'var(--border)', color: (active || done) ? 'white' : 'var(--text-3)' }}>
                  {done ? '✓' : s.num}
                </div>
                <span style={{ fontSize: '13px', fontWeight: active ? 600 : 400, color: active ? '#6366f1' : done ? '#10b981' : 'var(--text-3)', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <span style={{ color: done ? '#10b981' : 'var(--border)' }}>›</span>}
            </div>
          )
        })}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {step === 'type' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 6px' }}>What type of document?</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: '0 0 32px' }}>Choose the document workflow for this document.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', maxWidth: '920px' }}>
              {visibleDocumentTypes.map(dt => (
                <button key={dt.type} onClick={() => { setDocType(dt.type); setFields({ ...OPERATIONS_DEFAULTS }); setStep('client') }} style={{ textAlign: 'left', padding: '22px', borderRadius: '16px', background: docType === dt.type ? dt.bg : 'var(--surface)', border: `2px solid ${docType === dt.type ? dt.color : 'var(--border-light)'}`, cursor: 'pointer', boxShadow: docType === dt.type ? `0 4px 16px ${dt.color}25` : 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '99px', background: dt.bg, color: dt.color, border: `1px solid ${dt.border}` }}>{dt.shortLabel}</span>
                  </div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>{dt.label}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{dt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'client' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '40px 48px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-1)', margin: '0 0 6px' }}>Recipient details</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: '0 0 28px' }}>The document request will be emailed to this address.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <FieldGroup label="Recipient name" required>
                  <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Full legal name or signatory name" className="input" style={{ fontSize: '14px' }} />
                </FieldGroup>
                <FieldGroup label="Email address" required>
                  <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@company.com" className="input" style={{ fontSize: '14px' }} />
                </FieldGroup>
                <FieldGroup label="Company name">
                  <input type="text" value={clientCo} onChange={e => setClientCo(e.target.value)} placeholder="Company LLC" className="input" style={{ fontSize: '14px' }} />
                </FieldGroup>
                <button onClick={() => { if (clientName && clientEmail) setStep('fields') }} disabled={!clientName || !clientEmail} className="btn btn-primary" style={{ marginTop: '8px', borderRadius: '12px', padding: '13px', fontSize: '15px', width: '100%', justifyContent: 'center', opacity: (!clientName || !clientEmail) ? 0.4 : 1 }}>
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'fields' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: '300px', minWidth: '300px', background: 'var(--sidebar-bg)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ color: 'white', fontSize: '13px', fontWeight: 700, margin: 0 }}>{docMeta.label}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', margin: 0 }}>{selectedDocumentCount} document{selectedDocumentCount === 1 ? '' : 's'} selected</p>
              </div>
              <DocumentBundlePanel
                documents={selectedDocuments}
                activeId={activeDocId}
                menuOpen={addMenuOpen}
                error={bundleError}
                dark
                onToggleMenu={() => setAddMenuOpen(open => !open)}
                onSelectDocument={setActiveDocId}
                onAddDocument={addBundleDocument}
                onRemoveDocument={removeBundleDocument}
                availableTypes={visibleDocumentTypes}
              />
              <div style={{ flex: 1, padding: '8px 0 16px' }}>
                {getSections(activeDocType).length === 0 && (
                  <div style={{ padding: '18px 16px', color: 'rgba(255,255,255,0.56)', fontSize: '12px', lineHeight: 1.5 }}>
                    This document is static and has no editable custom fields.
                  </div>
                )}
                {getSections(activeDocType).map(s => (
                  <div key={s.id}>
                    <FieldSection title={s.label} color={docMeta.color} />
                    {s.fields.map(k => {
                      const c = OPERATIONS_FIELD_CONFIG[k]
                      if (!c) return null
                      return <DarkFieldInput key={k} label={c.label} value={activeFields[k] ?? ''} type={c.type ?? 'text'} placeholder={c.placeholder} multiline={c.multiline} onChange={v => upd(k, v)} />
                    })}
                  </div>
                ))}
              </div>
              <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button onClick={() => setStep('preview')} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: docMeta.color, border: 'none', color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  Review & Send
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#dce2eb' }}>
              {activeDocType === 'agreement'
                ? <AgreementPdfPreview fields={activeFields} clientName={clientName} />
                : <DocPreview type={activeDocType} fields={activeFields} clientName={clientName} clientEmail={clientEmail} clientCompany={clientCo} />}
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ width: '300px', minWidth: '300px', background: 'var(--surface)', borderRight: '1px solid var(--border-light)', overflowY: 'auto', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)', margin: '0 0 20px' }}>Ready to send</h3>
              <div style={{ background: 'var(--page-bg)', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <InfoRow label="Active document" value={docMeta.label} />
                <InfoRow label="Bundle" value={`${selectedDocumentCount} document${selectedDocumentCount === 1 ? '' : 's'}`} />
                <InfoRow label="Recipient" value={clientName} />
                <InfoRow label="Email" value={clientEmail} />
                {clientCo && <InfoRow label="Company" value={clientCo} />}
              </div>
              <DocumentBundlePanel
                documents={selectedDocuments}
                activeId={activeDocId}
                menuOpen={addMenuOpen}
                error={bundleError}
                onToggleMenu={() => setAddMenuOpen(open => !open)}
                onSelectDocument={setActiveDocId}
                onAddDocument={addBundleDocument}
                onRemoveDocument={removeBundleDocument}
                availableTypes={visibleDocumentTypes}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={sendForSigning} disabled={sending} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', borderRadius: '12px', padding: '13px', fontSize: '14px', background: docMeta.color }}>
                  {sending ? 'Preparing...' : 'Open email draft'}
                </button>
                {sendError && <p style={{ color: '#dc2626', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>{sendError}</p>}
                {saveError && <p style={{ color: '#dc2626', fontSize: '12px', lineHeight: 1.5, margin: 0 }}>{saveError}</p>}
                <button onClick={() => setStep('fields')} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', borderRadius: '12px', fontSize: '13px' }}>Edit fields</button>
                <button onClick={saveDraft} disabled={saving} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '13px', cursor: 'pointer', padding: '8px', textAlign: 'center' }}>{saving ? 'Saving...' : 'Save as draft'}</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#dce2eb' }}>
              {activeDocType === 'agreement'
                ? <AgreementPdfPreview fields={activeFields} clientName={clientName} />
                : <DocPreview type={activeDocType} fields={activeFields} clientName={clientName} clientEmail={clientEmail} clientCompany={clientCo} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DocumentBundlePanel({
  documents,
  activeId,
  menuOpen,
  error,
  availableTypes,
  dark = false,
  onToggleMenu,
  onSelectDocument,
  onAddDocument,
  onRemoveDocument,
}: {
  documents: BundleDocument[]
  activeId: string
  menuOpen: boolean
  error: string
  availableTypes: typeof DOCUMENT_TYPES
  dark?: boolean
  onToggleMenu: () => void
  onSelectDocument: (id: string) => void
  onAddDocument: (type: DocType) => void
  onRemoveDocument: (id: string) => void
}) {
  const text = dark ? 'white' : 'var(--text-1)'
  const muted = dark ? 'rgba(255,255,255,0.52)' : 'var(--text-3)'
  const border = dark ? 'rgba(255,255,255,0.12)' : 'var(--border-light)'
  const bg = dark ? 'rgba(255,255,255,0.05)' : 'var(--page-bg)'
  const rowBg = dark ? 'rgba(255,255,255,0.06)' : 'white'
  const selectedTypes = new Set(documents.map(doc => doc.type))

  return (
    <div style={{ margin: dark ? '12px 14px 4px' : '0 0 16px', padding: '12px', borderRadius: '12px', border: `1px solid ${border}`, background: bg, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div>
          <p style={{ color: text, fontSize: '12px', fontWeight: 700, margin: 0 }}>Document bundle</p>
          <p style={{ color: muted, fontSize: '10.5px', margin: '2px 0 0' }}>Select a document to edit</p>
        </div>
        <button type="button" onClick={onToggleMenu} style={{ border: `1px solid ${border}`, background: rowBg, color: text, borderRadius: '8px', padding: '7px 9px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          + Add Document
        </button>
      </div>

      {menuOpen && (
        <div style={{ position: 'absolute', right: 12, top: 52, zIndex: 5, width: 220, border: `1px solid ${border}`, borderRadius: 10, background: dark ? '#172033' : 'white', boxShadow: '0 14px 30px rgba(15,23,42,0.18)', overflow: 'hidden' }}>
          {availableTypes.map(item => (
            <button
              key={item.type}
              type="button"
              disabled={selectedTypes.has(item.type)}
              onClick={() => onAddDocument(item.type)}
              style={{ width: '100%', border: 'none', background: 'transparent', color: selectedTypes.has(item.type) ? muted : text, padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 700, cursor: selectedTypes.has(item.type) ? 'not-allowed' : 'pointer', opacity: selectedTypes.has(item.type) ? 0.55 : 1 }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {documents.map((doc, index) => (
          <DocumentRow
            key={doc.id}
            doc={doc}
            isPrimary={index === 0}
            active={doc.id === activeId}
            dark={dark}
            onSelect={() => onSelectDocument(doc.id)}
            onRemove={index === 0 ? undefined : () => onRemoveDocument(doc.id)}
          />
        ))}
      </div>

      {error && <p style={{ color: dark ? '#fecaca' : '#dc2626', fontSize: '11px', lineHeight: 1.4, margin: '9px 0 0' }}>{error}</p>}
    </div>
  )
}

function DocumentRow({ doc, isPrimary, active, dark, onSelect, onRemove }: { doc: BundleDocument; isPrimary: boolean; active: boolean; dark?: boolean; onSelect: () => void; onRemove?: () => void }) {
  const meta = getDocumentMeta(doc.type)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '9px', background: active ? (dark ? 'rgba(255,255,255,0.12)' : '#eef2ff') : (dark ? 'rgba(0,0,0,0.15)' : 'var(--surface)'), border: `1px solid ${active ? meta.color : dark ? 'rgba(255,255,255,0.08)' : 'var(--border-light)'}` }}>
      <button type="button" onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ width: '26px', height: '30px', borderRadius: '5px', background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, flexShrink: 0 }}>PDF</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ color: dark ? 'white' : 'var(--text-1)', fontSize: '11.5px', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.label}</p>
          <p style={{ color: dark ? 'rgba(255,255,255,0.45)' : 'var(--text-3)', fontSize: '10.5px', margin: '2px 0 0' }}>{isPrimary ? 'Primary document' : getSections(doc.type).length ? 'Editable template' : 'Static template'}</p>
        </div>
      </button>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${meta.label}`} style={{ width: '24px', height: '24px', border: 'none', borderRadius: '6px', background: 'transparent', color: dark ? 'rgba(255,255,255,0.62)' : 'var(--text-3)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>
          x
        </button>
      )}
    </div>
  )
}

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '6px' }}>
        {label} {required && <span style={{ color: '#f43f5e' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function FieldSection({ title, color }: { title: string; color: string }) {
  return (
    <div style={{ padding: '12px 18px 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
      <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color, opacity: 0.9, whiteSpace: 'nowrap' }}>{title}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
    </div>
  )
}

function DarkFieldInput({ label, value, type = 'text', placeholder, multiline, onChange }: { label: string; value: string; type?: string; placeholder?: string; multiline?: boolean; onChange: (v: string) => void }) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '12.5px',
    padding: '8px 10px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ padding: '4px 14px 8px' }}>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.45)', marginBottom: '5px' }}>{label}</label>
      {type === 'image' ? (
        <div>
          {value && <img src={value} alt={label} style={{ maxWidth: '100%', maxHeight: 72, objectFit: 'contain', display: 'block', marginBottom: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 6 }} />}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => onChange(String(reader.result || ''))
              reader.readAsDataURL(file)
            }}
            style={{ ...inputStyle, padding: '7px 8px' }}
          />
        </div>
      ) : multiline
        ? <textarea rows={3} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, resize: 'none' }} />
        : <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} style={inputStyle} />}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '0 0 2px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', margin: 0 }}>{value}</p>
    </div>
  )
}

async function openEmailDraftResponse(res: Response, filename: string) {
  const contentType = res.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    const data = await res.json()
    const draftUrl = data?.draftUrl || data?.url
    if (draftUrl) {
      window.open(draftUrl, '_blank', 'noopener,noreferrer')
      return
    }
  }
  if (res.status === 200) {
    downloadBlob(await res.blob(), filename)
  }
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
