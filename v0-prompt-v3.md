Please make all of the following changes to the nbg-docsign app. Commit and deploy when done.

---

## FIX 1 — Proper A4 page breaks with correct dimensions

A4 paper at 96dpi is exactly 794px wide × 1123px tall. The document must split into multiple A4 pages with visible page breaks between them, exactly like Google Docs or Word.

### Replace `components/preview/DocPreview.tsx` entirely with this:

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { DocType } from '@/lib/types'

interface Props {
  type: DocType
  fields: Record<string, string>
  clientName?: string
  nbgSignature?: string
  clientSignature?: string
  readOnly?: boolean
  onBodyChange?: (html: string) => void
  customBody?: string
}

const A4_WIDTH = 794
const A4_HEIGHT = 1123
const PAGE_PADDING_V = 72
const PAGE_PADDING_H = 80

function fmtDate(d: string) {
  if (!d) return ''
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) } catch { return d }
}

function ph(val: string, label: string) {
  if (val) return `<span style="border-bottom:1px solid #aaa;font-weight:500">${val}</span>`
  return `<span style="background:#EBF5FF;color:#1D6FA4;border:1px dashed #90C4E8;border-radius:3px;padding:1px 5px;font-style:italic;font-size:0.9em">${label}</span>`
}

function buildNDABody(f: Record<string, string>) {
  return `<div style="border-top:4px solid #0D1F14;margin-bottom:24px"></div>
<p style="font-size:11pt;font-weight:700;color:#1A3C28;margin:0 0 8px">NetBounce Global LLC</p>
<h1 style="font-size:24pt;font-weight:700;color:#0D1F14;line-height:1.2;margin:0 0 20px">Non-Disclosure Agreement</h1>
<div style="height:1px;background:#e5e7eb;margin:14px 0"></div>
<p style="margin:0 0 4px"><strong>Between:</strong> NetBounce Global LLC — Service Provider · Austin, Texas</p>
<p style="margin:0 0 4px"><strong>And:</strong> ${ph(f.clientLegalName,'CLIENT LEGAL NAME')} — ${ph(f.clientJurisdiction,'CLIENT JURISDICTION')}</p>
<p style="margin:0 0 4px"><strong>Effective Date:</strong> ${ph(fmtDate(f.effectiveDate),'EFFECTIVE DATE')} &nbsp;·&nbsp; <strong>Governing Law:</strong> Texas, United States</p>
<div style="height:1px;background:#e5e7eb;margin:14px 0"></div>
<p style="margin:0 0 10px;text-align:justify">This Non-Disclosure Agreement (the <strong>"Agreement"</strong>) is entered into as of ${ph(fmtDate(f.effectiveDate),'EFFECTIVE DATE')} by and between:</p>
<p style="margin:0 0 10px;padding-left:14px;border-left:2px solid #e5e7eb;text-align:justify"><strong>NetBounce Global LLC</strong>, a limited liability company organised under the laws of Texas, having its registered office at ${ph(f.txAddress,'REGISTERED TEXAS ADDRESS')}, and its principal operations at Ahmedabad, India (the <strong>"Disclosing Party"</strong>);</p>
<p style="text-align:center;font-weight:700;margin:12px 0">AND</p>
<p style="margin:0 0 10px;padding-left:14px;border-left:2px solid #e5e7eb;text-align:justify"><strong>${ph(f.clientLegalName,'CLIENT LEGAL NAME')}</strong>, organised under the laws of ${ph(f.clientJurisdiction,'CLIENT JURISDICTION')}, having its principal offices in the United States (the <strong>"Receiving Party"</strong>).</p>
<p style="margin:0 0 12px;font-style:italic">Collectively the <strong>"Parties"</strong> and individually a <strong>"Party."</strong></p>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">1. Purpose and Business Purpose</h2>
<p style="margin:0 0 10px;text-align:justify">The Parties intend to engage in discussions regarding a potential business relationship involving offshore accounting staffing services (the <strong>"Business Purpose"</strong>). This Agreement protects the confidentiality of such information and ensures it is used solely in connection with the Business Purpose.</p>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">2. Definition of Confidential Information</h2>
<p style="margin:0 0 8px;text-align:justify">"Confidential Information" means any non-public, proprietary, or confidential information disclosed in any form, including:</p>
<ul style="list-style:none;padding-left:16px;margin:0 0 10px">
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Business plans, strategies, financial statements, pricing models, and forecasts;</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Client lists, contracts, purchase orders, and market data;</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Employee details, recruitment practices, compensation data, and internal policies;</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Technical data, source code, system architecture, and cybersecurity protocols;</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Trade secrets, know-how, inventions, designs, and specifications; and</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Any information a reasonable person would understand to be confidential.</li>
</ul>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">3. Obligations of the Receiving Party</h2>
<p style="margin:0 0 8px">The Receiving Party agrees to:</p>
<ul style="list-style:none;padding-left:16px;margin:0 0 10px">
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Use the Confidential Information solely for the Business Purpose;</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Maintain confidentiality with at least reasonable care;</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Not disclose to any third party without prior written consent;</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Limit disclosure to employees with strict need-to-know; and</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Promptly notify of any unauthorized disclosure.</li>
</ul>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">4. Exclusions</h2>
<p style="margin:0 0 8px">This Agreement does not apply to information that:</p>
<ul style="list-style:none;padding-left:16px;margin:0 0 10px">
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Becomes publicly available without breach of this Agreement;</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Was lawfully in the Receiving Party's possession prior to disclosure;</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Is received from a third party legally entitled to disclose it; or</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span>Must be disclosed by law, with prompt written notice to the Disclosing Party.</li>
</ul>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">5. Term and Survival</h2>
<p style="margin:0 0 10px;text-align:justify">This Agreement commences on the Effective Date and remains in effect for the duration of the Parties' business relationship and for <strong>one (1) year</strong> thereafter. Trade secret obligations survive indefinitely.</p>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">6. Return or Destruction</h2>
<p style="margin:0 0 10px;text-align:justify">Upon termination or written request, the Receiving Party shall return or destroy all Confidential Information and certify compliance in writing.</p>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">7. Breach and Consequences</h2>
<p style="margin:0 0 6px;padding-left:14px;text-align:justify"><strong>(a) Notice and cure:</strong> Five (5) business days to cure upon written notice.</p>
<p style="margin:0 0 6px;padding-left:14px;text-align:justify"><strong>(b) Injunctive relief:</strong> Disclosing Party may seek immediate equitable relief without posting bond.</p>
<p style="margin:0 0 6px;padding-left:14px;text-align:justify"><strong>(c) Liability cap:</strong> Greater of USD $5,000 or six (6) months of contract value for wilful misconduct.</p>
<p style="margin:0 0 10px;padding-left:14px;text-align:justify"><strong>(d) Legal costs:</strong> Breaching party bears all reasonable legal fees.</p>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">8. Intellectual Property</h2>
<p style="margin:0 0 10px;text-align:justify">All Confidential Information remains the exclusive property of the Disclosing Party. No license or IP rights are granted to the Receiving Party.</p>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">9. Governing Law and Dispute Resolution</h2>
<p style="margin:0 0 10px;text-align:justify">Governed by the laws of Texas, United States. Disputes resolved by binding AAA arbitration in Houston, Texas.</p>

<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">10. Miscellaneous</h2>
<ul style="list-style:none;padding-left:16px;margin:0 0 10px">
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span><strong>Entire Agreement</strong> — supersedes all prior discussions.</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span><strong>No Waiver</strong> — waivers must be in writing.</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span><strong>Amendment</strong> — only by written instrument signed by both Parties.</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span><strong>Assignment</strong> — requires prior written consent.</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span><strong>Severability</strong> — invalid provisions severed; remainder survives.</li>
<li style="position:relative;padding-left:12px;margin-bottom:4px"><span style="position:absolute;left:0">–</span><strong>Electronic Execution</strong> — e-signatures are legally binding.</li>
</ul>`
}

