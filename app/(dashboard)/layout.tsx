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
    <div className="flex h-screen overflow-hidden bg-white dark:bg-brand-950 transition-colors">
      {/* Sidebar is now a permanent part of the layout with no gaps[cite: 1] */}
      <Sidebar />
      
      <main className="flex-1 relative overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
