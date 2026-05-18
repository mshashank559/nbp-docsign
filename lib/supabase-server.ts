import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function requiredServerEnv(name: string, value: string | undefined) {
  const trimmedValue = value?.trim()
  if (!trimmedValue) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return trimmedValue
}

/**
 * Server-side Supabase client.
 * Only call from Server Components, Route Handlers, and middleware.
 * Never import this file from 'use client' components.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    requiredServerEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    requiredServerEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          } catch {}
        },
      },
    }
  )
}