function buildSigBlock(f: Record<string, string>, clientName: string, nbgSig?: string, clientSig?: string) {
  return `<h2 style="font-size:10.5pt;font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:18px 0 8px">11. Signatures</h2>
<p style="margin:0 0 20px;text-align:justify">IN WITNESS WHEREOF, the duly authorised representatives of the Parties have executed this Agreement as of the Effective Date first written above.</p>
<div style="margin-bottom:28px">
  <p style="font-size:9pt;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Service Provider</p>
  <p style="font-size:11pt;font-weight:700;margin:0 0 12px">NetBounce Global LLC</p>
  <div style="border-bottom:1px solid #999;min-height:52px;margin-bottom:4px;display:flex;align-items:flex-end;padding-bottom:4px">
    ${nbgSig ? `<img src="${nbgSig}" style="max-height:44px;max-width:200px" alt="NBG signature"/>` : '<span style="color:#ccc;font-style:italic;font-size:10pt">Awaiting signature</span>'}
  </div>
  <p style="font-size:9pt;color:#6b7280;margin:0 0 10px">Signature</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px">
    <div><p style="font-size:9pt;color:#6b7280;margin:0 0 2px">Name</p><p style="border-bottom:1px solid #ccc;padding-bottom:2px;font-size:10.5pt;min-height:18px">${f.disclosingSignatoryName || ''}</p></div>
    <div><p style="font-size:9pt;color:#6b7280;margin:0 0 2px">Title</p><p style="border-bottom:1px solid #ccc;padding-bottom:2px;font-size:10.5pt;min-height:18px">${f.disclosingSignatoryTitle || ''}</p></div>
    <div style="grid-column:1/-1"><p style="font-size:9pt;color:#6b7280;margin:0 0 2px">Date</p><p style="border-bottom:1px solid #ccc;padding-bottom:2px;font-size:10.5pt;min-height:18px">${fmtDate(f.disclosingSignatoryDate || '')}</p></div>
  </div>
</div>
<div style="height:1px;background:#e5e7eb;margin:0 0 24px"></div>
<div>
  <p style="font-size:9pt;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">Client</p>
  <p style="font-size:11pt;font-weight:700;margin:0 0 12px">${clientName || f.clientLegalName || '[Client]'}</p>
  <div style="border-bottom:1px solid #999;min-height:52px;margin-bottom:4px;display:flex;align-items:flex-end;padding-bottom:4px">
    ${clientSig ? `<img src="${clientSig}" style="max-height:44px;max-width:200px" alt="Client signature"/>` : '<span style="color:#ccc;font-style:italic;font-size:10pt">Awaiting signature</span>'}
  </div>
  <p style="font-size:9pt;color:#6b7280;margin:0 0 10px">Signature</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px">
    <div><p style="font-size:9pt;color:#6b7280;margin:0 0 2px">Name</p><p style="border-bottom:1px solid #ccc;padding-bottom:2px;font-size:10.5pt;min-height:18px">${f.receivingSignatoryName || ''}</p></div>
    <div><p style="font-size:9pt;color:#6b7280;margin:0 0 2px">Title</p><p style="border-bottom:1px solid #ccc;padding-bottom:2px;font-size:10.5pt;min-height:18px">${f.receivingSignatoryTitle || ''}</p></div>
    <div style="grid-column:1/-1"><p style="font-size:9pt;color:#6b7280;margin:0 0 2px">Date</p><p style="border-bottom:1px solid #ccc;padding-bottom:2px;font-size:10.5pt;min-height:18px">${fmtDate(f.receivingSignatoryDate || '')}</p></div>
  </div>
</div>
<div style="margin-top:40px;border-top:1px solid #e5e7eb;padding-top:10px;display:flex;justify-content:space-between;font-size:9pt;color:#9ca3af">
  <span>NetBounce Global LLC · Strictly Confidential</span>
  <span>myteam@netbounceglobal.com · +1 (915) 666-9102</span>
</div>`
}

