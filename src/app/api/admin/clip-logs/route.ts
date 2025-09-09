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

    // Hent alle clip usage logs først
    const { data: logs, error: logsError } = await adminClient
      .from('clip_usage_logs')
      .select('*')
      .order('used_at', { ascending: false })

    if (logsError) throw logsError

    // Hvis ingen logs, returner tom array
    if (!logs || logs.length === 0) {
      return NextResponse.json({ logs: [] })
    }

    // Hent jobs og users separat og join i JavaScript
    const jobIds = [...new Set(logs.map(log => log.job_id).filter(Boolean))]
    const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))]

    // Håndter tomme arrays
    const [jobsResponse, usersResponse] = await Promise.all([
      jobIds.length > 0 
        ? adminClient.from('jobs').select('id, title, job_id, location, contact_email, contact_phone, created_at').in('id', jobIds)
        : { data: [], error: null },
      userIds.length > 0
        ? adminClient.from('users').select('id, email, role').in('id', userIds)
        : { data: [], error: null }
    ])

    const jobs = jobsResponse.data || []
    const users = usersResponse.data || []

    // Join data i JavaScript
    const enrichedLogs = logs.map(log => ({
      ...log,
      jobs: jobs.find(job => job.id === log.job_id) || null,
      users: users.find(user => user.id === log.user_id) || null
    }))

    return NextResponse.json({ logs: enrichedLogs })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}