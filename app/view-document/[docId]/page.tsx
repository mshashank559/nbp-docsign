import { notFound, redirect } from 'next/navigation'
import { serviceClient } from '@/lib/service-supabase'
import { normalizeDocument } from '@/lib/document-normalize'
import { Document } from '@/lib/types'
import PublicSigningWizard from '@/components/ui/PublicSigningWizard'

export const dynamic = 'force-dynamic'

export default async function PublicDocumentViewPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params
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
    .eq('id', docId)
    .single()

  if (error || !data) notFound()

  const doc = normalizeDocument(data as Document)
  if (doc.type !== 'agreement') {
    redirect(`/api/document/${encodeURIComponent(doc.id)}`)
  }

  return <PublicSigningWizard doc={doc} />
}
