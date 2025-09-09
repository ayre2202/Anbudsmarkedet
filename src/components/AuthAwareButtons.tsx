'use client'
import { useState, useEffect } from 'react'
import supabase from '@/lib/supabase/client'
import { ArrowRight, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function AuthAwareButtons({ variant = 'primary' }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<'private_user' | 'business_user' | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      // Hent session og bruker
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setLoading(false)
        return setIsAuthenticated(false)
      }
      setIsAuthenticated(true)

      const { data: { user } } = await supabase.auth.getUser()
      setUserRole(user?.user_metadata?.role || null)
      setLoading(false)
    }
    checkAuth()
  }, [])

  if (loading) return null

  // Nav‑variant
  if (variant === 'nav') {
    if (isAuthenticated && userRole) {
      // Dynamisk lenke basert på rolle
      const href =
        userRole === 'business_user'
          ? '/bedrift-dashboard'
          : '/privat-dashboard'
      return (
        <Link
          href={href}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Gå til dashboard
        </Link>
      )
    } else {
      // Uten innlogging: Logg inn / Legg ut jobb
      return (
        <>
          <Link href="/auth/role-login" className="text-gray-600 hover:text-gray-900">
            Logg inn
          </Link>
          <Link
            href="/auth/role-login"
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors ml-4"
          >
            Legg ut jobb
          </Link>
        </>
      )
    }
  }

  // Hero‐variant (primær):
  return isAuthenticated ? (
    <Link
      href={userRole === 'business_user'
        ? '/bedrift-dashboard'
        : '/privat-dashboard'}
      className="inline-flex items-center px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
    >
      Go to Dashboard
      <ArrowRight className="ml-2 h-5 w-5" />
    </Link>
  ) : (
    <>
      <Link
        href="/auth/role-login"
        className="inline-flex items-center px-6 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
      >
        Legg ut jobb
        <ArrowRight className="ml-2 h-5 w-5" />
      </Link>
      <Link
        href="#features"
        className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors ml-4"
      >
        Lær mer
        <ChevronRight className="ml-2 h-5 w-5" />
      </Link>
    </>
  )
}
