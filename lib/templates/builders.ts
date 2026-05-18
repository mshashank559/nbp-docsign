/**
 * Document HTML builders.
 * Kept in a separate module so they can be code-split and are never
 * serialized into the webpack SSR cache as giant inline strings.
 */

function fmtDate(d: string) {
  if (!d) return ''
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return d }
}

function ph(val: string, label: string) {
  return val
    ? `<span style="font-weight:600;color:#111">${val}</span>`
    : `<span style="background:#f0f4ff;color:#4f6ef7;border:1px dashed #a5b4fc;border-radius:3px;padding:0 5px;font-style:italic;font-size:0.88em">${label}</span>`
}

function ndaSection(num: string, title: string, content: string) {
  return `
<div style="margin-bottom:18px">
  <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:5px">
    <span style="font-size:8pt;font-weight:700;color:#999;flex-shrink:0;min-width:16px">${num}.</span>
    <h3 style="font-size:10pt;font-weight:700;color:#111;margin:0;letter-spacing:-0.01em">${title}</h3>
  </div>
  <p style="font-size:10pt;color:#444;line-height:1.75;text-align:justify;margin:0 0 0 26px">${content}</p>
</div>`
}

export function buildNDABody(f: Record<string, string>): string {
  return `
<!-- Header -->
<div style="border-bottom:2px solid #111;padding-bottom:20px;margin-bottom:28px">
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <p style="font-size:9pt;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#666;margin:0 0 6px">NetBounce Placement LLC</p>
      <h1 style="font-size:26pt;font-weight:800;color:#111;line-height:1.1;margin:0;letter-spacing:-0.02em">Non-Disclosure<br>Agreement</h1>
    </div>
    <div style="text-align:right">
      <p style="font-size:8.5pt;color:#999;margin:0 0 3px;font-weight:500">STRICTLY CONFIDENTIAL</p>
      <p style="font-size:8.5pt;color:#999;margin:0">Effective ${ph(fmtDate(f.effectiveDate), 'DATE')}</p>
    </div>
  </div>
</div>

<!-- Parties -->
<div style="display:grid;grid-template-columns:1fr 40px 1fr;gap:0;margin-bottom:28px;align-items:start">
  <div style="padding:16px;background:#f9f9f9;border-radius:8px">
    <p style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:0 0 6px">Disclosing Party</p>
    <p style="font-size:11pt;font-weight:700;color:#111;margin:0 0 3px">NetBounce Placement LLC</p>
    <p style="font-size:9pt;color:#666;margin:0 0 2px">Service Provider</p>
    <p style="font-size:9pt;color:#666;margin:0">Austin, Texas, United States</p>
  </div>
  <div style="display:flex;align-items:center;justify-content:center;padding-top:20px">
    <span style="font-size:11pt;color:#ccc;font-weight:300">&amp;</span>
  </div>
  <div style="padding:16px;background:#f9f9f9;border-radius:8px">
    <p style="font-size:8pt;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:0 0 6px">Receiving Party</p>
    <p style="font-size:11pt;font-weight:700;color:#111;margin:0 0 3px">${ph(f.clientLegalName, 'CLIENT LEGAL NAME')}</p>
    <p style="font-size:9pt;color:#666;margin:0">${ph(f.clientJurisdiction, 'STATE / JURISDICTION')}</p>
  </div>
</div>

<!-- Intro -->
<p style="font-size:10pt;color:#444;line-height:1.8;text-align:justify;margin:0 0 24px">
  This Non-Disclosure Agreement (the <strong>"Agreement"</strong>) is entered into as of ${ph(fmtDate(f.effectiveDate), 'EFFECTIVE DATE')} by and between <strong>NetBounce Placement LLC</strong>, a limited liability company organised under the laws of the State of Texas, United States, having its registered office at ${ph(f.txAddress, 'REGISTERED ADDRESS')}, and its principal operations at Ahmedabad, India (<strong>"Disclosing Party"</strong>); and ${ph(f.clientLegalName, 'CLIENT LEGAL NAME')}, organised under the laws of ${ph(f.clientJurisdiction, 'CLIENT JURISDICTION')} (<strong>"Receiving Party"</strong>). Collectively the <strong>"Parties."</strong>
</p>

<div style="height:1px;background:#eee;margin:0 0 24px"></div>

<!-- Sections -->
${ndaSection('1', 'Purpose', `The Parties intend to evaluate a potential business relationship involving offshore accounting staffing services (the <strong>"Business Purpose"</strong>). This Agreement governs the disclosure and protection of confidential information shared in connection with that evaluation.`)}

${ndaSection('2', 'Confidential Information', `<strong>"Confidential Information"</strong> means all non-public, proprietary, or sensitive information disclosed in any form, including: business plans, financial data, pricing models, client lists, employee information, technical systems, trade secrets, and any information a reasonable person would understand to be confidential given the circumstances.`)}

${ndaSection('3', 'Obligations', `The Receiving Party shall: <strong>(a)</strong> use Confidential Information solely for the Business Purpose; <strong>(b)</strong> maintain confidentiality with at least the same care it uses for its own confidential information, but no less than reasonable care; <strong>(c)</strong> not disclose to any third party without prior written consent; <strong>(d)</strong> limit internal disclosure strictly to those who need to know; and <strong>(e)</strong> promptly notify the Disclosing Party of any unauthorized disclosure.`)}

${ndaSection('4', 'Exclusions', `This Agreement does not apply to information that: <strong>(a)</strong> is or becomes publicly available without breach; <strong>(b)</strong> was lawfully known to the Receiving Party prior to disclosure; <strong>(c)</strong> is rightfully received from a third party without restriction; <strong>(d)</strong> is independently developed without reference to Confidential Information; or <strong>(e)</strong> must be disclosed by law or court order, subject to prompt written notice to the Disclosing Party.`)}

${ndaSection('5', 'Term and Survival', `This Agreement commences on the Effective Date and remains in force for the duration of the business relationship and for <strong>one (1) year</strong> thereafter. Obligations relating to trade secrets survive indefinitely.`)}

${ndaSection('6', 'Return of Information', `Upon request or termination, the Receiving Party shall promptly return or certifiably destroy all Confidential Information in any format and confirm compliance in writing within five (5) business days.`)}

${ndaSection('7', 'Remedies', `The Parties acknowledge that breach of this Agreement would cause irreparable harm for which monetary damages alone would be insufficient. The Disclosing Party shall be entitled to seek immediate injunctive or equitable relief without the necessity of posting bond, in addition to all other remedies available at law.`)}

${ndaSection('8', 'Intellectual Property', `No rights, licenses, or interests in any intellectual property are granted under this Agreement. All Confidential Information remains the sole property of the Disclosing Party.`)}

${ndaSection('9', 'Governing Law', `This Agreement shall be governed by and construed in accordance with the laws of the State of <strong>Texas, United States</strong>, without regard to conflicts of law principles. Any disputes shall be resolved by binding arbitration administered by the American Arbitration Association in Houston, Texas.`)}

${ndaSection('10', 'General', `<strong>Entire Agreement:</strong> This Agreement constitutes the entire understanding between the Parties regarding confidentiality and supersedes all prior discussions. &nbsp;<strong>Amendment:</strong> Only by written instrument signed by both Parties. &nbsp;<strong>No Waiver:</strong> Failure to enforce any provision shall not constitute a waiver. &nbsp;<strong>Severability:</strong> If any provision is found invalid, the remainder continues in full force. &nbsp;<strong>Electronic Execution:</strong> Digital signatures are legally binding and of full effect.`)}
`
}

