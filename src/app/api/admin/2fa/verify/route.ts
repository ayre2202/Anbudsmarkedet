import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { decryptText } from '@/lib/server/crypto'
import { verifyTotp } from '@/lib/server/totp'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(request: Request) {
  const h = await headers()

  const authHeader = h.get('authorization') || h.get('Authorization') || ''
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: authData, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !authData?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Kun admin
  const { data: me } = await adminClient.from('users').select('role').eq('id', authData.user.id).single()
  if (!me || me.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const code = (body?.code || '').toString().trim()
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: 'invalid_code' }, { status: 400 })
  }

  const { data: row } = await adminClient
    .from('admin_totp')
    .select('secret_enc, confirmed_at')
    .eq('user_id', authData.user.id)
    .single()

  if (!row?.secret_enc || !row.confirmed_at) {
    return NextResponse.json({ error: 'not_enrolled' }, { status: 400 })
  }

  const secret = decryptText(row.secret_enc)
  const ok = verifyTotp(secret, code, 30, 1, 6, 0)
  if (!ok) {
    return NextResponse.json({ error: 'code_not_valid' }, { status: 400 })
  }

  // Sett trust-cookie (14 dager)
  const isProd = process.env.NODE_ENV === 'production'
  const resp = NextResponse.json({ ok: true })
  resp.cookies.set('am_admin_trust', '1', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 14 * 24 * 3600, // 14 dager
  })
  return resp
}
