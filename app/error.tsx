"use client"

import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-screen bg-white p-8 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-slate-50 p-10 shadow-lg">
        <h1 className="text-4xl font-bold">Something went wrong</h1>
        <p className="mt-4 text-slate-700">
          We hit an internal server error while loading your app.
        </p>
        <div className="mt-6 rounded-2xl bg-white p-4 text-sm text-slate-700 ring-1 ring-slate-200">
          <p className="font-medium text-slate-900">Try this:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>Make sure your Supabase env vars are configured in Vercel.</li>
            <li>Ensure <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set.</li>
            <li>Check that the app is deployed from the latest GitHub commit.</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-8 inline-flex rounded-lg bg-slate-900 px-5 py-3 text-white hover:bg-slate-800"
        >
          Retry
        </button>
      </div>
    </main>
  )
}
