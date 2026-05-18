import { DocType, Document } from './types'
import { getEffectiveDocType, getLegacyDatabaseType } from './document-normalize'

export type UserRole = 'ACCOUNTS' | 'HR'
export type SenderRole = UserRole | 'DEFAULT'
export type RoleView = 'Accounts' | 'HR'

export const USER_ROLES: UserRole[] = ['ACCOUNTS', 'HR']
export const DEFAULT_USER_ROLE: UserRole = 'ACCOUNTS'
export const ACCOUNTS_ROLE_VIEW: RoleView = 'Accounts'
export const HR_ROLE_VIEW: RoleView = 'HR'
export const ACCOUNTS_DOC_TYPE_LABELS = ['Agreement', 'Review Agreement', 'Pre-Invoice', 'Slot-Invoice Receipt', 'Final-Invoice Receipt'] as const
export const HR_DOC_TYPE_LABELS = ['Appointment', 'NB Offer', 'Confirmation'] as const
export const USER_ROLE_STORAGE_KEY = 'nbg-docsign-user-role'
export const USER_ROLE_EVENT = 'nbg-docsign-role-change'

export const ROLE_LABELS: Record<UserRole, string> = {
  ACCOUNTS: 'Accounts View',
  HR: 'HR View',
}

export const ROLE_ALLOWED_TYPES: Record<UserRole, DocType[]> = {
  ACCOUNTS: ['agreement', 'review-agreement', 'pre-invoice', 'slot-invoice-receipt', 'final-invoice-receipt'],
  HR: ['confirmation', 'offer', 'appointment'],
}

export function normalizeRole(value: unknown): UserRole {
  const normalized = String(value || '').toLowerCase()
  if (normalized === 'hr') return 'HR'
  if (normalized === 'accounts' || normalized === 'account') return 'ACCOUNTS'
  return DEFAULT_USER_ROLE
}

export function resolveUserRole(input: { email?: string | null; user_metadata?: Record<string, unknown> | null; app_metadata?: Record<string, unknown> | null } | null | undefined): UserRole {
  const metadata = {
    ...(input?.app_metadata || {}),
    ...(input?.user_metadata || {}),
  }
  const metadataValue = String(metadata.user_role || metadata.role || metadata.department || '').toLowerCase()
  const email = String(input?.email || '').toLowerCase()
  const localPart = email.split('@')[0] || ''

  if (metadataValue.includes('hr') || localPart.includes('hr') || email.includes('humanresources')) return 'HR'
  if (metadataValue.includes('account') || localPart.includes('account') || localPart.includes('finance')) return 'ACCOUNTS'

  return DEFAULT_USER_ROLE
}

export function toRoleView(role: UserRole): RoleView {
  return role === 'HR' ? HR_ROLE_VIEW : ACCOUNTS_ROLE_VIEW
}

export function resolveSenderRole(input: { email?: string | null; user_metadata?: Record<string, unknown> | null; app_metadata?: Record<string, unknown> | null } | null | undefined): SenderRole {
  const metadata = {
    ...(input?.app_metadata || {}),
    ...(input?.user_metadata || {}),
  }
  const metadataValue = String(metadata.user_role || metadata.role || metadata.department || '').toLowerCase()
  const email = String(input?.email || '').toLowerCase()
  const localPart = email.split('@')[0] || ''

  if (metadataValue.includes('hr') || localPart.includes('hr') || email.includes('humanresources')) return 'HR'
  if (metadataValue.includes('account') || localPart.includes('account') || localPart.includes('finance')) return 'ACCOUNTS'

  return 'DEFAULT'
}

export function getAllowedDocTypes(role: UserRole) {
  return ROLE_ALLOWED_TYPES[role]
}

export function getAllowedDatabaseTypes(role: UserRole): DocType[] {
  return Array.from(new Set([
    ...getAllowedDocTypes(role),
    ...getAllowedDocTypes(role).map(type => getLegacyDatabaseType(type)),
  ]))
}

export function isDocAllowedForRole(doc: Pick<Document, 'type' | 'fields'>, role: UserRole) {
  return getAllowedDocTypes(role).includes(getEffectiveDocType(doc))
}

export function getMetricsForRole(documents: Document[], role: UserRole) {
  const visibleDocs = documents.filter(doc => isDocAllowedForRole(doc, role))

  return [
    {
      label: 'Total sent',
      value: visibleDocs.filter(doc => doc.status === 'sent' || doc.status === 'viewed' || doc.status === 'signed').length,
      gradient: 'stat-indigo',
    },
    {
      label: 'Viewed',
      value: visibleDocs.filter(doc => doc.status === 'viewed' || doc.status === 'signed').length,
      gradient: 'stat-amber',
    },
    {
      label: 'Signed',
      value: visibleDocs.filter(doc => doc.status === 'signed').length,
      gradient: 'stat-emerald',
    },
  ]
}
