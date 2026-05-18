import { NextRequest } from 'next/server'

export type AuditMetadata = Record<string, unknown>

export function getRequestAuditDetails(req: NextRequest): {
  ip_address: string | null
  user_agent: string | null
  metadata: AuditMetadata
} {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const realIp = req.headers.get('x-real-ip')?.trim()
  const ip = forwardedFor || realIp || null
  const userAgent = req.headers.get('user-agent') || null

  return {
    ip_address: ip,
    user_agent: userAgent,
    metadata: {
      ip,
      userAgent,
      forwardedFor: req.headers.get('x-forwarded-for') || null,
      country: req.headers.get('x-vercel-ip-country') || null,
      region: req.headers.get('x-vercel-ip-country-region') || null,
      city: req.headers.get('x-vercel-ip-city') || null,
      timezone: req.headers.get('x-vercel-ip-timezone') || null,
    },
  }
}

export async function insertAuditEvent(
  supabase: any,
  req: NextRequest,
  input: {
    document_id: string
    event: string
    actor?: string | null
    metadata?: AuditMetadata
  },
) {
  const details = getRequestAuditDetails(req)

  return supabase.from('audit_trail').insert({
    document_id: input.document_id,
    event: input.event,
    actor: input.actor || null,
    ip_address: details.ip_address,
    user_agent: details.user_agent,
    metadata: {
      ...details.metadata,
      ...(input.metadata || {}),
    },
  })
}

export async function incrementDocumentViewCount(supabase: any, document: { id: string; view_count?: number | null }) {
  const current = Number(document.view_count || 0)
  return supabase
    .from('documents')
    .update({ view_count: current + 1 })
    .eq('id', document.id)
}