export default function DocPreview({ type, fields, clientName = '', nbgSignature, clientSignature, readOnly = false, onBodyChange, customBody }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<string[]>(['', ''])
  
  const bodyHtml = customBody || buildNDABody(fields)
  const sigHtml = buildSigBlock(fields, clientName, nbgSignature, clientSignature)

  // Split content into A4 pages using a hidden measurement div
  useEffect(() => {
    const contentHeight = A4_HEIGHT - (PAGE_PADDING_V * 2)
    // For now render body on page 1, signatures on page 2
    // Content naturally flows within the page div
    setPages([bodyHtml, sigHtml])
  }, [bodyHtml, sigHtml])

  const pageStyle: React.CSSProperties = {
    width: `${A4_WIDTH}px`,
    minHeight: `${A4_HEIGHT}px`,
    margin: '0 auto',
    background: 'white',
    boxShadow: '0 1px 8px rgba(0,0,0,0.12)',
    padding: `${PAGE_PADDING_V}px ${PAGE_PADDING_H}px`,
    boxSizing: 'border-box',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '10.5pt',
    color: '#0D1F14',
    lineHeight: '1.7',
    position: 'relative',
  }

  const outerStyle: React.CSSProperties = {
    background: '#e8e8e6',
    padding: '24px 0',
    minHeight: '100%',
  }

  const breakStyle: React.CSSProperties = {
    width: `${A4_WIDTH}px`,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 0',
    color: '#9ca3af',
    fontSize: '10px',
    fontFamily: 'Arial, sans-serif',
    background: '#e8e8e6',
  }

  return (
    <div style={outerStyle} ref={containerRef}>
      {/* Page 1 — Document body */}
      <div style={{ ...pageStyle, marginBottom: '0px' }}>
        <div
          contentEditable={!readOnly}
          suppressContentEditableWarning
          style={{ outline: 'none' }}
          onInput={e => onBodyChange?.((e.target as HTMLDivElement).innerHTML)}
          dangerouslySetInnerHTML={{ __html: pages[0] }}
        />
      </div>

      {/* Page break */}
      <div style={breakStyle}>
        <div style={{ flex: 1, borderTop: '1px dashed #c4c4c4' }} />
        <span>page 2</span>
        <div style={{ flex: 1, borderTop: '1px dashed #c4c4c4' }} />
      </div>

      {/* Page 2 — Signatures */}
      <div style={pageStyle}>
        <div dangerouslySetInnerHTML={{ __html: pages[1] }} />
      </div>
    </div>
  )
}
```

---

## FIX 2 — Add delete functionality to the documents list and document detail page

### In `app/(dashboard)/page.tsx` (the documents list)

Add a delete button to each row. First add this client component at the bottom of the file:

```tsx
'use client'
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
    <button onClick={() => setConfirm(true)} className="text-xs text-gray-300 hover:text-red-500 transition-colors ml-2" title="Delete">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3h9M5 3V2h3v1M4 3v7.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5V3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
    </button>
  )
}
```

Make sure `createClient` from `@/lib/supabase` and `useRouter` from `next/navigation` and `useState` from `react` are imported at the top of the component.

Then in the table rows, find the last `<td>` with the "View →" link and add the DeleteButton next to it:

```tsx
<td className="px-6 py-4">
  <div className="flex items-center gap-2">
    <Link href={`/dashboard/documents/${doc.id}`} className="text-brand-700 text-xs font-medium hover:underline">
      View →
    </Link>
    <DeleteButton id={doc.id} />
  </div>
