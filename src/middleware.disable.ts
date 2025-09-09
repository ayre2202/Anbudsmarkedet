// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  let supabase
  try {
    // VIKTIG: bruk den *samme* 'res' her
    supabase = createMiddlewareClient({ req, res })
  } catch (err) {
    console.error('Supabase init error, sletter gamle cookies:', err)
    // Slett alle Supabase‑cookies slik at nye kan settes
    res.cookies.delete('sb-access-token')
    res.cookies.delete('sb-refresh-token')
    res.cookies.delete('sb') 
    return NextResponse.redirect(new URL('/auth/role-login', req.url))
  }

  let sessionData
  try {
    sessionData = await supabase.auth.getSession()
  } catch (err) {
    console.error('Token parse error, sletter gamle cookies:', err)
    res.cookies.delete('sb-access-token')
    res.cookies.delete('sb-refresh-token')
    res.cookies.delete('sb') 
    return NextResponse.redirect(new URL('/auth/role-login', req.url))
  }

  const session = sessionData.data.session
  if (!session) {
    return NextResponse.redirect(new URL('/auth/role-login', req.url))
  }

  const user = session.user
  const role = (user.user_metadata as any)?.role

  const { pathname } = req.nextUrl

  // --- Privat‑dashboard: tillat begge roller ---
  if (pathname.startsWith('/privat-dashboard')) {
    if (role !== 'private_user' && role !== 'business_user') {
      return NextResponse.redirect(new URL('/auth/role-login', req.url))
    }
  }

  // --- Bedrift‑dashboard: kun business_user, og betal status hvis du vil --
  if (pathname.startsWith('/bedrift-dashboard')) {
    if (role !== 'business_user') {
      return NextResponse.redirect(new URL('/auth/role-login', req.url))
    }
    // Hvis du vil legge på faktura‑sjekk, kan du gjeninnføre den her:
    /*
    const { data: inv } = await supabase
      .from('invoices')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (inv && inv.status !== 'paid') {
      return NextResponse.redirect(new URL('/bedrift-dashboard/faktura', req.url))
    }
    */
  }

  return res
}

export const config = {
  matcher: [
    '/privat-dashboard/:path*',
    '/bedrift-dashboard/:path*',
  ],
}

