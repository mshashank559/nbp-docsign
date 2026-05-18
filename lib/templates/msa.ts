export interface MSAFields {
  effectiveDate: string
  txAddress: string
  clientLegalName: string
  clientEntityType: string
  clientJurisdiction: string
  clientAddress: string
  role: string
  engagementType: string
  scopeOverview: string
  tasks: string
  software: string
  reportingContact: string
  communicationChannel: string
  workingHours: string
  checkinCadence: string
  engagementHoursPerWeek: string
  engagementHoursPerMonth: string
  monthlyFee: string
  billingCycle: string
  firstInvoiceDate: string
  paymentMethod: string
  paymentTerms: string
  initialTerm: string
  noticePeriod: string
  invoiceDate: string
  overtimeRate: string
  deliveryDay: string
  urgentTAT: string
  replacementDays: string
  transitionDays: string
  publicHolidays: string
  paidLeave: string
  accountManagerName: string
  accountManagerEmail: string
  prereqSoftware: string
  prereqBankAccess: string
  prereqFinancials: string
  prereqComms: string
  prereqContactName: string
  prereqContactEmail: string
  prereqContactTimezone: string
  specialNotes: string
  disclosingSignatoryName: string
  disclosingSignatoryTitle: string
  disclosingSignatoryDate: string
  receivingSignatoryName: string
  receivingSignatoryTitle: string
  receivingSignatoryDate: string
}

export const MSA_DEFAULTS: Partial<MSAFields> = {
  billingCycle: 'Monthly in advance',
  paymentTerms: '14 days',
  initialTerm: '3 months',
  noticePeriod: '30 days',
  publicHolidays: '12',
  paidLeave: '12',
  urgentTAT: '24',
  deliveryDay: '10th',
  replacementDays: '14',
  transitionDays: '30',
  specialNotes: 'None — standard terms as set out in Parts A through E apply.',
}

export const MSA_SECTIONS = [
  {
    id: 'client',
    label: 'Client Details',
    fields: ['clientLegalName', 'clientEntityType', 'clientJurisdiction', 'clientAddress'],
  },
  {
    id: 'agreement',
    label: 'Agreement',
    fields: ['effectiveDate', 'txAddress'],
  },
  {
    id: 'scope',
    label: 'Scope of Work',
    fields: ['role', 'engagementType', 'scopeOverview', 'tasks', 'software', 'reportingContact', 'communicationChannel', 'workingHours', 'checkinCadence'],
  },
  {
    id: 'engagement',
    label: 'Engagement Model',
    fields: ['engagementHoursPerWeek', 'engagementHoursPerMonth', 'monthlyFee', 'billingCycle', 'firstInvoiceDate', 'paymentMethod', 'paymentTerms', 'initialTerm', 'noticePeriod', 'invoiceDate', 'overtimeRate'],
  },
  {
    id: 'sla',
    label: 'Service Level Agreement',
    fields: ['deliveryDay', 'urgentTAT', 'replacementDays', 'transitionDays', 'publicHolidays', 'paidLeave', 'accountManagerName', 'accountManagerEmail'],
  },
  {
    id: 'prerequisites',
    label: 'Prerequisites & Access',
    fields: ['prereqSoftware', 'prereqBankAccess', 'prereqFinancials', 'prereqComms', 'prereqContactName', 'prereqContactEmail', 'prereqContactTimezone'],
  },
  {
    id: 'notes',
    label: 'Special Notes',
    fields: ['specialNotes'],
  },
  {
    id: 'signatures',
    label: 'Signatories',
    fields: ['disclosingSignatoryName', 'disclosingSignatoryTitle', 'disclosingSignatoryDate', 'receivingSignatoryName', 'receivingSignatoryTitle', 'receivingSignatoryDate'],
  },
]

