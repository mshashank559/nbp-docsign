import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const SHARED_LOGIN_EMAIL = 'enroll@netbounceplacement.com'
const ACCOUNTS_LOGIN_PASSWORD = 'Enroll@1405'
const HR_LOGIN_PASSWORD = 'hr@1405'

function resolveLoginRole(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (normalizedEmail !== SHARED_LOGIN_EMAIL) return null
  if (password === ACCOUNTS_LOGIN_PASSWORD) return 'Accounts'
  if (password === HR_LOGIN_PASSWORD) return 'HR'
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    const role = resolveLoginRole(String(email || ''), String(password || ''))

    if (!role) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const supabase = await createServerSupabaseClient()
    const signInPassword = process.env.SUPABASE_SHARED_LOGIN_PASSWORD || ACCOUNTS_LOGIN_PASSWORD
    const { data, error } = await supabase.auth.signInWithPassword({
      email: SHARED_LOGIN_EMAIL,
      password: signInPassword,
    })

    if (error || !data.session) {
      return NextResponse.json({
        error: error?.message || 'Sign in failed. Verify the shared Supabase account password.',
      }, { status: 401 })
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        role,
        user_role: role,
        department: role,
      },
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, role })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to sign in.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
