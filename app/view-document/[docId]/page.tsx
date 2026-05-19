import { notFound, redirect } from 'next/navigation'
import { serviceClient } from '@/lib/service-supabase'
import { normalizeDocument } from '@/lib/document-normalize'
import { Document } from '@/lib/types'
import PublicSigningWizard from '@/components/ui/PublicSigningWizard'
import { requiresSignatureDocument } from '@/lib/document-workflow'

export const dynamic = 'force-dynamic'

export default async function PublicDocumentViewPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params
  const documentKey = decodeURIComponent(docId || '')
  let supabase
  try {
    supabase = serviceClient()
  } catch (err) {
    return (
      <div style={{ padding: 24 }}>
        <h2>System configuration error</h2>
        <p>Missing Supabase credentials on the server. Please contact the site administrator.</p>
      </div>
    )
  }
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentKey)
    .single()

  let documentRecord = data
  if (error || !documentRecord) {
    const tokenResult = await supabase
      .from('documents')
      .select('*')
      .eq('signing_token', documentKey)
      .single()

    documentRecord = tokenResult.data
  }

  if (!documentRecord) notFound()

  const doc = normalizeDocument(documentRecord as Document)
  if (!requiresSignatureDocument(doc)) {
    redirect(`/api/download-pdf?id=${encodeURIComponent(doc.id)}`)
  }

  return <PublicSigningWizard doc={doc} />
}
