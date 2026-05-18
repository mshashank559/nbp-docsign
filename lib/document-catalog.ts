import { DocType } from './types'

export type Department = 'Agreement' | 'Invoices' | 'Human Resources'

export interface DocumentTypeMeta {
  type: DocType
  label: string
  shortLabel: string
  department: Department
  desc: string
  color: string
  bg: string
  border: string
  emoji: string
}

export const DOCUMENT_TYPES: DocumentTypeMeta[] = [
  { type: 'agreement', label: 'Agreement', shortLabel: 'Agreement', department: 'Agreement', desc: 'Client agreement with sender-filled custom fields and receiver signature.', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', emoji: 'Agreement' },
  { type: 'review-agreement', label: 'Review Agreement', shortLabel: 'Review', department: 'Agreement', desc: 'Static review agreement with no custom field mapping.', color: '#475569', bg: '#f8fafc', border: '#cbd5e1', emoji: 'Review' },
  { type: 'pre-invoice', label: 'Pre-Invoice', shortLabel: 'Pre-Invoice', department: 'Invoices', desc: 'Initial quote and service breakdown before payment collection.', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', emoji: 'Invoice' },
  { type: 'slot-invoice-receipt', label: 'Slot-Invoice Receipt', shortLabel: 'Slot Receipt', department: 'Invoices', desc: 'Partial-payment receipt confirming the candidate slot.', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', emoji: 'Receipt' },
  { type: 'final-invoice-receipt', label: 'Final Invoice Receipt', shortLabel: 'Final Receipt', department: 'Invoices', desc: 'Full-payment confirmation and final pending balance.', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', emoji: 'Receipt' },
  { type: 'appointment', label: 'Letter of Appointment', shortLabel: 'Appointment', department: 'Human Resources', desc: 'Appointment letter for a selected candidate or employee.', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', emoji: 'Appointment' },
  { type: 'offer', label: 'NB Offer Letter', shortLabel: 'NB Offer', department: 'Human Resources', desc: 'Offer letter with role, compensation, and joining details.', color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: 'Offer' },
  { type: 'confirmation', label: 'Confirmation Letter', shortLabel: 'Confirmation', department: 'Human Resources', desc: 'Confirmation letter for employment status updates.', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', emoji: 'Confirmation' },
]

export const DOCUMENT_TYPE_VALUES = DOCUMENT_TYPES.map(d => d.type)

export const DOCUMENT_TYPE_LABELS = DOCUMENT_TYPES.reduce((acc, item) => {
  acc[item.type] = item.label
  return acc
}, {
  SALES_LEGAL: 'Agreement',
  ACCOUNTS: 'Pre-Invoice',
  HR: 'Letter of Appointment',
} as Record<DocType, string>)

export function getDocumentMeta(type: DocType) {
  return DOCUMENT_TYPES.find(d => d.type === type) || DOCUMENT_TYPES[0]
}
