'use client'

import supabase from '@/lib/supabase/client'

export default async function logout(redirectTo: string = '/') {
  try {
    await supabase.auth.signOut()
  } catch {}
  try {
    await fetch('/api/auth/signout', { method: 'POST', cache: 'no-store' })
  } catch {}
  window.location.assign(redirectTo)
}
