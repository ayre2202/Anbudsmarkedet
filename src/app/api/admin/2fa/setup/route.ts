import { NextResponse } from 'next/server'
import { headers, cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { encryptText, decryptText } from '@/lib/server/crypto'
import { buildOtpAuthURL, generateBase32Secret, verifyTotp } from '@/lib/server/totp'
import { normalizeIp } from '@/lib/server/2fa'

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
  const authHeader = h.get('authorization') || h.get('Authorization') || ''
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: authData, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !authData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await adminClient.from('users').select('role,email').eq('id', authData.user.id).single()
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let secretEnc: string | null = null
  const { data: existing } = await adminClient
    .from('admin_totp')
    .select('secret_enc, confirmed_at')
    .eq('user_id', authData.user.id)
    .maybeSingle()

  if (existing?.secret_enc) {
    secretEnc = existing.secret_enc
  } else {
    const secret = generateBase32Secret()
    secretEnc = encryptText(secret)
    await adminClient
      .from('admin_totp')
      .upsert({ user_id: authData.user.id, secret_enc: secretEnc }, { onConflict: 'user_id' })
  }

  const secret = decryptText(secretEnc!)
  const issuer = 'Anbudsmarkedet'
  const account = me.email || 'admin'
  const uri = buildOtpAuthURL(issuer, account, secret)

  return NextResponse.json({ secret, uri })
}

export async function POST(request: Request) {
  const h = await headers()
  const c = await cookies()

  const authHeader = h.get('authorization') || h.get('Authorization') || ''
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: authData, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !authData?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: me } = await adminClient.from('users').select('role').eq('id', authData.user.id).single()
  if (!me || me.role !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const body = await request.json().catch(() => null)
  const code = (body?.code || '').toString().trim()
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'invalid_code' }, { status: 400 })

  const { data: row } = await adminClient
    .from('admin_totp')
    .select('secret_enc')
    .eq('user_id', authData.user.id)
    .single()

  if (!row?.secret_enc) return NextResponse.json({ error: 'not_enrolled' }, { status: 400 })

  const secret = decryptText(row.secret_enc)
  const ok = verifyTotp(secret, code, 30, 1, 6, 0)
  if (!ok) return NextResponse.json({ error: 'code_not_valid' }, { status: 400 })

  await adminClient
    .from('admin_totp')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('user_id', authData.user.id)

  // ✅ Sett enkel trust-cookie slik middleware gjenkjenner den
  const isProd = process.env.NODE_ENV === 'production'
  c.set('am_admin_trust', '1', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 14 * 24 * 3600,
  })

  return NextResponse.json({ ok: true })
}
