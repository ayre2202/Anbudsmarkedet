import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Ingen auth-sjekk i middleware - AdminGuard komponenter håndterer det
  // Dette eliminerer rate limiting problemer permanent
  
  const { pathname } = req.nextUrl

  // Kun håndter spesielle redirects eller headers om nødvendig
  // For eksempel:
  
  // Redirect gamle admin paths hvis nødvendig
  // if (pathname === '/admin/old-settings') {
  //   return NextResponse.redirect(new URL('/admin/faktura', req.url))
  // }

  // La alt passere gjennom - auth håndteres av AdminGuard komponenter
  return NextResponse.next()
}

export const config = {
  // Minimal matcher - kun hvis du trenger spesifikke redirects senere
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}