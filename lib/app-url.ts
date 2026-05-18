type UrlSource = {
  url?: string
  headers?: {
    get(name: string): string | null
  }
}

const CANONICAL_PRODUCTION_APP_URL = 'https://nbg-docsign.vercel.app'

export function resolveAppUrl(source?: UrlSource) {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL)
  const vercelUrl = normalizeUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  const requestUrl = resolveRequestOrigin(source)

  if (configuredUrl && !isLocalhost(configuredUrl) && !isDisallowedDeploymentUrl(configuredUrl)) return configuredUrl
  if (requestUrl && !isLocalhost(requestUrl) && !isDisallowedDeploymentUrl(requestUrl)) return requestUrl
  if (vercelUrl && !isDisallowedDeploymentUrl(vercelUrl)) return vercelUrl
  if (configuredUrl) return configuredUrl
  if (requestUrl) return requestUrl

  return CANONICAL_PRODUCTION_APP_URL
}

export function buildDocumentViewUrl(documentId: string, source?: UrlSource) {
  const safeDocumentId = encodeURIComponent(String(documentId || 'missing-document'))
  return `${resolveAppUrl(source)}/view-document/${safeDocumentId}`
}

function resolveRequestOrigin(source?: UrlSource) {
  const directOrigin = originFromUrl(source?.url)
  if (directOrigin) return directOrigin

  const host = source?.headers?.get('x-forwarded-host') || source?.headers?.get('host') || ''
  if (!host) return ''

  const protocol = source?.headers?.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return normalizeUrl(`${protocol}://${host}`)
}

function originFromUrl(value?: string) {
  if (!value) return ''
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

function normalizeUrl(value?: string | null) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''
  try {
    return new URL(trimmed).origin
  } catch {
    return ''
  }
}

function isLocalhost(value: string) {
  try {
    const hostname = new URL(value).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0'
  } catch {
    return false
  }
}

function isDisallowedDeploymentUrl(value: string) {
  try {
    const hostname = new URL(value).hostname
    return hostname === 'vercel.com'
      || hostname.endsWith('.vercel.com')
      || (hostname.endsWith('.vercel.app') && hostname !== new URL(CANONICAL_PRODUCTION_APP_URL).hostname)
  } catch {
    return false
  }
}
