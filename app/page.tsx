import { redirect } from 'next/navigation'

// Middleware redirects unauthenticated users to /login before this runs.
export default function RootPage() {
  redirect('/dashboard')
}
