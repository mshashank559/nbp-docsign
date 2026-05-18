type UrlSource = {
  url?: string
  headers?: {
    get(name: string): string | null
  }
}

const DEFAULT_APP_URL = 'https://nbg-docsign.vercel.app'

export function resolveAppUrl(_source?: UrlSource) {
  const cleanBaseUrl = normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) || DEFAULT_APP_URL
  return cleanBaseUrl
}

export function buildDocumentViewUrl(documentId: string, source?: UrlSource) {
  const safeDocumentId = encodeURIComponent(String(documentId || 'missing-document'))
  const cleanBaseUrl = resolveAppUrl(source)
  const preciseCandidateLink = `${cleanBaseUrl}/view-document/${safeDocumentId}`
  return preciseCandidateLink
}

export function buildDocumentPdfUrl(documentId: string, source?: UrlSource) {
  const safeDocumentId = encodeURIComponent(String(documentId || 'missing-document'))
  return `${resolveAppUrl(source)}/view-document/${safeDocumentId}`
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