export const MSA_FIELD_CONFIG: Record<string, { label: string; placeholder?: string; type?: string; multiline?: boolean }> = {
  clientLegalName:         { label: 'Client legal name',          placeholder: 'e.g. KMF Group LLC' },
  clientEntityType:        { label: 'Entity type',                placeholder: 'e.g. Limited liability company' },
  clientJurisdiction:      { label: 'Client state / jurisdiction', placeholder: 'e.g. Texas, United States' },
  clientAddress:           { label: 'Client address',             placeholder: 'Full registered address', multiline: true },
  effectiveDate:           { label: 'Effective date',             type: 'date' },
  txAddress:               { label: 'NPB registered Texas address', placeholder: 'e.g. 123 Main St, Austin TX 78701', multiline: true },
  role:                    { label: 'Role / designation',         placeholder: 'e.g. Bookkeeper, AR Specialist' },
  engagementType:          { label: 'Engagement type',            placeholder: 'Full-Time (40 hrs/wk) or Part-Time' },
  scopeOverview:           { label: 'Scope overview',             placeholder: 'Brief description of the role and responsibilities', multiline: true },
  tasks:                   { label: 'Monthly tasks',              placeholder: 'One task per line. These will appear as a bullet list.', multiline: true },
  software:                { label: 'Primary software & tools',   placeholder: 'e.g. QuickBooks Online, Xero, Bill.com, Excel' },
  reportingContact:        { label: 'Reports to',                 placeholder: 'Client contact name and title' },
  communicationChannel:    { label: 'Communication channel',      placeholder: 'e.g. Email / Slack / Teams' },
  workingHours:            { label: 'Working hours (client time zone)', placeholder: 'e.g. 9 AM – 5 PM EST' },
  checkinCadence:          { label: 'Check-in cadence',           placeholder: 'e.g. Monday & Friday, 30-minute call' },
  engagementHoursPerWeek:  { label: 'Hours per week',             placeholder: 'e.g. 40 / 20 / 10', type: 'number' },
  engagementHoursPerMonth: { label: 'Hours per month',            placeholder: 'e.g. 160 / 80 / 40', type: 'number' },
  monthlyFee:              { label: 'Monthly retainer (USD)',      placeholder: 'e.g. 2500', type: 'number' },
  billingCycle:            { label: 'Billing cycle',              placeholder: 'Monthly in advance / Monthly in arrears' },
  firstInvoiceDate:        { label: 'First invoice date',         type: 'date' },
  paymentMethod:           { label: 'Payment method',             placeholder: 'ACH / Wire Transfer / Check' },
  paymentTerms:            { label: 'Payment terms',              placeholder: 'e.g. 14 days' },
  initialTerm:             { label: 'Initial term',               placeholder: 'e.g. 3 months / 6 months' },
  noticePeriod:            { label: 'Termination notice period',  placeholder: 'e.g. 30 days' },
  invoiceDate:             { label: 'Invoice date (day of month)', placeholder: 'e.g. 1st / 15th' },
  overtimeRate:            { label: 'Overtime hourly rate (USD)', placeholder: 'e.g. 25', type: 'number' },
  deliveryDay:             { label: 'Monthly report delivery by', placeholder: 'e.g. 10th calendar day' },
  urgentTAT:               { label: 'Urgent task turnaround',     placeholder: 'e.g. 4 / 8 / 24 hours' },
  replacementDays:         { label: 'Replacement within (business days)', placeholder: 'e.g. 14' },
  transitionDays:          { label: 'Paid transition period (days)', placeholder: 'e.g. 30' },
  publicHolidays:          { label: 'Public holidays per year',   placeholder: 'e.g. 12', type: 'number' },
  paidLeave:               { label: 'Annual paid leave (days)',   placeholder: 'e.g. 12', type: 'number' },
  accountManagerName:      { label: 'NetBounce account manager',  placeholder: 'Full name' },
  accountManagerEmail:     { label: 'Account manager email',      placeholder: 'email@netbounceglobal.com' },
  prereqSoftware:          { label: 'Software / platform access', placeholder: 'e.g. QuickBooks Online — Accountant level' },
  prereqBankAccess:        { label: 'Bank / credit card access',  placeholder: 'e.g. Read-only portal access' },
  prereqFinancials:        { label: 'Prior-period financials',    placeholder: 'e.g. Last 12 months' },
  prereqComms:             { label: 'Communication tools',        placeholder: 'e.g. Slack workspace invitation' },
  prereqContactName:       { label: 'Point of contact name',      placeholder: 'Full name' },
  prereqContactEmail:      { label: 'Point of contact email',     placeholder: 'email@clientcompany.com' },
  prereqContactTimezone:   { label: 'Point of contact time zone', placeholder: 'e.g. EST / CST / PST' },
  specialNotes:            { label: 'Special notes & custom provisions', multiline: true },
  disclosingSignatoryName:  { label: 'NPB signatory name',        placeholder: 'Full name' },
  disclosingSignatoryTitle: { label: 'NPB signatory title',       placeholder: 'e.g. Founder & CEO' },
  disclosingSignatoryDate:  { label: 'NPB signing date',          type: 'date' },
  receivingSignatoryName:   { label: 'Client signatory name',     placeholder: 'Full name' },
  receivingSignatoryTitle:  { label: 'Client signatory title',    placeholder: 'e.g. Owner' },
  receivingSignatoryDate:   { label: 'Client signing date',       type: 'date' },
}
