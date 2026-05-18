'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_USER_ROLE, resolveUserRole, UserRole } from './rbac'
import { createClient } from './supabase'

export function useUserRole() {
  const [role, setRoleState] = useState<UserRole>(DEFAULT_USER_ROLE)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const supabase = createClient()
    const readSessionRole = async () => {
      const { data } = await supabase.auth.getUser()
      setRoleState(resolveUserRole(data.user))
      setEmail(data.user?.email || '')
    }

    readSessionRole()

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setRoleState(resolveUserRole(session?.user))
      setEmail(session?.user?.email || '')
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [])

  return { role, email }
}
