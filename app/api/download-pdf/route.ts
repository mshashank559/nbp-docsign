import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DOCUMENT_TYPE_LABELS } from '@/lib/document-catalog'
import { normalizeDocument } from '@/lib/document-normalize'
import { incrementDocumentViewCount, insertAuditEvent } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id    = searchParams.get('id')
  const token = searchParams.get('token')
  const alreadyTracked = searchParams.get('tracked') === '1'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const query = id
    ? supabase.from('documents').select('*').eq('id', id).single()
    : supabase.from('documents').select('*').eq('signing_token', token!).single()

  const { data: doc, error } = await query
  if (error || !doc) return new NextResponse('Document not found', { status: 404 })

  const normalizedDoc = normalizeDocument(doc)
  if (token && !alreadyTracked && normalizedDoc.status === 'sent') {
    await supabase.from('documents').update({ status: 'viewed', view_count: Number(normalizedDoc.view_count || 0) + 1 }).eq('id', normalizedDoc.id)
    await insertAuditEvent(supabase, req, {
      document_id: normalizedDoc.id,
      event: 'Document downloaded by client',
      actor: normalizedDoc.client_email,
      metadata: { source: 'download-pdf', type: normalizedDoc.type },
    })
    doc.status = 'viewed'
  } else if (token && !alreadyTracked) {
    await incrementDocumentViewCount(supabase, normalizedDoc)
    await insertAuditEvent(supabase, req, {
      document_id: normalizedDoc.id,
      event: 'Document downloaded by client',
      actor: normalizedDoc.client_email,
      metadata: { source: 'download-pdf', type: normalizedDoc.type },
    })
  }

  const f = doc.fields || {}

  function fmtDate(d: string) {
    if (!d) return ''
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) } catch { return d }
  }

  function val(v: string, fallback = '') {
    return v || fallback
  }

  const docLabel: Record<string, string> = DOCUMENT_TYPE_LABELS

  const signedAt = doc.signed_at
    ? new Date(doc.signed_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
    : ''

  function section(num: string, title: string, content: string) {
    return `
      <div class="section">
        <div class="section-header">
          <span class="section-num">${num}.</span>
          <h3 class="section-title">${title}</h3>
        </div>
        <p class="section-body">${content}</p>
      </div>`
  }

  function buildNDAContent() {
    return `
      <div class="doc-header">
        <div class="doc-header-left">
          <p class="company-label">NetBounce Placement LLC</p>
          <h1 class="doc-title">Non-Disclosure<br>Agreement</h1>
        </div>
        <div class="doc-header-right">
          <p class="confidential-label">STRICTLY CONFIDENTIAL</p>
          <p class="effective-label">Effective ${fmtDate(f.effectiveDate) || 'Date to be confirmed'}</p>
        </div>
      </div>

      <div class="parties-grid">
        <div class="party-box">
          <p class="party-role">Disclosing Party</p>
          <p class="party-name">NetBounce Placement LLC</p>
          <p class="party-detail">Service Provider · Austin, Texas</p>
        </div>
        <div class="party-and">&amp;</div>
        <div class="party-box">
          <p class="party-role">Receiving Party</p>
          <p class="party-name">${val(f.clientLegalName, '[Client Legal Name]')}</p>
          <p class="party-detail">${val(f.clientJurisdiction, '[Jurisdiction]')}</p>
        </div>
      </div>

      <p class="intro-para">This Non-Disclosure Agreement (the <strong>"Agreement"</strong>) is entered into as of ${fmtDate(f.effectiveDate) || '[Effective Date]'} by and between <strong>NetBounce Placement LLC</strong>, a limited liability company organised under the laws of Texas, United States, having its registered office at ${val(f.txAddress, '[Registered Address]')}, and its principal operations at Ahmedabad, India (<strong>"Disclosing Party"</strong>); and <strong>${val(f.clientLegalName, '[Client]')}</strong>, organised under the laws of ${val(f.clientJurisdiction, '[Jurisdiction]')} (<strong>"Receiving Party"</strong>). Collectively the <strong>"Parties."</strong></p>

      <div class="divider"></div>

      ${section('1', 'Purpose', 'The Parties intend to evaluate a potential business relationship involving offshore accounting staffing services (the <strong>"Business Purpose"</strong>). This Agreement governs the disclosure and protection of confidential information shared in connection with that evaluation.')}
      ${section('2', 'Confidential Information', '<strong>"Confidential Information"</strong> means all non-public, proprietary, or sensitive information disclosed in any form, including: business plans, financial data, pricing models, client lists, employee information, technical systems, trade secrets, and any information a reasonable person would understand to be confidential given the circumstances of disclosure.')}
      ${section('3', 'Obligations of the Receiving Party', 'The Receiving Party shall: <strong>(a)</strong> use Confidential Information solely for the Business Purpose; <strong>(b)</strong> maintain confidentiality with at least the same care it uses for its own confidential information, but no less than reasonable care; <strong>(c)</strong> not disclose to any third party without prior written consent; <strong>(d)</strong> limit internal disclosure strictly to those who need to know and are bound by equivalent obligations; and <strong>(e)</strong> promptly notify the Disclosing Party of any unauthorised disclosure.')}
      ${section('4', 'Exclusions', 'This Agreement does not apply to information that: <strong>(a)</strong> is or becomes publicly available without breach; <strong>(b)</strong> was lawfully known to the Receiving Party prior to disclosure; <strong>(c)</strong> is rightfully received from a third party without restriction; <strong>(d)</strong> is independently developed without reference to Confidential Information; or <strong>(e)</strong> must be disclosed by law or court order, subject to prompt written notice to the Disclosing Party.')}
      ${section('5', 'Term and Survival', 'This Agreement commences on the Effective Date and remains in force for the duration of the business relationship and for <strong>one (1) year</strong> thereafter. Obligations relating to trade secrets survive indefinitely.')}
      ${section('6', 'Return of Information', 'Upon request or termination, the Receiving Party shall promptly return or certifiably destroy all Confidential Information in any format and confirm compliance in writing within five (5) business days.')}
      ${section('7', 'Remedies', 'The Parties acknowledge that breach of this Agreement would cause irreparable harm for which monetary damages alone would be insufficient. The Disclosing Party shall be entitled to seek immediate injunctive or equitable relief without the necessity of posting bond, in addition to all other remedies available at law.')}
      ${section('8', 'Intellectual Property', 'No rights, licenses, or interests in any intellectual property are granted under this Agreement. All Confidential Information remains the sole property of the Disclosing Party.')}
      ${section('9', 'Governing Law', 'This Agreement shall be governed by the laws of the State of <strong>Texas, United States</strong>. Any disputes shall be resolved by binding AAA arbitration in Houston, Texas.')}
      ${section('10', 'General Provisions', '<strong>Entire Agreement:</strong> Supersedes all prior discussions on this subject. <strong>Amendment:</strong> Only by written instrument signed by both Parties. <strong>No Waiver:</strong> Failure to enforce any provision shall not constitute a waiver. <strong>Severability:</strong> If any provision is invalid, the remainder continues in full force. <strong>Electronic Execution:</strong> Digital signatures are legally binding and of full effect.')}`
  }

  function buildSignatureBlock() {
    const isAgreement = doc.type === 'agreement'
    return `
      <div class="sig-section">
        <h3 class="sig-heading">${isAgreement ? 'Custom Sign' : 'Signatures&nbsp; Execution'}</h3>
        <p class="sig-intro">${isAgreement ? 'The receiver completed the custom signature field using the selected electronic signature method.' : 'IN WITNESS WHEREOF, the duly authorised representatives of the Parties have executed this Agreement as of the Effective Date written above.'}</p>

        ${doc.signed_at ? `
        <div class="signed-banner">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style="flex-shrink:0"><path d="M2 7l4 4 6-6" stroke="#059669" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Electronically signed by <strong>${f.receivingSignatoryName || doc.client_name}</strong> on ${signedAt}
        </div>` : ''}

        <div class="sig-grid">
          <div class="sig-party">
            <p class="sig-role">${isAgreement ? 'Pre-Authority Sign' : 'Service Provider'}</p>
            <p class="sig-entity">NetBounce Placement LLC</p>
            <div class="sig-line">
              ${f.priAuthoritySignatureImage ? `<img src="${f.priAuthoritySignatureImage}" class="sig-img" alt="PRI authority signature"/>` : doc.nbg_signature ? `<img src="${doc.nbg_signature}" class="sig-img" alt="NPB signature"/>` : '<span class="sig-placeholder">Signature pending</span>'}
            </div>
            <p class="sig-line-label">Authorised Signature</p>
            <div class="sig-fields">
              <div class="sig-field"><span class="sig-field-label">Name</span><span class="sig-field-value">${val(f.disclosingSignatoryName)}</span></div>
              <div class="sig-field"><span class="sig-field-label">Title</span><span class="sig-field-value">${val(f.disclosingSignatoryTitle)}</span></div>
              <div class="sig-field" style="grid-column:1/-1"><span class="sig-field-label">Date</span><span class="sig-field-value">${fmtDate(f.disclosingSignatoryDate || '')}</span></div>
            </div>
          </div>

          <div class="sig-divider"></div>

          <div class="sig-party">
            <p class="sig-role">${isAgreement ? 'Receiver' : 'Client'}</p>
            <p class="sig-entity">${val(doc.client_name, '[Client]')}</p>
            <div class="sig-line">
              ${doc.client_signature ? `<img src="${doc.client_signature}" class="sig-img" alt="Client signature"/>` : '<span class="sig-placeholder">Signature pending</span>'}
            </div>
            <p class="sig-line-label">Authorised Signature</p>
            <div class="sig-fields">
              <div class="sig-field"><span class="sig-field-label">Name</span><span class="sig-field-value">${val(f.receivingSignatoryName, doc.client_name)}</span></div>
              <div class="sig-field"><span class="sig-field-label">Title</span><span class="sig-field-value">${val(f.receivingSignatoryTitle)}</span></div>
              <div class="sig-field" style="grid-column:1/-1"><span class="sig-field-label">Date</span><span class="sig-field-value">${doc.signed_at ? fmtDate(doc.signed_at.split('T')[0]) : ''}</span></div>
            </div>
          </div>
        </div>
      </div>`
  }

  function buildPlacedSignature() {
    if (!doc.client_signature || !f.signaturePosition) return ''
    try {
      const pos = typeof f.signaturePosition === 'string' ? JSON.parse(f.signaturePosition) : f.signaturePosition
      const x = Math.min(86, Math.max(4, Number(pos.x) || 62))
      const y = Math.min(88, Math.max(8, Number(pos.y) || 72))
      return `<img src="${doc.client_signature}" alt="Placed signature" style="position:absolute;left:${x}%;top:${y}%;width:150px;max-height:70px;object-fit:contain;background:rgba(255,255,255,0.75);padding:4px;border:1px solid #d1d5db;border-radius:6px"/>`
    } catch {
      return ''
    }
  }

  function buildGenericContent() {
    const rows = Object.entries(f)
      .filter(([, value]) => value)
      .map(([key, value]) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #eee;color:#6b7280;font-weight:600">${key.replace(/([A-Z])/g, ' $1')}</td><td style="padding:8px 10px;border-bottom:1px solid #eee">${value}</td></tr>`)
      .join('')

    return `
      <div class="doc-header">
        <div class="doc-header-left">
          <p class="company-label">NetBounce Placement LLC</p>
          <h1 class="doc-title">${docLabel[doc.type] || doc.type}</h1>
        </div>
        <div class="doc-header-right">
          <p class="confidential-label">Document Management</p>
          <p class="effective-label">${fmtDate(f.effectiveDate || f.issueDate || f.startDate) || 'Date to be confirmed'}</p>
        </div>
      </div>
      <p class="intro-para">This ${docLabel[doc.type] || doc.type} was generated through the NetBounce Placement DocSign workflow for ${val(doc.client_name, '[Recipient]')}.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:10pt">${rows || '<tr><td>No custom fields were provided.</td></tr>'}</table>`
  }

  function fieldRow(label: string, value: string, fallback: string) {
    return `<tr><td style="padding:8px 10px;border-bottom:1px solid #eee;color:#6b7280;font-weight:600;width:210px">${label}</td><td style="padding:8px 10px;border-bottom:1px solid #eee">${val(value, fallback)}</td></tr>`
  }

  function buildAgreementContent() {
    return `
      <div class="doc-header">
        <div class="doc-header-left">
          <p class="company-label">NetBounce Placement LLC</p>
          <h1 class="doc-title">Agreement</h1>
        </div>
        <div class="doc-header-right">
          <p class="confidential-label">Sender-filled custom fields</p>
        </div>
      </div>
      <p class="intro-para">This Agreement records the enrollment, commercial understanding, and payment conditions agreed between <strong>NetBounce Placement LLC</strong> and <strong>${val(f.agreementName, '[Candidate Name]')}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:10pt">
        ${fieldRow('Enrollment Plan Type', f.enrollmentPlanType, '[Enrollment Plan Type]')}
        ${fieldRow('Final Payment Conditions', f.finalPaymentConditions, '[Final Payment Conditions]')}
        ${fieldRow('Current Agreed Payment Conditions', f.currentAgreedPaymentConditions || f.currentAgreedPaymentCondition, '[Current Agreed Payment Conditions]')}
        ${fieldRow('Candidate Name', f.agreementName, '[Filled by candidate]')}
        ${fieldRow('Candidate Address', f.agreementAddress, '[Filled by candidate]')}
        ${fieldRow('Candidate Contact Number', f.agreementContact, '[Filled by candidate]')}
      </table>
      ${section('1', 'Agreement Confirmation', 'The sender confirms that the admin-controlled payment fields are complete and accurate. The candidate supplies their own name, address, contact number, and signature during completion.')}
      ${section('2', 'Electronic Signature', 'The receiver signature may be completed by typing a name, drawing a signature, or uploading a signature image. Once submitted, the electronic signature is treated as acceptance of the terms recorded in this Agreement.')}`
  }

  const bodyContent = doc.type === 'agreement' ? buildAgreementContent() : buildGenericContent()
  const signedTime = doc.signed_at ? new Date(doc.signed_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : ''

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${docLabel[doc.type] || doc.type} — NetBounce Placement LLC</title>
<style>
  @page { size: A4; margin: 72px 80px; }
  @media print { .no-print { display: none !important; } button { display: none !important; } }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #0D1F14; line-height: 1.7; padding: 40px 60px; max-width: 794px; margin: 0 auto; position:relative; min-height:980px; }
  
  .doc-header { border-bottom:2px solid #111; padding-bottom:20px; margin-bottom:28px; display:flex; justify-content:space-between; align-items:flex-start; }
  .doc-header-left { }
  .doc-header-right { text-align:right; }
  .company-label { font-size:9pt; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#666; margin:0 0 6px; }
  .doc-title { font-size:26pt; font-weight:800; color:#111; line-height:1.1; margin:0; letter-spacing:-0.02em; }
  .confidential-label { font-size:8.5pt; color:#999; margin:0 0 3px; font-weight:500; }
  .effective-label { font-size:8.5pt; color:#999; margin:0; }
  
  .parties-grid { display:grid; grid-template-columns:1fr 40px 1fr; gap:0; margin-bottom:28px; align-items:start; }
  .party-box { padding:16px; background:#f9f9f9; border-radius:8px; }
  .party-role { font-size:8pt; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#999; margin:0 0 6px; }
  .party-name { font-size:11pt; font-weight:700; color:#111; margin:0 0 3px; }
  .party-detail { font-size:9pt; color:#666; margin:0; }
  .party-and { display:flex; align-items:center; justify-content:center; padding-top:20px; font-size:11pt; color:#ccc; font-weight:300; }
  
  .intro-para { font-size:10pt; color:#444; line-height:1.8; text-align:justify; margin:0 0 24px; }
  .divider { height:1px; background:#eee; margin:0 0 24px; }
  
  .section { margin-bottom:18px; }
  .section-header { display:flex; align-items:baseline; gap:10px; margin-bottom:5px; }
  .section-num { font-size:8pt; font-weight:700; color:#999; flex-shrink:0; min-width:16px; }
  .section-title { font-size:10pt; font-weight:700; color:#111; margin:0; letter-spacing:-0.01em; }
  .section-body { font-size:10pt; color:#444; line-height:1.75; text-align:justify; margin:0 0 0 26px; }
  
  .sig-section { margin-top:40px; }
  .sig-heading { font-size:10pt; font-weight:700; border-bottom:1px solid #e5e7eb; padding-bottom:4px; margin:18px 0 8px; }
  .sig-intro { margin:0 0 20px; text-align:justify; font-size:10pt; }
  .signed-banner { display:flex; align-items:center; gap:8px; background:#f0faf4; border:1px solid #a7d8b5; border-radius:8px; padding:12px 16px; margin:16px 0; font-size:10pt; color:#059669; }
  .sig-grid { display:grid; grid-template-columns:1fr 1px 1fr; gap:0 20px; }
  .sig-divider { background:#e5e7eb; }
  .sig-party { }
  .sig-role { font-size:9pt; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.06em; margin:0 0 4px; }
  .sig-entity { font-size:11pt; font-weight:700; margin:0 0 12px; }
  .sig-line { border-bottom:1px solid #999; min-height:52px; margin-bottom:4px; display:flex; align-items:flex-end; padding-bottom:4px; }
  .sig-img { max-height:44px; max-width:200px; }
  .sig-placeholder { color:#ccc; font-style:italic; font-size:10pt; }
  .sig-line-label { font-size:9pt; color:#6b7280; margin:0 0 10px; }
  .sig-fields { display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; margin-top:8px; }
  .sig-field { }
  .sig-field-label { font-size:9pt; color:#6b7280; margin:0 0 2px; display:block; }
  .sig-field-value { border-bottom:1px solid #ccc; padding-bottom:2px; font-size:10.5pt; min-height:18px; display:block; }
  
  .print-btn { position:fixed; top:20px; right:20px; background:#0D1F14; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-size:13px; font-family:Arial; z-index:9999; }
  
  @media (max-width: 768px) {
    body { padding: 20px; }
  }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>

${bodyContent}

${buildPlacedSignature()}

${buildSignatureBlock()}

<div style="margin-top:40px; border-top:1px solid #e5e7eb; padding-top:10px; display:flex; justify-content:space-between; font-size:9pt; color:#9ca3af">
  <span>NetBounce Placement LLC · Strictly Confidential</span>
  <span>enroll@netbounceplacement.com · +1 (915) 666-9102</span>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `inline; filename="${doc.type}_${doc.client_name.replace(/\s+/g, '_')}.html"`,
    },
  })
}
