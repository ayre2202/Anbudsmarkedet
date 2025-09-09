import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Bruk Service Role for å verifisere token og slå opp rolle uten RLS-problemer
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

export async function GET(request: Request) {
  const authHeader =
    request.headers.get('authorization') ||
    request.headers.get('Authorization') ||
    ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return NextResponse.json({ ok: false, reason: 'no-token' }, { status: 401 })
  }

  // Verifiser access token
  const { data: userData, error: authErr } = await adminClient.auth.getUser(token)
  if (authErr || !userData?.user) {
    return NextResponse.json({ ok: false, reason: 'invalid-token' }, { status: 401 })
  }

  // Sjekk rolle i users-tabellen
  const { data, error } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, reason: 'no-row' }, { status: 403 })
  }

  if (data.role !== 'admin') {
    return NextResponse.json({ ok: false, role: data.role, reason: 'not-admin' }, { status: 403 })
  }

  // ✅ Brukeren er admin → send klart svar som AdminLayout kan forstå
  return NextResponse.json({ ok: true, role: 'admin' })
}
