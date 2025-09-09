'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useContext } from 'react'
import { LogOut, Users, FileText, Receipt, Briefcase, Menu, X, MessageCircle, Scissors } from 'lucide-react'
import supabase from '@/lib/supabase/client'
import AdminGuard, { AuthContext } from '@/components/AdminGuard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isLoginPage = pathname === '/admin/login' || pathname.startsWith('/admin/login')

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: FileText },
    { name: 'Brukere', href: '/admin/users', icon: Users },
    { name: 'Jobber', href: '/admin/jobs', icon: Briefcase },
    { name: 'Meldinger', href: '/admin/messages', icon: MessageCircle },
    { name: 'Klipp', href: '/admin/clips', icon: Scissors },
    { name: 'Fakturering', href: '/admin/faktura', icon: Receipt },
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      await fetch('/api/auth/signout', { method: 'POST', cache: 'no-store' }).catch(() => {})
      document.cookie = 'am_admin_trust=; Max-Age=0; path=/;'
    } finally {
      window.location.assign('/admin/login')
    }
  }

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon
        const active = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => onNavigate?.()}
            className={`inline-flex items-center gap-3 px-5 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
              active ? 'bg-[#0009e2] text-white shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon size={18} />
            {item.name}
          </Link>
        )
      })}
    </>
  )

  const content = isLoginPage ? (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 lg:px-12 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/anbuds_logo.png"
              alt="Anbudsmarkedet"
              width={220}
              height={50}
              priority
              style={{ height: 'auto' }}
            />
          </Link>
        </div>
      </header>
      <main className="px-6 lg:px-12 py-10">{children}</main>
    </div>
  ) : (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-6 lg:px-12 h-20 flex items-center justify-between">
            <Link href="/admin" className="flex items-center">
              <Image
                src="/anbuds_logo.png"
                alt="Anbudsmarkedet"
                width={200}
                height={45}
                priority
                style={{ height: 'auto' }}
              />
            </Link>

            <AuthContext.Consumer>
              {({ isAuthorized }) =>
                isAuthorized && (
                  <>
                    <nav className="hidden md:flex items-center gap-2 flex-1 justify-center">
                      <NavLinks />
                    </nav>
                    <div className="hidden md:block">
                      <button
                        type="button"
                        className="inline-flex items-center gap-3 px-5 py-3 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-all duration-200 shadow-md"
                        onClick={handleLogout}
                      >
                        <LogOut size={18} />
                        Logg ut
                      </button>
                    </div>
                    <button
                      type="button"
                      className="md:hidden inline-flex items-center justify-center p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                      aria-label="Åpne meny"
                      aria-expanded={mobileOpen}
                      onClick={() => setMobileOpen((s) => !s)}
                    >
                      {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                  </>
                )
              }
            </AuthContext.Consumer>
          </div>

          <AuthContext.Consumer>
            {({ isAuthorized }) =>
              isAuthorized && mobileOpen && (
                <div className="md:hidden border-t border-gray-200 bg-gray-50">
                  <div className="px-6 py-4 flex flex-col gap-3">
                    <NavLinks onNavigate={() => setMobileOpen(false)} />
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center justify-center gap-3 px-5 py-3 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
                      onClick={handleLogout}
                    >
                      <LogOut size={18} />
                      Logg ut
                    </button>
                  </div>
                </div>
              )
            }
          </AuthContext.Consumer>
        </header>

        <main>{children}</main>
      </div>
    </AdminGuard>
  )

  return content
}