</td>
```

### In `app/(dashboard)/documents/[id]/page.tsx` (document detail)

Add a delete button in the left panel at the bottom. Add this at the end of the info panel, after the audit trail section:

```tsx
<div className="p-6 border-t border-gray-100 mt-auto">
  <DeleteDocButton id={doc.id} />
</div>
```

Add this client component at the bottom of the file:

```tsx
'use client'
function DeleteDocButton({ id }: { id: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [confirm, setConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('audit_trail').delete().eq('document_id', id)
    await supabase.from('documents').delete().eq('id', id)
    router.push('/dashboard')
  }

  if (confirm) return (
    <div className="space-y-2">
      <p className="text-xs text-red-500 font-medium">This will permanently delete the document and all activity. Are you sure?</p>
      <div className="flex gap-2">
        <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 disabled:opacity-60">{deleting ? 'Deleting…' : 'Yes, delete'}</button>
        <button onClick={() => setConfirm(false)} className="flex-1 py-2 border border-gray-200 text-xs text-gray-600 rounded-lg hover:bg-gray-50">Cancel</button>
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
```

---

## FIX 3 — Gmail OAuth setup — add a settings page for Gmail configuration

### Create new file `app/(dashboard)/settings/page.tsx`

```tsx
import { createServerSupabaseClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const gmailConfigured = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN)

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-brand-900 mb-1">Settings</h1>
      <p className="text-gray-500 text-sm mb-8">Configuration and integrations</p>

      {/* Gmail Setup */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-brand-900">Gmail Integration</h2>
            <p className="text-xs text-gray-500 mt-0.5">Required for sending signing request emails to clients</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${gmailConfigured ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {gmailConfigured ? 'Connected' : 'Not configured'}
          </span>
        </div>
        <div className="px-6 py-5">
          {gmailConfigured ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-brand-900">Gmail is connected</p>
                <p className="text-xs text-gray-500">Signing emails will be sent from myteam@netbounceglobal.com</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-bold mb-2">Gmail not configured — follow these steps:</p>
                <ol className="space-y-2 text-xs leading-relaxed">
                  <li><strong>Step 1:</strong> Go to <a href="https://console.cloud.google.com" target="_blank" className="underline">console.cloud.google.com</a> → Create a new project called "NBG DocSign"</li>
                  <li><strong>Step 2:</strong> In the project, go to APIs & Services → Enable APIs → search for "Gmail API" → Enable it</li>
                  <li><strong>Step 3:</strong> Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID → Application type: Web application → Add <code className="bg-amber-100 px-1 rounded">https://developers.google.com/oauthplayground</code> as an authorized redirect URI → Save → Copy the Client ID and Client Secret</li>
                  <li><strong>Step 4:</strong> Go to <a href="https://developers.google.com/oauthplayground" target="_blank" className="underline">developers.google.com/oauthplayground</a> → Click the settings gear (top right) → Check "Use your own OAuth credentials" → Paste your Client ID and Client Secret → Close</li>
                  <li><strong>Step 5:</strong> In the left panel, find "Gmail API v1" → select <code className="bg-amber-100 px-1 rounded">https://mail.google.com/</code> → Authorize APIs → Sign in with myteam@netbounceglobal.com → Allow</li>
                  <li><strong>Step 6:</strong> Click "Exchange authorization code for tokens" → Copy the Refresh Token</li>
                  <li><strong>Step 7:</strong> In Vercel → your project → Settings → Environment Variables → add these 4 values and redeploy:</li>
                </ol>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 font-mono text-xs space-y-1.5">
                <p><span className="text-gray-400">GMAIL_CLIENT_ID</span> <span className="text-brand-700">= paste from Step 3</span></p>
                <p><span className="text-gray-400">GMAIL_CLIENT_SECRET</span> <span className="text-brand-700">= paste from Step 3</span></p>
                <p><span className="text-gray-400">GMAIL_REFRESH_TOKEN</span> <span className="text-brand-700">= paste from Step 6</span></p>
                <p><span className="text-gray-400">GMAIL_SENDER_EMAIL</span> <span className="text-brand-700">= myteam@netbounceglobal.com</span></p>
              </div>
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                className="inline-block bg-brand-900 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-800"
              >
                Open Google Cloud Console →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Signing URL */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-brand-900">Signing URL</h2>
          <p className="text-xs text-gray-500 mt-0.5">The base URL used in all signing links</p>
        </div>
        <div className="px-6 py-5">
          <div className="bg-gray-50 rounded-lg px-4 py-3 font-mono text-sm text-brand-700">
            {process.env.NEXT_PUBLIC_APP_URL || 'Not configured'}
          </div>
          <p className="text-xs text-gray-400 mt-2">Set via NEXT_PUBLIC_APP_URL environment variable in Vercel</p>
        </div>
      </div>
    </div>
  )
}
```

### Add Settings to the sidebar navigation

In `components/ui/Sidebar.tsx`, find the `NAV` array and add a settings item:

```tsx
const NAV = [
  { href: '/dashboard',          label: 'All Documents',  icon: 'docs'     },
  { href: '/dashboard/new',      label: 'New Document',   icon: 'plus'     },
  { href: '/dashboard/settings', label: 'Settings',       icon: 'settings' },
]
```

And add the settings icon to the `Icon` component:

```tsx
if (name === 'settings') return (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)
```

---

## FIX 4 — Show signing link prominently on document detail page

In `app/(dashboard)/documents/[id]/page.tsx`, find the left panel and add a signing link section. After the status/client info block and before DocumentActions, add:

```tsx
{/* Signing link — prominent display */}
{(doc.status === 'sent' || doc.status === 'viewed') && (
  <div className="p-5 border-b border-gray-100 bg-brand-50">
    <p className="text-xs font-bold text-brand-800 mb-1">Signing link</p>
    <p className="text-xs text-gray-500 mb-3">Gmail not configured — share this link manually with the client</p>
    <SigningLinkBox token={doc.signing_token} />
  </div>
)}
```

Add this new client component at the bottom of the file:

```tsx
'use client'
function SigningLinkBox({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const [url, setUrl] = useState('')

  useEffect(() => {
    setUrl(`${window.location.origin}/sign/${token}`)
  }, [token])

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div>
      <div className="bg-white rounded-lg border border-brand-100 px-3 py-2 mb-2">
        <p className="text-xs text-brand-700 font-mono break-all leading-relaxed">{url || '…'}</p>
      </div>
      <button
        onClick={copy}
        className="w-full bg-brand-900 text-white text-xs font-bold py-2.5 rounded-lg hover:bg-brand-800 transition-colors"
      >
        {copied ? '✓ Copied!' : 'Copy link'}
      </button>
    </div>
  )
}
```

Make sure `useState` and `useEffect` from `react` are imported.

---

Please make all 4 fixes, commit to the repository, and deploy.
