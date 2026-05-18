export interface NDAFields {
  effectiveDate: string
  txAddress: string
  clientLegalName: string
  clientJurisdiction: string
  disclosingSignatoryName: string
  disclosingSignatoryTitle: string
  disclosingSignatoryDate: string
  receivingSignatoryName: string
  receivingSignatoryTitle: string
  receivingSignatoryDate: string
}

export const NDA_DEFAULTS: NDAFields = {
  effectiveDate: '',
  txAddress: '',
  clientLegalName: '',
  clientJurisdiction: '',
  disclosingSignatoryName: '',
  disclosingSignatoryTitle: '',
  disclosingSignatoryDate: '',
  receivingSignatoryName: '',
  receivingSignatoryTitle: '',
  receivingSignatoryDate: '',
}

export const NDA_FIELD_LABELS: Record<keyof NDAFields, string> = {
  effectiveDate: 'Effective Date',
  txAddress: 'NPB Registered Texas Address',
  clientLegalName: 'Client Legal Name',
  clientJurisdiction: 'Client State / Jurisdiction',
  disclosingSignatoryName: 'NPB Signatory Name',
  disclosingSignatoryTitle: 'NPB Signatory Title',
  disclosingSignatoryDate: 'NPB Signing Date',
  receivingSignatoryName: 'Client Signatory Name',
  receivingSignatoryTitle: 'Client Signatory Title',
  receivingSignatoryDate: 'Client Signing Date',
}

// renderNDA removed — use DocPreview component which builds the HTML on the client.
