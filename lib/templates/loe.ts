export interface LOEFields {
  letterDate: string
  clientName: string
  clientTitle: string
  clientCompany: string
  clientAddress: string
  txAddress: string
  role: string
  engagementType: string
  startDate: string
  scopeSummary: string
  tasks: string
  software: string
  hoursPerWeek: string
  monthlyFee: string
  billingCycle: string
  paymentTerms: string
  initialTerm: string
  noticePeriod: string
  additionalTerms: string
  disclosingSignatoryName: string
  disclosingSignatoryTitle: string
  receivingSignatoryName: string
  receivingSignatoryTitle: string
  receivingSignatoryDate: string
}

export const LOE_DEFAULTS: Partial<LOEFields> = {
  billingCycle: 'Monthly in advance',
  paymentTerms: 'Net 14 days',
  initialTerm: '3 months',
  noticePeriod: '30 days',
  engagementType: 'Full-Time',
}

export const LOE_SECTIONS = [
  { id: 'letter',      label: 'Letter Details',      fields: ['letterDate','clientName','clientTitle','clientCompany','clientAddress','txAddress'] },
  { id: 'engagement',  label: 'Engagement',          fields: ['role','engagementType','startDate'] },
  { id: 'scope',       label: 'Scope Summary',       fields: ['scopeSummary','tasks','software'] },
  { id: 'fees',        label: 'Fees & Terms',        fields: ['hoursPerWeek','monthlyFee','billingCycle','paymentTerms','initialTerm','noticePeriod'] },
  { id: 'additional',  label: 'Additional Terms',    fields: ['additionalTerms'] },
  { id: 'signatures',  label: 'Signatories',         fields: ['disclosingSignatoryName','disclosingSignatoryTitle','receivingSignatoryName','receivingSignatoryTitle','receivingSignatoryDate'] },
]

export const LOE_FIELD_CONFIG: Record<string, { label: string; placeholder?: string; type?: string; multiline?: boolean }> = {
  letterDate:            { label: 'Letter date',              type: 'date' },
  clientName:            { label: 'Client name',              placeholder: 'Full name of recipient' },
  clientTitle:           { label: 'Client title',             placeholder: 'e.g. Owner, Managing Partner' },
  clientCompany:         { label: 'Client company',           placeholder: 'Company legal name' },
  clientAddress:         { label: 'Client address',           placeholder: 'Full address', multiline: true },
  txAddress:             { label: 'NPB address',              placeholder: '123 Main St, Austin TX', multiline: true },
  role:                  { label: 'Role to be placed',        placeholder: 'e.g. Full-Charge Bookkeeper' },
  engagementType:        { label: 'Engagement type',          placeholder: 'Full-Time / Part-Time' },
  startDate:             { label: 'Proposed start date',      type: 'date' },
  scopeSummary:          { label: 'Scope summary',            placeholder: 'Brief description of services', multiline: true },
  tasks:                 { label: 'Key monthly tasks (one per line)', placeholder: 'Bank reconciliation\nAP/AR management', multiline: true },
  software:              { label: 'Software & tools',         placeholder: 'e.g. QuickBooks Online, Xero' },
  hoursPerWeek:          { label: 'Hours per week',           placeholder: 'e.g. 40', type: 'number' },
  monthlyFee:            { label: 'Monthly fee (USD)',        placeholder: 'e.g. 2500', type: 'number' },
  billingCycle:          { label: 'Billing cycle',            placeholder: 'Monthly in advance / arrears' },
  paymentTerms:          { label: 'Payment terms',            placeholder: 'e.g. Net 14 days' },
  initialTerm:           { label: 'Initial term',             placeholder: 'e.g. 3 months' },
  noticePeriod:          { label: 'Notice period',            placeholder: 'e.g. 30 days' },
  additionalTerms:       { label: 'Additional terms / notes', placeholder: 'Any special arrangements or notes', multiline: true },
  disclosingSignatoryName:  { label: 'NPB signatory name',    placeholder: 'Full name' },
  disclosingSignatoryTitle: { label: 'NPB signatory title',   placeholder: 'e.g. Founder & CEO' },
  receivingSignatoryName:   { label: 'Client signatory name', placeholder: 'Full name' },
  receivingSignatoryTitle:  { label: 'Client signatory title', placeholder: 'e.g. Owner' },
  receivingSignatoryDate:   { label: 'Client signing date',   type: 'date' },
}
