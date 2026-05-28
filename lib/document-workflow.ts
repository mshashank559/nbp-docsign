import { DocType, Document } from './types'
import { getEffectiveDocType } from './document-normalize'

export const DOWNLOAD_ONLY_TYPES: DocType[] = ['review-agreement', 'pre-invoice', 'slot-invoice-receipt', 'final-invoice-receipt', 'confirmation']
export const SIGNATURE_REQUIRED_TYPES: DocType[] = ['agreement', 'offer', 'appointment', 'final-onboarding']

export function isDownloadOnlyType(type: DocType) {
  return DOWNLOAD_ONLY_TYPES.includes(type)
}

export function requiresSignatureType(type: DocType) {
  return SIGNATURE_REQUIRED_TYPES.includes(type)
}

export function isDownloadOnlyDocument(doc: Pick<Document, 'type' | 'fields'>) {
  return isDownloadOnlyType(getEffectiveDocType(doc as Document))
}

export function requiresSignatureDocument(doc: Pick<Document, 'type' | 'fields'>) {
  return requiresSignatureType(getEffectiveDocType(doc as Document))
}
