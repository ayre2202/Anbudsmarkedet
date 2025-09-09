import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ADMIN_SETUP_TOKEN = process.env.ADMIN_SETUP_TOKEN!

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

export async function POST(req: Request) {
  try {
    const token = req.headers.get('x-setup-token')
    if (!token || token !== ADMIN_SETUP_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { email, user_id, to_role = 'private' } = body as {
      email?: string
      user_id?: string
      to_role?: 'private' | 'business'
    }

    if (!email && !user_id) {
      return NextResponse.json({ error: 'Provide email or user_id' }, { status: 400 })
    }

    const match = email ? { email } : { id: user_id }
    const { data, error } = await adminClient
      .from('users')
      .update({ role: to_role })
      .match(match)
      .select('id,email,role')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ ok: true, user: data })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
