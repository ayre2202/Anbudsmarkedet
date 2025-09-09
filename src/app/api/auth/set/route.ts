import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { access_token, refresh_token } = await request.json()
    if (!access_token || !refresh_token) {
      return NextResponse.json({ ok: false, error: 'missing-tokens' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
