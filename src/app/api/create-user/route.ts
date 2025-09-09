// src/app/api/create-user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const { email, fullName } = await req.json()

    const service_role = process.env.SUPABASE_SERVICE_ROLE_KEY
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!service_role || !url) {
      console.error('Missing Supabase env vars.')
      return NextResponse.json({ error: 'Missing Supabase env vars.' }, { status: 500 })
    }

    const supabase = createClient(url, service_role, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Bruk inviteUserByEmail i stedet for createUser
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password`,
        data: { 
          full_name: fullName 
        }
      }
    )

    if (error) {
      console.error('Error inviting user:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User invited successfully. Invite email sent.', 
      id: data.user?.id 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Unexpected error:', error.message)
    return NextResponse.json({ error: 'Unexpected error occurred.' }, { status: 500 })
  }
}