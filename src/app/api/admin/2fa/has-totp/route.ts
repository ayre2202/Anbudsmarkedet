import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

export async function GET() {
  const h = await headers()
  const authHeader = h.get('authorization') || h.get('Authorization') || ''
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: authData, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !authData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await adminClient.from('users').select('role').eq('id', authData.user.id).single()
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const { data: totp } = await adminClient
    .from('admin_totp')
    .select('user_id, confirmed_at')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  return NextResponse.json({ enrolled: !!totp?.user_id, confirmed: !!totp?.confirmed_at })
}
