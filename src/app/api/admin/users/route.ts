import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(SUPABASE_URL, SERVICE_KEY)

async function getAuthUserId(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return null

    const { data, error } = await adminClient.auth.getUser(token)
    if (error || !data?.user) return null
    return data.user.id
  } catch (error) {
    console.error('getAuthUserId error:', error)
    return null
  }
}

async function assertAdmin(userId: string) {
  try {
    const { data, error } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('assertAdmin database error:', error)
      return { ok: false as const, error: 'role_lookup_failed' }
    }
    if (!data || data.role !== 'admin') return { ok: false as const, error: 'not_admin' }
    return { ok: true as const }
  } catch (error) {
    console.error('assertAdmin error:', error)
    return { ok: false as const, error: 'role_lookup_failed' }
  }
}

// Helper function to ensure profiles entry exists
async function ensureProfileExists(userId: string, role: string) {
  try {
    const roleForProfile = role === 'business' ? 'business_user' : role === 'private' ? 'private_user' : role
    
    const { error } = await adminClient
      .from('profiles')
      .upsert({ 
        user_id: userId, 
        role: roleForProfile 
      })
    
    if (error) {
      console.error('Profile upsert error:', error)
    }
  } catch (error) {
    console.error('Failed to ensure profile exists:', error)
  }
}

