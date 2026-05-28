import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import Sidebar from '@/components/ui/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let isAuthenticated = false

  try {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      if (error.status === 400 || error.message?.includes('Refresh Token')) {
        try {
          await supabase.auth.signOut()
        } catch {}
      }
      isAuthenticated = false
    } else {
      isAuthenticated = Boolean(data.user)
    }
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
