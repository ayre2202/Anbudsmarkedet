import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const adminClient = createClient(supabaseUrl, serviceKey)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Mangler authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Valider token med admin client
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Ugyldig token' }, { status: 401 })
    }

    // Sjekk rolle fra public.users tabellen
    const { data: usersData, error: roleError } = await adminClient
      .from('users')
      .select('role')
      .eq('email', user.email)

    const userData = usersData?.[0]

    if (roleError || !userData) {
      return NextResponse.json({ 
        error: 'Kunne ikke hente brukerrolle',
        debug: { 
          roleError: roleError?.message,
          usersData: usersData,
          userEmail: user.email,
          rowCount: usersData?.length
        }
      }, { status: 403 })
    }

    const isAdmin = userData?.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json({ 
        error: 'Ikke tilgang - må være admin',
        debug: {
          userEmail: user.email,
          currentRole: userData?.role,
          userData: userData,
          expectedRole: 'admin',
          isAdmin: isAdmin
        }
      }, { status: 403 })
    }

    const { data: clips, error } = await adminClient
      .from('business_clips')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ clips })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}