// Helper function to initialize business clips (only if not already exists)
async function initializeBusinessClips(userId: string) {
  try {
    // Use INSERT with ON CONFLICT to avoid duplicates
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1)
    nextMonth.setHours(0, 0, 0, 0)
    
    const { error } = await adminClient
      .from('business_clips')
      .insert({ 
        user_id: userId,
        remaining_clips: 30,
        total_monthly_clips: 30,
        next_reset_date: nextMonth.toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      })
    
    if (error && error.code !== '23505') { // 23505 is unique constraint violation
      console.error('Business clips initialization error:', error)
    } else if (error?.code === '23505') {
      console.log('Business clips already exist for user:', userId)
    } else {
      console.log('Successfully initialized business clips for user:', userId)
    }
  } catch (error) {
    console.error('Failed to initialize business clips:', error)
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('GET /api/admin/users - Starting request')
    
    const uid = await getAuthUserId(req)
    console.log('User ID:', uid)
    
    if (!uid) {
      console.log('No user ID found')
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })
    }

    const admin = await assertAdmin(uid)
    console.log('Admin check result:', admin)
    
    if (!admin.ok) {
      console.log('Admin check failed:', admin.error)
      return NextResponse.json({ error: admin.error }, { status: 403 })
    }

    console.log('Fetching all auth users...')
    
    // Fetch ALL users from auth.users (this is the key fix)
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers()
    if (authError) {
      console.error('Auth users fetch error:', authError)
      return NextResponse.json({ error: 'auth_users_fetch_failed', details: authError.message }, { status: 500 })
    }

    console.log('Auth users fetched:', authData.users?.length || 0)

    // Fetch users table data for additional info
    const { data: usersData, error: usersError } = await adminClient
      .from('users')
      .select('id,email,name,role,created_at,banned,business_access_revoked')

    if (usersError) {
      console.error('Users table fetch error:', usersError)
      return NextResponse.json({ error: 'users_table_fetch_failed', details: usersError.message }, { status: 500 })
    }

    console.log('Users table data fetched:', usersData?.length || 0)

    // Create lookup map from users table (ensure email matching works)
    const usersMap = new Map((usersData || []).map(u => [u.id, u]))
    const usersByEmail = new Map((usersData || []).map(u => [u.email?.toLowerCase(), u]))

    console.log('Users in database:', (usersData || []).map(u => ({ email: u.email, role: u.role, id: u.id })))

    // Merge auth.users with users table data
    const mergedUsers = (authData.users || []).map(authUser => {
      const userTableData = usersMap.get(authUser.id) || usersByEmail.get(authUser.email?.toLowerCase())
      
      // Detect role from multiple sources:
      // 1. Users table (highest priority)
      // 2. Explicit role in auth metadata  
      // 3. Infer business from company info in metadata
      // 4. Default to private
      let detectedRole = userTableData?.role
      
      if (!detectedRole) {
        // Check explicit role in metadata
        detectedRole = authUser.user_metadata?.role
        
        // If no explicit role, infer from business metadata
        if (!detectedRole && authUser.user_metadata) {
          const metadata = authUser.user_metadata
          const hasBusinessInfo = metadata.company_name || metadata.org_number || metadata.description
          detectedRole = hasBusinessInfo ? 'business' : 'private'
        }
      }
      
      // Final fallback
      if (!detectedRole) detectedRole = 'private'
      
      console.log(`Processing ${authUser.email}: userTableData=${!!userTableData}, final_role=${detectedRole}, metadata_role=${authUser.user_metadata?.role}, has_company_info=${!!(authUser.user_metadata?.company_name)}`)
      
      return {
        id: authUser.id,
        email: authUser.email || '',
        name: userTableData?.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
        role: detectedRole,
        created_at: userTableData?.created_at || authUser.created_at,
        banned: userTableData?.banned || false,
        business_access_revoked: userTableData?.business_access_revoked || null,
        // Flag to show if user exists in users table
        in_users_table: !!userTableData
      }
    })

    // Sort by creation date (newest first)
    mergedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    console.log('Successfully merged users:', mergedUsers.length)
    return NextResponse.json({ users: mergedUsers })
  } catch (e: any) {
    console.error('GET /api/admin/users error:', e)
    return NextResponse.json({ error: e?.message || 'unexpected' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const uid = await getAuthUserId(req)
    if (!uid) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 })

    const admin = await assertAdmin(uid)
    if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: 403 })

    const body = await req.json().catch(() => ({}))

    // Handle role update
    if (body.user_id && body.role) {
      const user_id = String(body.user_id).trim()
      const role = String(body.role).trim() as 'private' | 'business' | 'admin'

      if (!user_id || !['private', 'business', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
      }

      // Get auth user info to ensure we have email
      const { data: authUsers } = await adminClient.auth.admin.listUsers()
      const authUser = authUsers.users.find(u => u.id === user_id)
      
      if (!authUser) {
        return NextResponse.json({ error: 'user_not_found_in_auth' }, { status: 404 })
      }

      // Get current user to check previous role (might not exist)
      const { data: currentUser } = await adminClient
        .from('users')
        .select('role')
        .eq('id', user_id)
        .single()

      // Prepare upsert object (works for both new and existing users)
      const upsertData: any = { 
        id: user_id,
        email: authUser.email,
        name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
        role 
      }

      // When changing TO business role, ensure business_access_revoked is false
      if (role === 'business') {
        upsertData.business_access_revoked = false
      }
      // When changing FROM business to another role, reset business_access_revoked to null
      else {
        if (currentUser?.role === 'business') {
          upsertData.business_access_revoked = null
        }
      }

      // Use UPSERT instead of UPDATE to handle new users
      const { data, error } = await adminClient
        .from('users')
        .upsert(upsertData)
        .select('id,email,name,role,created_at,banned,business_access_revoked')
        .single()

      if (error) {
        console.error('Database upsert error:', error)
        return NextResponse.json({ error: 'upsert_failed', details: error.message }, { status: 500 })
      }

      // Ensure profiles entry exists with correct role
      await ensureProfileExists(user_id, role)

      // If changing TO business, initialize clips
      if (role === 'business') {
        await initializeBusinessClips(user_id)
      }

      // Update auth metadata to sync role
      try {
        const { error: authError } = await adminClient.auth.admin.updateUserById(user_id, {
          user_metadata: { ...authUser.user_metadata, role }
        })
        if (authError) {
          console.error('Auth metadata update error:', authError)
        }
      } catch (authError) {
        console.error('Failed to update auth metadata:', authError)
        // Continue even if auth metadata update fails
      }

      return NextResponse.json({ user: data })
    }

    // Handle clip update
    if (body.user_id && body.update_clips !== undefined) {
      const user_id = String(body.user_id).trim()
      const newAmount = parseInt(String(body.update_clips))
      
      if (isNaN(newAmount) || newAmount < 0) {
        return NextResponse.json({ error: 'invalid_clip_amount' }, { status: 400 })
      }

      const { data, error } = await adminClient
        .from('business_clips')
        .update({ 
          remaining_clips: newAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .select('remaining_clips')
        .single()

      if (error) {
        console.error('Clip update error:', error)
        return NextResponse.json({ error: 'clip_update_failed' }, { status: 500 })
      }

      return NextResponse.json({ success: true, clips: data })
    }

    // Handle ban/unban
    if (body.user_id && (body.ban !== undefined || body.unban !== undefined)) {
      const user_id = String(body.user_id).trim()
      
      if (body.ban) {
        const { data, error } = await adminClient
          .from('users')
          .update({ banned: true })
          .eq('id', user_id)
          .select('id,email,name,role,created_at,banned,business_access_revoked')
          .single()

        if (error) {
          console.error('Ban error:', error)
          return NextResponse.json({ error: 'ban_failed' }, { status: 500 })
        }
        return NextResponse.json({ user: data })
      }

      if (body.unban) {
        const { data, error } = await adminClient
          .from('users')
          .update({ banned: false })
          .eq('id', user_id)
          .select('id,email,name,role,created_at,banned,business_access_revoked')
          .single()

        if (error) {
          console.error('Unban error:', error)
          return NextResponse.json({ error: 'unban_failed' }, { status: 500 })
        }
        return NextResponse.json({ user: data })
      }
    }

    // Handle business access revoke/restore
    if (body.user_id && (body.revoke_business_access !== undefined || body.restore_business_access !== undefined)) {
      const user_id = String(body.user_id).trim()
      
      if (body.revoke_business_access) {
        const { data, error } = await adminClient
          .from('users')
          .update({ business_access_revoked: true })
          .eq('id', user_id)
          .select('id,email,name,role,created_at,banned,business_access_revoked')
          .single()

        if (error) {
          console.error('Revoke error:', error)
          return NextResponse.json({ error: 'revoke_failed' }, { status: 500 })
        }
        return NextResponse.json({ user: data })
      }

      if (body.restore_business_access) {
        const { data, error } = await adminClient
          .from('users')
          .update({ business_access_revoked: false })
          .eq('id', user_id)
          .select('id,email,name,role,created_at,banned,business_access_revoked')
          .single()

        if (error) {
          console.error('Restore error:', error)
          return NextResponse.json({ error: 'restore_failed' }, { status: 500 })
        }
        return NextResponse.json({ user: data })
      }
    }

    // Handle user creation/update by email
    if (body.email) {
      const email = String(body.email).trim().toLowerCase()
      const role = String(body.role || 'private').trim() as 'private' | 'business' | 'admin'

      if (!email || !['private', 'business', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'invalid_email_payload' }, { status: 400 })
      }

      // Check if user exists in auth
      const { data: authUsers } = await adminClient.auth.admin.listUsers()
      const existingAuthUser = authUsers.users.find(u => u.email === email)

      if (existingAuthUser) {
        // Prepare update object for existing user
        const updateData: any = { 
          id: existingAuthUser.id, 
          email, 
          role,
          name: body.name || existingAuthUser.user_metadata?.name || null
        }

        // Set business_access_revoked based on role
        if (role === 'business') {
          updateData.business_access_revoked = false
        } else {
          updateData.business_access_revoked = null
        }

        // Update existing user
        const { data, error } = await adminClient
          .from('users')
          .upsert(updateData)
          .select('id,email,name,role,created_at,banned,business_access_revoked')
          .single()

        if (error) {
          console.error('User update error:', error)
          return NextResponse.json({ error: 'user_update_failed' }, { status: 500 })
        }

        // Ensure profiles entry exists
        await ensureProfileExists(existingAuthUser.id, role)

        // If role is business, initialize clips
        if (role === 'business') {
          await initializeBusinessClips(existingAuthUser.id)
        }

        // Update auth metadata
        try {
          await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
            user_metadata: { role, name: data.name }
          })
        } catch (authError) {
          console.error('Failed to update auth metadata:', authError)
        }

        return NextResponse.json({ user: data })
      } else {
        // Create new user
        const { data: newAuthUser, error: authError } = await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { 
            role,
            name: body.name || email.split('@')[0]
          }
        })

        if (authError || !newAuthUser.user) {
          console.error('Auth user creation error:', authError)
          return NextResponse.json({ error: 'auth_user_creation_failed' }, { status: 500 })
        }

        // Prepare data for new user
        const userData: any = { 
          id: newAuthUser.user.id, 
          email, 
          role,
          name: body.name || email.split('@')[0]
        }

        // Set business_access_revoked based on role
        if (role === 'business') {
          userData.business_access_revoked = false
        } else {
          userData.business_access_revoked = null
        }

        const { data, error } = await adminClient
          .from('users')
          .upsert(userData)
          .select('id,email,name,role,created_at,banned,business_access_revoked')
          .single()

        if (error) {
          console.error('User DB creation error:', error)
          return NextResponse.json({ error: 'user_db_creation_failed' }, { status: 500 })
        }

        // Ensure profiles entry exists for new user
        await ensureProfileExists(newAuthUser.user.id, role)

        // If new user is business, initialize clips
        if (role === 'business') {
          await initializeBusinessClips(newAuthUser.user.id)
        }

        return NextResponse.json({ user: data })
      }
    }

    return NextResponse.json({ error: 'invalid_request' }, { status: 400 })

  } catch (e: any) {
    console.error('PATCH /api/admin/users error:', e)
    return NextResponse.json({ error: e?.message || 'unexpected' }, { status: 500 })
  }
}