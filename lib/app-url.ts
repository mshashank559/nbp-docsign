type UrlSource = {
  url?: string
  headers?: {
    get(name: string): string | null
  }
}

export function resolveAppUrl(source?: UrlSource) {
  const configuredUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL)
  const productionUrl = normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  const deploymentUrl = normalizeUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  const requestUrl = resolveRequestOrigin(source)

  for (const candidate of [configuredUrl, requestUrl, productionUrl, deploymentUrl]) {
    if (candidate && isUsableAppUrl(candidate)) return candidate
  }

  if (configuredUrl) return configuredUrl
  if (requestUrl) return requestUrl

  throw new Error('Unable to resolve application URL. Set NEXT_PUBLIC_APP_URL to the production domain.')
}

export function buildDocumentViewUrl(documentId: string, source?: UrlSource) {
  const safeDocumentId = encodeURIComponent(String(documentId || 'missing-document'))
  return `${resolveAppUrl(source)}/view-document/${safeDocumentId}`
}

export function buildDocumentPdfUrl(documentId: string, source?: UrlSource) {
  const safeDocumentId = encodeURIComponent(String(documentId || 'missing-document'))
  return `${resolveAppUrl(source)}/api/document/${safeDocumentId}`
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

function isUsableAppUrl(value: string) {
  return !isLocalhost(value) && !isDisallowedDeploymentUrl(value)
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
    const lowerValue = value.toLowerCase()
    return hostname === 'vercel.com'
      || hostname.endsWith('.vercel.com')
      || hostname === 'your-new-vercel-domain.vercel.app'
      || lowerValue.includes('vercel.com/')
  } catch {
    return false
  }
}
