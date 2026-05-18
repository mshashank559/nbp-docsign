// Document HTML template builder for download-pdf API route
export function buildDocumentHTML(doc: any, fmtDate: (d: string) => string, ph: (val: string, label: string) => string) {
  const docLabel = {
    NDA: 'Non-Disclosure Agreement',
    MSA: 'Master Service Agreement',
    SLA: 'Service Level Agreement',
    SOW: 'Statement of Work',
    LOE: 'Letter of Engagement',
  }[doc.type as string] || doc.type

  const signedTime = doc.signed_at ? new Date(doc.signed_at).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' }) : ''
  const f = doc.fields || {}

  function buildNDAContent() {
    return `
      <p><strong>Effective Date:</strong> ${ph(fmtDate(f.effectiveDate), 'Effective Date')}</p>
      <p style="margin-top:16px">This Non-Disclosure Agreement is entered into as of ${ph(fmtDate(f.effectiveDate), 'Effective Date')} by and between:</p>
      <p style="margin:12px 0 12px 20px;border-left:3px solid #e5e7eb;padding-left:12px"><strong>NetBounce Placement LLC</strong>, a limited liability company organised under the laws of Texas, having its registered office at ${ph(f.txAddress, 'Registered Address')}, and its principal operations at Ahmedabad, India (the <strong>"Disclosing Party"</strong>);</p>
      <p style="text-align:center;font-weight:bold;margin:12px 0">AND</p>
      <p style="margin:12px 0 12px 20px;border-left:3px solid #e5e7eb;padding-left:12px"><strong>${ph(f.clientLegalName, 'Client Legal Name')}</strong>, organised under the laws of ${ph(f.clientJurisdiction, 'Client Jurisdiction')}, having its principal offices in the United States (the <strong>"Receiving Party"</strong>).</p>
      <p><em>Collectively the <strong>"Parties"</strong> and individually a <strong>"Party."</strong></em></p>
      <h3>1. Purpose and Business Purpose</h3>
      <p>The Parties intend to engage in discussions regarding offshore accounting staffing services (the "Business Purpose"). This Agreement protects the confidentiality of such information and ensures it is used solely in connection with the Business Purpose.</p>
      <h3>2. Definition of Confidential Information</h3>
      <p>"Confidential Information" means any non-public, proprietary, or confidential information disclosed in any form, including business plans, financial statements, client lists, technical data, trade secrets, and any information a reasonable person would understand to be confidential.</p>
      <h3>3. Obligations of the Receiving Party</h3>
      <p>The Receiving Party agrees to: use Confidential Information solely for the Business Purpose; maintain confidentiality with at least reasonable care; not disclose to any third party without prior written consent; and promptly notify of any unauthorized disclosure.</p>
      <h3>4. Exclusions</h3>
      <p>This Agreement does not apply to information that becomes publicly available without breach, was lawfully known before disclosure, is received from a third party, is independently developed, or must be disclosed by law.</p>
      <h3>5. Term and Survival</h3>
      <p>This Agreement commences on the Effective Date and remains in effect for the duration of the Parties' business relationship and for <strong>one (1) year</strong> thereafter. Trade secret obligations survive indefinitely.</p>
      <h3>6. Return or Destruction</h3>
      <p>Upon termination or written request, the Receiving Party shall return or destroy all Confidential Information and certify compliance in writing.</p>
      <h3>7. Breach and Consequences</h3>
      <p><strong>(a) Notice and cure:</strong> Five (5) business days to cure upon written notice.<br><strong>(b) Injunctive relief:</strong> Disclosing Party may seek immediate equitable relief without posting bond.<br><strong>(c) Liability cap:</strong> Greater of USD $5,000 or six (6) months of contract value for wilful misconduct.<br><strong>(d) Legal costs:</strong> Breaching party bears all reasonable legal fees.</p>
      <h3>8. Intellectual Property</h3>
      <p>All Confidential Information remains the exclusive property of the Disclosing Party. No license or IP rights are granted to the Receiving Party.</p>
      <h3>9. Governing Law and Dispute Resolution</h3>
      <p>Governed by the laws of Texas, United States. Disputes resolved by binding AAA arbitration in Houston, Texas.</p>
      <h3>10. Miscellaneous</h3>
      <p>Entire Agreement — supersedes all prior discussions. No Waiver — waivers must be in writing. Amendment — only by written instrument. Assignment — requires prior written consent. Severability — invalid provisions severed. Electronic Execution — e-signatures are legally binding.</p>
    `
  }

  function buildMSAContent() {
    const tasks = (f.tasks || '').split('\n').map((t: string) => t.trim()).filter(Boolean).map((t: string) => `<li>${t}</li>`).join('')
    return `
      <p><strong>Effective Date:</strong> ${ph(fmtDate(f.effectiveDate), 'Effective Date')} &nbsp;·&nbsp; <strong>Role:</strong> ${ph(f.role, 'Role')} &nbsp;·&nbsp; <strong>Engagement:</strong> ${ph(f.engagementType, 'Type')}</p>
      <p style="margin-top:16px">This Master Service Agreement is entered into as of ${ph(fmtDate(f.effectiveDate), 'Effective Date')} by and between <strong>NetBounce Placement LLC</strong>, registered at ${ph(f.txAddress, 'Registered Address')} (the "Service Provider"), and ${ph(f.clientLegalName, 'Client Legal Name')}, a ${ph(f.clientEntityType, 'Entity Type')} at ${ph(f.clientAddress, 'Client Address')} (the "Client").</p>
      <h3>Part A — Legal Framework</h3>
      <p><strong>A.1 Services.</strong> NetBounce shall provide offshore accounting staffing as described in Part B.<br><strong>A.2 Relationship.</strong> NetBounce is employer of record. Staff are not employees of the Client.<br><strong>A.3 Confidentiality.</strong> Strict confidentiality for 3 years post-termination, indefinitely for trade secrets.<br><strong>A.4 IP.</strong> All deliverables are sole property of the Client.<br><strong>A.5 Fees.</strong> Invoices due within ${ph(f.paymentTerms, 'payment terms')}. Late payments accrue 1.5%/month.<br><strong>A.6 Term.</strong> Initial term: ${ph(f.initialTerm, 'initial term')}. ${ph(f.noticePeriod, 'notice period')} notice to terminate.<br><strong>A.7 Liability.</strong> Capped at 3 months of fees. No consequential damages.<br><strong>A.8 Non-Solicitation.</strong> No hiring of NPB staff for 12 months post-termination.</p>
      <h3>Part B — Scope of Work</h3>
      <p><strong>Role:</strong> ${ph(f.role, 'Role')}<br><strong>Overview:</strong> ${ph(f.scopeOverview, 'Scope Overview')}<br><strong>Software:</strong> ${ph(f.software, 'Software')}</p>
      ${tasks ? `<p><strong>Monthly Tasks:</strong></p><ul>${tasks}</ul>` : ''}
      <h3>Part C — Engagement Model</h3>
      <p><strong>Hours:</strong> ${ph(f.engagementHoursPerWeek, 'X')} hrs/week (${ph(f.engagementHoursPerMonth, 'X')} hrs/month)<br><strong>Monthly Retainer:</strong> USD $${ph(f.monthlyFee, 'Amount')}<br><strong>Billing:</strong> ${ph(f.billingCycle, 'Billing Cycle')} · Payment: ${ph(f.paymentMethod, 'Method')}</p>
      <h3>Part D — Service Level Agreement</h3>
      <p>Email response within 24 hours. Monthly reports by the ${ph(f.deliveryDay, '10th')} calendar day. Replacement within ${ph(f.replacementDays, '14')} business days. Error correction at no charge.</p>
      <h3>Part E — Prerequisites</h3>
      <p>Software: ${ph(f.prereqSoftware, 'Software')} · Contact: ${ph(f.prereqContactName, 'Name')} (${ph(f.prereqContactEmail, 'Email')})</p>
      <h3>Part F — Special Notes</h3>
      <p>${ph(f.specialNotes, 'None — standard terms apply.')}</p>
    `
  }

  const bodyContent = doc.type === 'NDA' ? buildNDAContent() : buildMSAContent()

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${docLabel} — NetBounce Placement LLC</title>
<style>
  @page { size: A4; margin: 72px 80px; }
  @media print { .no-print { display: none !important; } button { display: none !important; } }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; color: #0D1F14; line-height: 1.7; margin: 0; padding: 40px 60px; max-width: 794px; margin: 0 auto; }
  h1 { font-size: 22pt; font-weight: 700; margin: 0 0 8px; }
  h2 { font-size: 11pt; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin: 20px 0 8px; }
  h3 { font-size: 10.5pt; font-weight: 700; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin: 16px 0 6px; }
  p { margin: 0 0 10px; text-align: justify; }
  ul { padding-left: 20px; margin: 0 0 10px; }
  li { margin-bottom: 4px; }
  .header-bar { border-top: 4px solid #0D1F14; padding-top: 24px; margin-bottom: 28px; }
  .company { font-size: 11pt; font-weight: 700; color: #1A3C28; margin-bottom: 8px; }
  .divider { height: 1px; background: #e5e7eb; margin: 16px 0; }
  .signed-banner { background: #f0faf4; border: 1px solid #A8D5B8; border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 10pt; }
  .sig-block { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  .sig-party { margin-bottom: 28px; }
  .sig-label { font-size: 9pt; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .sig-entity { font-size: 11pt; font-weight: 700; margin-bottom: 12px; }
  .sig-line { border-bottom: 1px solid #999; min-height: 52px; margin-bottom: 4px; display: flex; align-items: flex-end; padding-bottom: 4px; }
  .sig-line img { max-height: 44px; max-width: 200px; }
  .sig-line-label { font-size: 9pt; color: #6b7280; margin-bottom: 10px; }
  .sig-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin-top: 8px; }
  .sig-field-label { font-size: 9pt; color: #6b7280; margin-bottom: 2px; }
  .sig-field-value { border-bottom: 1px solid #ccc; padding-bottom: 2px; font-size: 10.5pt; min-height: 18px; }
  .footer { margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9pt; color: #9ca3af; }
  .print-btn { position: fixed; top: 20px; right: 20px; background: #0D1F14; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; font-family: Arial; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
<div class="header-bar">
  <p class="company">NetBounce Placement LLC</p>
  <h1>${docLabel}</h1>
  <div class="divider"></div>
  <p><strong>Client:</strong> ${doc.client_name} · ${doc.client_email}${doc.client_company ? ' · ' + doc.client_company : ''}</p>
  ${doc.signed_at ? `<p><strong>Status:</strong> Signed on ${signedTime}</p>` : `<p><strong>Status:</strong> ${doc.status}</p>`}
</div>
${doc.signed_at ? `<div class="signed-banner">✓ This document was electronically signed by <strong>${doc.fields?.receivingSignatoryName || doc.client_name}</strong> (${doc.client_email}) on <strong>${signedTime}</strong>.</div>` : ''}
${bodyContent}
<div class="sig-block">
  <h2>Signatures</h2>
  <p>IN WITNESS WHEREOF, the duly authorised representatives of the Parties have executed this Agreement as of the Effective Date first written above.</p>
  <div class="sig-party" style="margin-top:24px">
    <p class="sig-label">Service Provider</p>
    <p class="sig-entity">NetBounce Placement LLC</p>
    <div class="sig-line">${doc.nbg_signature ? `<img src="${doc.nbg_signature}" alt="NPB signature"/>` : '<span style="color:#ccc;font-style:italic;font-size:10pt">Signature pending</span>'}</div>
    <p class="sig-line-label">Signature</p>
    <div class="sig-fields">
      <div><p class="sig-field-label">Name</p><p class="sig-field-value">${f.disclosingSignatoryName || ''}</p></div>
      <div><p class="sig-field-label">Title</p><p class="sig-field-value">${f.disclosingSignatoryTitle || ''}</p></div>
      <div style="grid-column:1/-1"><p class="sig-field-label">Date</p><p class="sig-field-value">${fmtDate(f.disclosingSignatoryDate || '')}</p></div>
    </div>
  </div>
  <div style="height:1px;background:#e5e7eb;margin:20px 0"></div>
  <div class="sig-party">
    <p class="sig-label">Client</p>
    <p class="sig-entity">${doc.client_name}</p>
    <div class="sig-line">${doc.client_signature ? `<img src="${doc.client_signature}" alt="Client signature"/>` : '<span style="color:#ccc;font-style:italic;font-size:10pt">Signature pending</span>'}</div>
    <p class="sig-line-label">Signature</p>
    <div class="sig-fields">
      <div><p class="sig-field-label">Name</p><p class="sig-field-value">${f.receivingSignatoryName || doc.client_name}</p></div>
      <div><p class="sig-field-label">Title</p><p class="sig-field-value">${f.receivingSignatoryTitle || ''}</p></div>
      <div style="grid-column:1/-1"><p class="sig-field-label">Date</p><p class="sig-field-value">${doc.signed_at ? fmtDate(doc.signed_at.split('T')[0]) : ''}</p></div>
    </div>
  </div>
</div>
<div class="footer">
  <span>NetBounce Placement LLC · Strictly Confidential</span>
  <span>enroll@netbounceplacement.com · +1 (915) 666-9102 · www.netbounceglobal.com</span>
</div>
</body>
</html>`
}
