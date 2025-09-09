import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { verifyTrustToken, normalizeIp } from '@/lib/server/2fa'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

function getIp(h: Readonly<Headers>) {
  const xff = h.get('x-forwarded-for') || h.get('X-Forwarded-For') || ''
  const direct = h.get('x-real-ip') || ''
  return normalizeIp(xff || direct || '127.0.0.1')
}

export async function GET() {
  const h = await headers()
  const ip = getIp(h)

  const authHeader = h.get('authorization') || h.get('Authorization') || ''
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: authData, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !authData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await adminClient.from('users').select('role').eq('id', authData.user.id).single()
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const c = await cookies()
  const trust = c.get('am_admin_trust')?.value || null
  const ok = verifyTrustToken(trust, ip)
  return NextResponse.json({ required: !ok })
}
