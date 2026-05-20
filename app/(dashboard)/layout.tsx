import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let isAuthenticated = false

  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.getUser()
    isAuthenticated = Boolean(data.user)
  } catch {
    isAuthenticated = false
  }

  if (!isAuthenticated) redirect('/login')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--page-bg)' }}>
      <Sidebar />
      <main className="flex-1 relative overflow-y-auto" style={{ background: 'var(--page-bg)' }}>
        {children}
      </main>
    </div>
  )
}
