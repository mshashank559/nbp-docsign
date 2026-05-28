import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) return null
  return { url, anonKey }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/view-document/') || pathname.startsWith('/sign/')) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  let isAuthenticated = false
  const supabaseConfig = getSupabaseConfig()

  if (supabaseConfig) {
    const supabase = createServerClient(
      supabaseConfig.url,
      supabaseConfig.anonKey,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        if (error.status === 400 || error.message?.includes('Refresh Token') || error.code === 'refresh_token_not_found') {
          request.cookies.getAll().forEach(c => {
            if (c.name.startsWith('sb-') || c.name.includes('auth')) {
              response.cookies.delete(c.name)
            }
          })
        }
        isAuthenticated = false
      } else {
        isAuthenticated = Boolean(data.user)
      }
    } catch {
      isAuthenticated = false
    }
  }

  if (pathname.startsWith('/dashboard') && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if ((pathname === '/login' || pathname === '/') && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
}
