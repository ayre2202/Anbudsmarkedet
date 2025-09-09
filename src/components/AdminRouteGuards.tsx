'use client'

import { usePathname } from 'next/navigation'
import React from 'react'

/**
 * Viser children KUN når vi IKKE er på /admin-ruter.
 * Brukes til å skjule global Navbar inne i admin.
 */
export function HideOnAdmin({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null
  return <>{children}</>
}

/**
 * Legger til top-padding når global Navbar er synlig.
 * Inne i /admin fjernes padding for å unngå "tomt luftrom" på toppen.
 */
export function MainWithDynamicPadding({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hasGlobalNavbar = !(pathname?.startsWith('/admin'))
  return <main className={hasGlobalNavbar ? 'pt-16' : ''}>{children}</main>
}
