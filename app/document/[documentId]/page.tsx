import { redirect } from 'next/navigation'

export default async function DocumentPdfRedirectPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params
  redirect(`/api/document/${encodeURIComponent(String(documentId || 'missing-document'))}`)
}
