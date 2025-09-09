'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '@/lib/supabase/client'

type AppUser = {
  id: string
  email: string
  name: string | null
  role: 'private' | 'business' | 'admin'
  created_at: string
  banned?: boolean | null
  business_access_revoked?: boolean | null
}

export const AuthContext = createContext<{ isAuthorized: boolean | null }>({ isAuthorized: null })

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkAdminAccess() {
      try {
        // Enkel auth-sjekk - kun én API-kall
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setIsAuthorized(false)
          router.replace('/admin/login')
          return
        }

        const response = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        })

        if (response.status === 401 || response.status === 403) {
          setIsAuthorized(false)
          router.replace('/admin/login')
          return
        }

        if (!response.ok) {
          console.error('Admin check failed:', response.status)
          setIsAuthorized(false)
          return
        }

        const responseData = await response.json()
        const users = responseData?.users

        if (!users || !Array.isArray(users)) {
          console.error('Invalid users data:', responseData)
          setIsAuthorized(false)
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsAuthorized(false)
          router.replace('/admin/login')
          return
        }

        const currentUser = users.find((u: AppUser) => u.id === user.id) as AppUser
        if (currentUser?.role === 'admin') {
          setIsAuthorized(true)
        } else {
          setIsAuthorized(false)
          router.replace('/admin/login')
        }
      } catch (error) {
        console.error('Error checking admin access:', error)
        setIsAuthorized(false)
        router.replace('/admin/login')
      }
    }

    checkAdminAccess()
  }, [router])

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0009e2] mx-auto mb-4"></div>
          <p className="text-gray-600">Sjekker tilgang...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0009e2] mx-auto mb-4"></div>
          <p className="text-gray-600">Omdirigerer til innlogging...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ isAuthorized }}>
      {children}
    </AuthContext.Provider>
  )
}