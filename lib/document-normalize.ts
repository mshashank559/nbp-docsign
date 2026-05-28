import { DocType, Document } from './types'

export function getEffectiveDocType(doc: Pick<Document, 'type' | 'fields'>): DocType {
  const subtype = doc.fields?.__docType as DocType | undefined
  if (subtype) return subtype
  if (doc.type === 'SALES_LEGAL') return 'agreement'
  if (doc.type === 'ACCOUNTS') return 'pre-invoice'
  if (doc.type === 'HR') return 'appointment'
  return doc.type
}

export function normalizeDocument<T extends Document>(doc: T): T {
  return { ...doc, type: getEffectiveDocType(doc) } as T
}

export function getLegacyDatabaseType(type: DocType) {
  if (type === 'agreement') return 'SALES_LEGAL'
  if (type === 'review-agreement') return 'SALES_LEGAL'
  if (type === 'pre-invoice' || type === 'slot-invoice-receipt' || type === 'final-invoice-receipt') return 'ACCOUNTS'
  if (type === 'appointment' || type === 'offer' || type === 'confirmation' || type === 'final-onboarding') return 'HR'
  return type
}
