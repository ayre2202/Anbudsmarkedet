'use server'

import { cookies } from 'next/headers'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'

export async function loginAdmin(email: string, password: string) {
  const supabase = createServerActionClient({ cookies })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
