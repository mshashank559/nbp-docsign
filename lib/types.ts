export type DocType = 'agreement' | 'review-agreement' | 'pre-invoice' | 'slot-invoice-receipt' | 'final-invoice-receipt' | 'appointment' | 'offer' | 'confirmation' | 'SALES_LEGAL' | 'ACCOUNTS' | 'HR'

export type DocStatus = 'draft' | 'sent' | 'viewed' | 'signed'

// ... remainder of the file stays the same

export interface Document {
  id: string
  type: DocType
  status: DocStatus
  client_name: string
  client_email: string
  client_company?: string
  fields: Record<string, string>
  signing_token: string
  signed_at?: string
  signed_pdf_url?: string
  nbg_signature?: string
  client_signature?: string
  view_count?: number
  created_at: string
  sent_at?: string
  expires_at?: string
}

export const STATUS_LABELS: Record<DocStatus, string> = {
  draft:   'Draft',
  sent:    'Sent',
  viewed:  'Viewed',
  signed:  'Done / Completed / Signed',
}

export const STATUS_COLORS: Record<DocStatus, string> = {
  draft:   'bg-gray-100 text-gray-700',
  sent:    'bg-amber-50 text-amber-700',
  viewed:  'bg-blue-50 text-blue-700',
  signed:  'bg-green-50 text-green-700',
}

export const DOCUMENT_SCHEMAS = {
  'pre-invoice': [
    'candidate_name', 'candidate_email', 'candidate_phone',
    'date', 'invoice_no', 'pack_name', 'deliverables',
    'pack_amount', 'upfront_details', 'remaining_details',
    'terms_comment', 'advance_amount', 'pending_amount',
  ],
  'slot-invoice-receipt': [
    'candidate_name', 'candidate_email', 'candidate_phone',
    'date', 'invoice_no', 'pack_name', 'deliverables',
    'pack_amount', 'upfront_details', 'remaining_details',
    'terms_comment', 'advance_received', 'pending_balance', 'dueDate',
  ],
  'final-invoice-receipt': [
    'candidate_name', 'candidate_email', 'candidate_phone',
    'date', 'invoice_no', 'pack_name', 'deliverables',
    'pack_amount', 'upfront_details', 'remaining_details',
    'terms_comment', 'total_paid', 'final_pending',
  ],
}
