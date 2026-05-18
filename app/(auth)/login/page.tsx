'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Email and password are required.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/role-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(body.error || 'Sign in failed. Please check your email and password.')
        setLoading(false)
        return
      }

      if (!body.ok) {
        setError('Sign in succeeded, but no session was created. Please verify this user in Supabase Authentication.')
        setLoading(false)
        return
      }

      router.replace('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('[login] Supabase sign-in failed', err)

      setError(
        errorMessage.includes('Failed to fetch')
          ? 'Unable to reach Supabase. Check your network connection and verify your Supabase URL/key in .env.local.'
          : 'Authentication failed. Please try again or contact your administrator.'
      )
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white font-sans text-slate-950 md:grid md:grid-cols-2">
      <section className="relative min-h-[260px] overflow-hidden bg-gradient-to-br from-[#1814d7] via-[#1d4ed8] to-[#0b145f] p-8 sm:p-10 md:min-h-screen md:p-14">
        <div className="pointer-events-none absolute -right-28 top-24 h-80 w-80 rounded-full bg-white/10 blur-sm md:h-[28rem] md:w-[28rem]" />
        <div className="pointer-events-none absolute -bottom-28 left-16 h-72 w-72 rounded-full bg-cyan-300/10 blur-2xl md:h-96 md:w-96" />

        <img
          src="/nb-logo-full-white.png"
          alt="NetBounce Placement LLC"
          className="relative z-10 h-auto w-56 object-contain sm:w-72 md:w-80 lg:w-[26rem]"
        />
      </section>

      <section className="flex min-h-[calc(100vh-260px)] items-center justify-center bg-white px-6 py-12 sm:px-10 md:min-h-screen">
        <div className="w-full max-w-[380px]">
          <div className="mb-9">
            <h1 className="m-0 text-3xl font-bold tracking-tight text-slate-900">
              Sign in to your account
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Access leads, follow-ups, and your team dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                Your email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@netbounceplacement.com"
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(value => !value)}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-lg bg-[#2563eb] text-sm font-semibold text-white transition hover:bg-[#1d4ed8] focus:outline-none focus:ring-4 focus:ring-blue-600/20 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Access restricted to NetBounce Placement LLC team members.
          </p>
        </div>
      </section>
    </main>
  )
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M2.75 12s3.25-6.25 9.25-6.25S21.25 12 21.25 12s-3.25 6.25-9.25 6.25S2.75 12 2.75 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 14.75a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="M3.5 3.5l17 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M10.6 5.9A9.7 9.7 0 0 1 12 5.75c6 0 9.25 6.25 9.25 6.25a17.8 17.8 0 0 1-2.64 3.42M6.3 7.43A17.3 17.3 0 0 0 2.75 12S6 18.25 12 18.25c1.56 0 2.93-.42 4.1-1.03" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.95 9.95a2.75 2.75 0 0 0 3.89 3.89" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
