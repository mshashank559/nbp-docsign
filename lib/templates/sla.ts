export interface SLAFields {
  effectiveDate: string
  txAddress: string
  clientLegalName: string
  clientJurisdiction: string
  role: string
  engagementType: string
  emailResponseTime: string
  urgentResponseTime: string
  reportDeliveryDay: string
  replacementDays: string
  transitionDays: string
  publicHolidays: string
  paidLeave: string
  accountManagerName: string
  accountManagerEmail: string
  reportingCadence: string
  reportingFormat: string
  reportingContact: string
  errorCorrectionTime: string
  slaBreachCredit: string
  disclosingSignatoryName: string
  disclosingSignatoryTitle: string
  disclosingSignatoryDate: string
  receivingSignatoryName: string
  receivingSignatoryTitle: string
  receivingSignatoryDate: string
}

export const SLA_DEFAULTS: Partial<SLAFields> = {
  emailResponseTime: '24',
  urgentResponseTime: '4',
  reportDeliveryDay: '10th',
  replacementDays: '14',
  transitionDays: '30',
  publicHolidays: '12',
  paidLeave: '12',
  errorCorrectionTime: '48',
  slaBreachCredit: '5',
  reportingCadence: 'Monthly',
}

export const SLA_SECTIONS = [
  { id: 'agreement',   label: 'Agreement Details',      fields: ['effectiveDate','txAddress','clientLegalName','clientJurisdiction'] },
  { id: 'engagement',  label: 'Engagement',             fields: ['role','engagementType'] },
  { id: 'response',    label: 'Response Times',         fields: ['emailResponseTime','urgentResponseTime','reportDeliveryDay','errorCorrectionTime'] },
  { id: 'replacement', label: 'Replacement Guarantee',  fields: ['replacementDays','transitionDays'] },
  { id: 'leave',       label: 'Leave & Availability',   fields: ['publicHolidays','paidLeave'] },
  { id: 'reporting',   label: 'Reporting',              fields: ['reportingCadence','reportingFormat','reportingContact'] },
  { id: 'escalation',  label: 'Escalation',             fields: ['accountManagerName','accountManagerEmail'] },
  { id: 'penalties',   label: 'SLA Credits',            fields: ['slaBreachCredit'] },
  { id: 'signatures',  label: 'Signatories',            fields: ['disclosingSignatoryName','disclosingSignatoryTitle','disclosingSignatoryDate','receivingSignatoryName','receivingSignatoryTitle','receivingSignatoryDate'] },
]

export const SLA_FIELD_CONFIG: Record<string, { label: string; placeholder?: string; type?: string; multiline?: boolean }> = {
  effectiveDate:         { label: 'Effective date',                    type: 'date' },
  txAddress:             { label: 'NPB registered Texas address',      placeholder: '123 Main St, Austin TX', multiline: true },
  clientLegalName:       { label: 'Client legal name',                 placeholder: 'e.g. KMF Group LLC' },
  clientJurisdiction:    { label: 'Client state / jurisdiction',       placeholder: 'e.g. Texas, United States' },
  role:                  { label: 'Role / designation',                placeholder: 'e.g. Bookkeeper' },
  engagementType:        { label: 'Engagement type',                   placeholder: 'Full-Time / Part-Time' },
  emailResponseTime:     { label: 'Standard email response (hours)',   placeholder: 'e.g. 24', type: 'number' },
  urgentResponseTime:    { label: 'Urgent task turnaround (hours)',    placeholder: 'e.g. 4', type: 'number' },
  reportDeliveryDay:     { label: 'Monthly report delivery by',        placeholder: 'e.g. 10th calendar day' },
  errorCorrectionTime:   { label: 'Error correction turnaround (hrs)', placeholder: 'e.g. 48', type: 'number' },
  replacementDays:       { label: 'Replacement within (business days)', placeholder: 'e.g. 14', type: 'number' },
  transitionDays:        { label: 'Paid transition period (days)',     placeholder: 'e.g. 30', type: 'number' },
  publicHolidays:        { label: 'Public holidays per year',          placeholder: 'e.g. 12', type: 'number' },
  paidLeave:             { label: 'Annual paid leave (days)',          placeholder: 'e.g. 12', type: 'number' },
  reportingCadence:      { label: 'Reporting cadence',                 placeholder: 'e.g. Monthly / Weekly' },
  reportingFormat:       { label: 'Reporting format',                  placeholder: 'e.g. Excel, Google Sheets, PDF' },
  reportingContact:      { label: 'Reports delivered to',             placeholder: 'Client contact name and email' },
  accountManagerName:    { label: 'NPB account manager name',         placeholder: 'Full name' },
  accountManagerEmail:   { label: 'NPB account manager email',        placeholder: 'email@netbounceglobal.com' },
  slaBreachCredit:       { label: 'SLA breach service credit (%)',     placeholder: 'e.g. 5', type: 'number' },
  disclosingSignatoryName:  { label: 'NPB signatory name',   placeholder: 'Full name' },
  disclosingSignatoryTitle: { label: 'NPB signatory title',  placeholder: 'e.g. Founder & CEO' },
  disclosingSignatoryDate:  { label: 'NPB signing date',     type: 'date' },
  receivingSignatoryName:   { label: 'Client signatory name', placeholder: 'Full name' },
  receivingSignatoryTitle:  { label: 'Client signatory title', placeholder: 'e.g. Owner' },
  receivingSignatoryDate:   { label: 'Client signing date',   type: 'date' },
}
