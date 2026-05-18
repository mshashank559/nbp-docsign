export interface SOWFields {
  effectiveDate: string
  txAddress: string
  clientLegalName: string
  clientJurisdiction: string
  projectName: string
  role: string
  engagementType: string
  startDate: string
  endDate: string
  scopeOverview: string
  tasks: string
  deliverables: string
  software: string
  hoursPerWeek: string
  hoursPerMonth: string
  monthlyFee: string
  paymentTerms: string
  outOfScope: string
  assumptions: string
  reportingContact: string
  communicationChannel: string
  workingHours: string
  reviewCadence: string
  disclosingSignatoryName: string
  disclosingSignatoryTitle: string
  disclosingSignatoryDate: string
  receivingSignatoryName: string
  receivingSignatoryTitle: string
  receivingSignatoryDate: string
}

export const SOW_DEFAULTS: Partial<SOWFields> = {
  paymentTerms: 'Net 14 days',
  engagementType: 'Full-Time',
}

export const SOW_SECTIONS = [
  { id: 'agreement',   label: 'Agreement Details',   fields: ['effectiveDate','txAddress','clientLegalName','clientJurisdiction'] },
  { id: 'project',     label: 'Project Details',     fields: ['projectName','role','engagementType','startDate','endDate'] },
  { id: 'scope',       label: 'Scope of Work',       fields: ['scopeOverview','tasks','deliverables','software'] },
  { id: 'engagement',  label: 'Engagement Model',    fields: ['hoursPerWeek','hoursPerMonth','monthlyFee','paymentTerms'] },
  { id: 'boundaries',  label: 'Boundaries',          fields: ['outOfScope','assumptions'] },
  { id: 'comms',       label: 'Communication',       fields: ['reportingContact','communicationChannel','workingHours','reviewCadence'] },
  { id: 'signatures',  label: 'Signatories',         fields: ['disclosingSignatoryName','disclosingSignatoryTitle','disclosingSignatoryDate','receivingSignatoryName','receivingSignatoryTitle','receivingSignatoryDate'] },
]

export const SOW_FIELD_CONFIG: Record<string, { label: string; placeholder?: string; type?: string; multiline?: boolean }> = {
  effectiveDate:         { label: 'Effective date',            type: 'date' },
  txAddress:             { label: 'NPB registered address',    placeholder: '123 Main St, Austin TX', multiline: true },
  clientLegalName:       { label: 'Client legal name',         placeholder: 'e.g. KMF Group LLC' },
  clientJurisdiction:    { label: 'Client state / jurisdiction', placeholder: 'e.g. Texas, United States' },
  projectName:           { label: 'Project / engagement name', placeholder: 'e.g. Monthly Bookkeeping — Q2 2026' },
  role:                  { label: 'Role / designation',        placeholder: 'e.g. Bookkeeper, AR Specialist' },
  engagementType:        { label: 'Engagement type',           placeholder: 'Full-Time / Part-Time' },
  startDate:             { label: 'Start date',                type: 'date' },
  endDate:               { label: 'End date / review date',    type: 'date' },
  scopeOverview:         { label: 'Scope overview',            placeholder: 'Brief description of what will be delivered', multiline: true },
  tasks:                 { label: 'Monthly tasks (one per line)', placeholder: 'Bank reconciliation\nAP processing\nMonthly P&L', multiline: true },
  deliverables:          { label: 'Key deliverables',          placeholder: 'e.g. Monthly P&L, Balance Sheet, AR Ageing Report', multiline: true },
  software:              { label: 'Software & tools',          placeholder: 'e.g. QuickBooks Online, Xero, Bill.com' },
  hoursPerWeek:          { label: 'Hours per week',            placeholder: 'e.g. 40', type: 'number' },
  hoursPerMonth:         { label: 'Hours per month',           placeholder: 'e.g. 160', type: 'number' },
  monthlyFee:            { label: 'Monthly fee (USD)',         placeholder: 'e.g. 2500', type: 'number' },
  paymentTerms:          { label: 'Payment terms',             placeholder: 'e.g. Net 14 days' },
  outOfScope:            { label: 'Out of scope',              placeholder: 'List anything explicitly excluded', multiline: true },
  assumptions:           { label: 'Assumptions & dependencies', placeholder: 'e.g. Client provides timely access to bank statements', multiline: true },
  reportingContact:      { label: 'Client point of contact',  placeholder: 'Name and email' },
  communicationChannel:  { label: 'Communication channel',    placeholder: 'e.g. Email, Slack, Teams' },
  workingHours:          { label: 'Working hours',            placeholder: 'e.g. 9 AM – 5 PM EST' },
  reviewCadence:         { label: 'Review / check-in cadence', placeholder: 'e.g. Weekly Monday call, 30 minutes' },
  disclosingSignatoryName:  { label: 'NPB signatory name',    placeholder: 'Full name' },
  disclosingSignatoryTitle: { label: 'NPB signatory title',   placeholder: 'e.g. Founder & CEO' },
  disclosingSignatoryDate:  { label: 'NPB signing date',      type: 'date' },
  receivingSignatoryName:   { label: 'Client signatory name', placeholder: 'Full name' },
  receivingSignatoryTitle:  { label: 'Client signatory title', placeholder: 'e.g. Owner' },
  receivingSignatoryDate:   { label: 'Client signing date',   type: 'date' },
}
