import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Document } from '@/lib/types'
import { normalizeDocument } from '@/lib/document-normalize'
import DocumentDetailClient from './document-detail-client'

export const dynamic = 'force-dynamic'

export default async function DocumentDetailPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('documents').select('*').eq('id', docId).single()
  if (error || !data) notFound()

  const doc = normalizeDocument(data as Document)

  const { data: audit } = await supabase
    .from('audit_trail').select('*')
    .eq('document_id', doc.id)
    .order('created_at', { ascending: false })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://nbg-docsign.vercel.app')

  const signingUrl = `${appUrl}/sign/${doc.signing_token}`

  return (
    <DocumentDetailClient
      doc={doc}
      audit={audit ?? []}
      signingUrl={signingUrl}
    />
  )
}
