import { NextResponse, NextRequest } from 'next/server'
import { cookies, headers } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Service-role klient (bypasser RLS for sikre admin-operasjoner)
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function getAuthUserId(req: NextRequest) {
  // 1) Prøv cookies (server session)
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) return session.user.id

  // 2) Fallback: Authorization: Bearer <token>
  const h = await headers()
  const authHeader = h.get('authorization') || h.get('Authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null

  const { data, error } = await adminClient.auth.getUser(token)
  if (error || !data?.user) return null
  return data.user.id
}

async function assertAdmin(userId: string) {
  const { data, error } = await adminClient
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) {
    return { ok: false as const, error: 'role_lookup_failed' }
  }
  if (!data || data.role !== 'admin') {
    return { ok: false as const, error: 'not_admin' }
  }
  return { ok: true as const }
}

export async function GET(req: NextRequest) {
  try {
    const uid = await getAuthUserId(req)
    if (!uid) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    const admin = await assertAdmin(uid)
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: 403 })
    }

    const { data, error } = await adminClient
      .from('jobs')
      .select('id,title,created_at,status,rejected_reason,user_id,category')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'jobs_fetch_failed' }, { status: 500 })
    }
    return NextResponse.json({ jobs: data ?? [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unexpected' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid = await getAuthUserId(req)
    if (!uid) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    const admin = await assertAdmin(uid)
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const id = String(body?.id || '').trim()
    const status = String(body?.status || '').trim() as 'pending' | 'approved' | 'rejected' | 'archived'
    const rejected_reason = (body?.rejected_reason ?? null) as string | null

    if (!id || !['pending', 'approved', 'rejected', 'archived'].includes(status)) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
    }

    const { data, error } = await adminClient
      .from('jobs')
      .update({ status, rejected_reason: status === 'rejected' ? (rejected_reason ?? null) : null })
      .eq('id', id)
      .select('id,title,created_at,status,rejected_reason,user_id,category')
      .single()

    if (error) {
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }

    return NextResponse.json({ job: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'unexpected' }, { status: 500 })
  }
}
