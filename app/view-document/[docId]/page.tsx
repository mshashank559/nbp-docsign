import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { normalizeDocument } from '@/lib/document-normalize'
import { Document } from '@/lib/types'
import PublicSigningWizard from '@/components/ui/PublicSigningWizard'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export default async function PublicDocumentViewPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params
  const supabase = serviceClient()
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', docId)
    .single()

  if (error || !data) notFound()

  const doc = normalizeDocument(data as Document)
  return <PublicSigningWizard doc={doc} />
}