export function buildMSABody(f: Record<string, string>): string {
  const tasks = (f.tasks || '')
    .split('\n').map((t: string) => t.trim()).filter(Boolean)
    .map((t: string) => `<li>${t}</li>`).join('')

  const parts: string[] = [
    `<div class="doc-top-bar"></div>`,
    `<p class="doc-company-name">NetBounce Placement LLC</p>`,
    `<h1 class="doc-title">Master Service<br/>Agreement</h1>`,
    `<div class="doc-meta-divider"></div>`,
    `<p style="margin-bottom:4px"><strong>Between NetBounce Placement LLC</strong></p>`,
    `<p style="color:#6b7280;font-size:10pt;margin-bottom:14px">Service Provider · Austin, Texas</p>`,
    `<p style="margin-bottom:4px"><strong>And</strong> ${ph(f.clientLegalName, 'CLIENT LEGAL NAME')}</p>`,
    `<p style="color:#6b7280;font-size:10pt;margin-bottom:16px">${ph(f.clientJurisdiction, 'CLIENT JURISDICTION')}</p>`,
    `<div class="doc-meta-divider"></div>`,
    `<p style="margin-top:10px"><strong>Effective Date:</strong> ${ph(fmtDate(f.effectiveDate), 'EFFECTIVE DATE')} &nbsp;·&nbsp; <strong>Role:</strong> ${ph(f.role, 'ROLE')} &nbsp;·&nbsp; <strong>Engagement:</strong> ${ph(f.engagementType, 'TYPE')}</p>`,
    `<div class="doc-meta-divider" style="margin-top:14px"></div>`,
    `<p class="doc-body" style="margin-top:20px">This Master Service Agreement is entered into as of ${ph(fmtDate(f.effectiveDate), 'EFFECTIVE DATE')} by and between <strong>NetBounce Placement LLC</strong>, registered at ${ph(f.txAddress, 'REGISTERED TEXAS ADDRESS')} (the <strong>"Service Provider"</strong>), and ${ph(f.clientLegalName, 'CLIENT LEGAL NAME')}, a ${ph(f.clientEntityType, 'ENTITY TYPE')} organised under the laws of ${ph(f.clientJurisdiction, 'CLIENT JURISDICTION')}, at ${ph(f.clientAddress, 'CLIENT ADDRESS')} (the <strong>"Client"</strong>).</p>`,
    `<h2 class="doc-heading">Part A — Legal Framework &amp; General Terms</h2>`,
    `<p class="doc-body"><strong>A.1 Services.</strong> NetBounce shall provide offshore accounting staffing services as described in Part B.</p>`,
    `<p class="doc-body"><strong>A.2 Relationship.</strong> NetBounce operates as employer of record. The offshore staff member shall not be deemed an employee or agent of the Client.</p>`,
    `<p class="doc-body"><strong>A.3 Confidentiality.</strong> Each Party shall maintain strict confidentiality of all non-public information. Obligations survive termination for three (3) years, indefinitely for trade secrets.</p>`,
    `<p class="doc-body"><strong>A.4 Intellectual Property.</strong> All work product and deliverables are the sole property of the Client.</p>`,
    `<p class="doc-body"><strong>A.5 Data Security.</strong> NetBounce maintains encrypted communications, VPN-protected workstations, and role-based access controls.</p>`,
    `<p class="doc-body"><strong>A.6 Fees and Payment.</strong> Invoices issued on the ${ph(f.invoiceDate, 'INVOICE DATE')} of each month, due within ${ph(f.paymentTerms, 'PAYMENT TERMS')}. Late payments accrue 1.5% per month.</p>`,
    `<p class="doc-body"><strong>A.7 Term and Termination.</strong> Initial term: ${ph(f.initialTerm, 'INITIAL TERM')}, auto-renewing monthly. Either Party may terminate with ${ph(f.noticePeriod, 'NOTICE PERIOD')} written notice.</p>`,
    `<p class="doc-body"><strong>A.8 Limitation of Liability.</strong> NetBounce's total liability shall not exceed fees paid in the three (3) preceding months.</p>`,
    `<p class="doc-body"><strong>A.9 Governing Law.</strong> Texas, United States. Disputes by AAA arbitration in Houston, Texas.</p>`,
    `<p class="doc-body"><strong>A.10 Non-Solicitation.</strong> Client shall not solicit or hire any NPB offshore staff for twelve (12) months following termination. Breach results in a fee equal to six (6) months of the engagement fee.</p>`,
    `<h2 class="doc-heading">Part B — Scope of Work</h2>`,
    `<p class="doc-body"><strong>B.1 Role:</strong> ${ph(f.role, 'ROLE / DESIGNATION')}</p>`,
    `<p class="doc-body"><strong>B.2 Overview:</strong> ${ph(f.scopeOverview, 'SCOPE OVERVIEW')}</p>`,
    tasks
      ? `<p class="doc-body"><strong>B.3 Monthly Tasks:</strong></p><ul class="doc-list">${tasks}</ul>`
      : `<p class="doc-body"><strong>B.3 Monthly Tasks:</strong> ${ph('', 'TASK LIST')}</p>`,
    `<p class="doc-body"><strong>B.4 Software:</strong> ${ph(f.software, 'PRIMARY SOFTWARE &amp; TOOLS')}</p>`,
    `<p class="doc-body"><strong>B.5 Reporting:</strong> Reports to ${ph(f.reportingContact, 'CLIENT CONTACT')} via ${ph(f.communicationChannel, 'CHANNEL')}. Hours: ${ph(f.workingHours, 'HOURS')}. Check-ins: ${ph(f.checkinCadence, 'CADENCE')}.</p>`,
    `<h2 class="doc-heading">Part C — Engagement Model</h2>`,
    `<p class="doc-body"><strong>Engagement:</strong> ${ph(f.engagementType, 'TYPE')} — ${ph(f.engagementHoursPerWeek, 'X')} hrs/week (${ph(f.engagementHoursPerMonth, 'X')} hrs/month)</p>`,
    `<p class="doc-body"><strong>Monthly Retainer:</strong> USD $${ph(f.monthlyFee, 'AMOUNT')} — ${ph(f.billingCycle, 'BILLING CYCLE')}</p>`,
    `<p class="doc-body"><strong>First Invoice:</strong> ${ph(fmtDate(f.firstInvoiceDate), 'DATE')} via ${ph(f.paymentMethod, 'METHOD')}</p>`,
    `<p class="doc-body"><strong>Overtime:</strong> USD $${ph(f.overtimeRate, 'RATE')}/hour upon prior written approval.</p>`,
    `<h2 class="doc-heading">Part D — Service Level Agreement</h2>`,
    `<ul class="doc-list"><li>Email response: Within 24 business hours;</li><li>Monthly report delivery: By the ${ph(f.deliveryDay, '10th')} calendar day;</li><li>Urgent task turnaround: Within ${ph(f.urgentTAT, '24')} business hours; and</li><li>Error correction at no additional charge.</li></ul>`,
    `<p class="doc-body"><strong>Replacement Guarantee:</strong> Replacement within ${ph(f.replacementDays, '14')} business days with ${ph(f.transitionDays, '30')}-day paid transition.</p>`,
    `<p class="doc-body"><strong>Leave:</strong> Up to ${ph(f.publicHolidays, '12')} public holidays and ${ph(f.paidLeave, '12')} days annual leave per year.</p>`,
    `<p class="doc-body"><strong>Escalation:</strong> Level 1 — direct. Level 2 — ${ph(f.accountManagerName, 'Account Manager')} (${ph(f.accountManagerEmail, 'email')}). Level 3 — enroll@netbounceplacement.com</p>`,
    `<h2 class="doc-heading">Part E — Prerequisites &amp; Access</h2>`,
    `<ul class="doc-list"><li><strong>Software:</strong> ${ph(f.prereqSoftware, 'PLATFORM &amp; ACCESS LEVEL')}</li><li><strong>Bank access:</strong> ${ph(f.prereqBankAccess, 'METHOD')}</li><li><strong>Prior financials:</strong> ${ph(f.prereqFinancials, 'PERIOD')}</li><li><strong>Communication:</strong> ${ph(f.prereqComms, 'TOOLS')}</li><li><strong>Point of contact:</strong> ${ph(f.prereqContactName, 'NAME')} · ${ph(f.prereqContactEmail, 'EMAIL')} · ${ph(f.prereqContactTimezone, 'TIME ZONE')}</li></ul>`,
    `<h2 class="doc-heading">Part F — Special Notes</h2>`,
    `<p class="doc-body">${ph(f.specialNotes, 'None — standard terms apply.')}</p>`,
  ]

  return parts.join('\n')
}
