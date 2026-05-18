import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

function requiredEnv(name: string, value: string | undefined) {
  const trimmedValue = value?.trim()
  if (!trimmedValue) {
    throw new Error(
      `Missing ${name}. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your environment.`
    )
  }

  return trimmedValue!
}

/**
 * Browser / client-side Supabase client.
 * Safe to use in 'use client' components and anywhere that does NOT have access to next/headers.
 */
export function createClient() {
  if (browserClient) return browserClient

  const supabaseUrl = requiredEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )
  const supabaseAnonKey = requiredEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  try {
    new URL(supabaseUrl)
  } catch {
    throw new Error(
      'Invalid NEXT_PUBLIC_SUPABASE_URL. Use the full Supabase project URL, for example https://your-project.supabase.co.'
    )
  }

  browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return browserClient
}
