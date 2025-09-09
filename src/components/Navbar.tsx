'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { User } from 'lucide-react'
import supabase from '@/lib/supabase/client'
import Image from 'next/image'
import { useLoginModal } from '@/context/LoginModalContext'
import LoginModal from './LoginModal'
import ErrorBoundary from './ErrorBoundary'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<'business_user' | 'private_user' | null>(null)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [isMounted, setIsMounted] = useState(false)
  const [isHeroSection, setIsHeroSection] = useState(true)
  const [scrollProgress, setScrollProgress] = useState(0)
  const { showLoginModal, setShowLoginModal } = useLoginModal()

  const menuRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Ensure client-side mount
  useEffect(() => {
    setIsMounted(true)
    if (setShowLoginModal) {
      setShowLoginModal(false)
    }
  }, [setShowLoginModal])

  // Generate dynamic gradient - starts darkening at 14% (scroll 1-2 of 7)
  const generateDynamicGradient = useCallback((progress: number) => {
    // Hero colors: from-[#0009e2] via-[#0009e2] to-[#001960]
    const startColor = '#0009e2'  // Always same as hero start
    const midColor = '#0009e2'    // Always same as hero middle
    
    // Start darkening at 14% of scroll (scroll 1-2 of 7), complete at 100%
    // progress 0-0.14: stay light (#0009e2)
    // progress 0.14-1.0: gradually darken to #001960
    const darkeningStart = 0.14
    const delayedProgress = progress < darkeningStart 
      ? 0 
      : (progress - darkeningStart) / (1 - darkeningStart)
    
    // Interpolate between #0009e2 (light) and #001960 (dark)
    const startHex = 0x0009e2
    const endHex = 0x001960
    
    const r1 = (startHex >> 16) & 0xff
    const g1 = (startHex >> 8) & 0xff
    const b1 = startHex & 0xff
    
    const r2 = (endHex >> 16) & 0xff
    const g2 = (endHex >> 8) & 0xff
    const b2 = endHex & 0xff
    
    const r = Math.round(r1 + (r2 - r1) * delayedProgress)
    const g = Math.round(g1 + (g2 - g1) * delayedProgress)
    const b = Math.round(b1 + (b2 - b1) * delayedProgress)
    
    const endColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    
    return `linear-gradient(to bottom right, ${startColor}, ${midColor}, ${endColor})`
  }, [])

  // Handle scroll with precise hero tracking
  useEffect(() => {
    if (pathname !== '/') {
      setIsHeroSection(false)
      setScrollProgress(0)
      return
    }

    const handleScroll = () => {
      requestAnimationFrame(() => {
        const heroSection = document.querySelector('.hero-section') as HTMLElement
        const navbar = navRef.current
        
        if (heroSection && navbar) {
          const heroRect = heroSection.getBoundingClientRect()
          const heroBottom = heroRect.bottom
          const heroHeight = heroRect.height
          const navbarHeight = navbar.offsetHeight
          const currentScrollY = window.scrollY
          
          // Calculate progress through the hero section
          // When user scrolls from top to bottom of hero, progress goes from 0 to 1
          const heroProgress = Math.max(0, Math.min(1, currentScrollY / heroHeight))
          setScrollProgress(heroProgress)
          
          // Switch to white when hero is out of viewport
          const shouldSwitchToWhite = heroBottom <= navbarHeight
          
          if (shouldSwitchToWhite) {
            navbar.style.background = 'white'
            navbar.style.borderBottom = '1px solid rgb(243 244 246)'
            navbar.classList.add('navbar-out-of-hero')
            setIsHeroSection(false)
          } else {
            const dynamicGradient = generateDynamicGradient(heroProgress)
            navbar.style.background = dynamicGradient
            navbar.style.borderBottom = 'none'
            navbar.classList.remove('navbar-out-of-hero')
            setIsHeroSection(true)
          }
        }
      })
    }
    
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [pathname, generateDynamicGradient])

  // Reset showLoginModal on route change
  useEffect(() => {
    if (setShowLoginModal) {
      setShowLoginModal(false)
    }
  }, [pathname, setShowLoginModal])

  const getInitials = (name: string) => {
    if (!name) return ''
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  useEffect(() => {
    if (!supabase) return
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setIsAuthenticated(!!session)
        setLogoutLoading(false)

        if (session) {
          setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '')
          const userId = session.user.id
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('user_id', userId)
            .single()
          if (!error && profile) {
            setUserRole(profile.role)
          } else {
            setUserRole(null)
          }
        } else {
          setUserName('')
          setUserRole(null)
        }

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          setIsAuthenticated(!!session)
          setLogoutLoading(false)
          setLogoutError(null)
          if (session) {
            setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '')
            const userId = session.user.id
            const { data: profile, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('user_id', userId)
              .single()
            if (!error && profile) {
              setUserRole(profile.role)
            } else {
              setUserRole(null)
            }
          } else {
            setUserName('')
            setUserRole(null)
          }
        })

        return () => {
          authListener.subscription.unsubscribe()
        }
      } catch {
        setIsAuthenticated(false)
        setUserName('')
        setUserRole(null)
        setLogoutLoading(false)
        setLogoutError(null)
      }
    })()
  }, [])

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const toggleDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setOpen((prev) => !prev)
  }, [])

  const navigate = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  const handleLogout = async () => {
    setLogoutLoading(true)
    setLogoutError(null)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        setLogoutError(error.message)
        setLogoutLoading(false)
        return
      }
      setIsAuthenticated(false)
      setUserName('')
      setUserRole(null)
      setOpen(false)
      setLogoutLoading(false)
      router.push('/')
    } catch {
      setLogoutError('En feil oppstod ved utlogging.')
      setLogoutLoading(false)
    }
  }

  const openLoginModal = () => {
    setOpen(false)
    if (setShowLoginModal) {
      setShowLoginModal(true)
    }
  }

  const closeLoginModal = () => {
    if (setShowLoginModal) {
      setShowLoginModal(false)
    }
  }

  const handleUngClick = () => {
    // Do nothing - coming soon feature
  }

  // Hide navbar on admin routes - moved after all hooks
  if (pathname.startsWith('/admin')) {
    return null
  }

  if (!isMounted) {
    return null
  }

  const isHeroState = pathname === '/' && isHeroSection

  return (
    <ErrorBoundary>
      <style jsx>{`
        .navbar-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0.1;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 1;
        }
      `}</style>
      
      <nav 
        ref={navRef}
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-150 ${
          pathname !== '/' ? 'bg-white border-b border-gray-100' : ''
        }`}
        style={{
          background: pathname === '/' 
            ? (isHeroState 
                ? generateDynamicGradient(scrollProgress)
                : 'white')
            : undefined,
          borderBottom: pathname === '/' 
            ? (isHeroState ? 'none' : '1px solid rgb(243 244 246)')
            : undefined
        }}
      >
        {isHeroState && <div className="navbar-grid"></div>}
        
        <div className="w-full flex h-16 items-center justify-between px-4 lg:px-8 relative z-10">
          <Link href="/" onClick={() => setOpen(false)} className="flex-shrink-0 flex items-center">
            <Image
              src={isHeroState ? "/gul-logo-ny.png" : "/anbuds_logo.png"}
              alt="Anbudsmarkedet Logo"
              width={isHeroState ? 173 : 150}
              height={isHeroState ? 48 : 42}
              className={isHeroState ? "h-[48px] w-auto max-h-[48px] transition-all duration-300" : "h-[42px] w-auto max-h-[42px] transition-all duration-300"}
              style={{
                imageRendering: 'auto',
                objectFit: 'contain'
              }}
              draggable={false}
            />
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/privat-dashboard/new-job')}
              className="bg-[#fbbf24] hover:bg-[#f59e0b] text-gray-900 px-4 py-2 rounded-md text-sm font-medium transition hidden md:block"
            >
              Legg ut jobb
            </button>
            <button
              onClick={() => navigate('/registrer-bedrift')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition hidden md:block ${
                isHeroState
                  ? 'bg-transparent text-white hover:bg-white/10 border border-white'
                  : 'bg-[#0009e2] text-white hover:bg-[#0007b8] border-transparent'
              }`}
            >
              Registrer bedrift
            </button>
            {isAuthenticated &&
              userRole &&
              pathname !== '/privat-dashboard' &&
              pathname !== '/bedrift-dashboard' && (
                <button
                  onClick={() => {
                    if (userRole === 'business_user') {
                      navigate('/bedrift-dashboard')
                    } else {
                      navigate('/privat-dashboard')
                    }
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition hidden md:block ${
                    isHeroState
                      ? 'bg-transparent text-white hover:bg-white/10 border border-white'
                      : 'bg-[#0009e2] text-white hover:bg-[#0007b8] border-transparent'
                  }`}
                >
                  Min side
                </button>
              )}

            <div className="relative" ref={menuRef}>
              <button
                onClick={toggleDropdown}
                className={`flex items-center justify-center rounded-full ring-2 transition w-8 h-8 select-none font-semibold uppercase ${
                  isAuthenticated && userName
                    ? isHeroState
                      ? 'text-white bg-white/20 ring-white/30 hover:ring-white'
                      : 'text-[#fbbf24] bg-[#0009e2] ring-gray-300 hover:ring-[#0009e2]'
                    : isHeroState
                    ? 'text-white bg-white/20 ring-white/30 hover:ring-white'
                    : 'text-gray-700 bg-white ring-gray-300 hover:ring-[#0009e2]'
                }`}
                title={userName || 'Bruker'}
              >
                {isAuthenticated && userName
                  ? getInitials(userName)
                  : <User size={24} className={isHeroState ? 'text-white' : 'text-gray-700'} />
                }
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-3 w-64 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden z-50 backdrop-blur-sm">
                  <div className="py-2">
                    {!isAuthenticated && (
                      <>
                        <button
                          onClick={openLoginModal}
                          className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-[#0009e2] transition-all duration-150"
                        >
                          Logg inn
                        </button>
                        <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-[#0009e2]/20 to-transparent" />
                      </>
                    )}
                    <button
                      onClick={() => navigate('/registrer-bedrift')}
                      className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-[#0009e2] transition-all duration-150"
                    >
                      Registrer bedrift
                    </button>
                    <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-[#0009e2]/20 to-transparent" />
                    <button
                      onClick={() => navigate('/privat-dashboard/new-job')}
                      className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-[#0009e2] transition-all duration-150"
                    >
                      Legg ut jobb
                    </button>
                    <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-[#0009e2]/20 to-transparent" />
                    <button
                      onClick={() => navigate('/faq')}
                      className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-[#0009e2] transition-all duration-150"
                    >
                      Ofte stilte spørsmål
                    </button>
                    <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-[#0009e2]/20 to-transparent" />
                    <button
                      onClick={() => navigate('/kontakt-oss')}
                      className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-[#0009e2] transition-all duration-150"
                    >
                      Kontakt oss
                    </button>
                    <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-[#0009e2]/20 to-transparent" />
                    <button
                      onClick={() => navigate('/om-oss')}
                      className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-[#0009e2] transition-all duration-150"
                    >
                      Om oss
                    </button>
                    <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-[#0009e2]/20 to-transparent" />
                    <div className="relative">
                      <button
                        onClick={handleUngClick}
                        className="block w-full text-left px-5 py-3 text-sm font-medium text-gray-800 hover:bg-blue-50 hover:text-[#0009e2] transition-all duration-150"
                      >
                        <div className="flex flex-col">
                          <span>Anbudsmarkedet UNG</span>
                          <span className="text-xs text-[#0009e2] font-medium mt-1 opacity-75">Kommer snart</span>
                        </div>
                      </button>
                    </div>
                    {isAuthenticated && (
                      <>
                        <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-red-300/30 to-transparent" />
                        <button
                          onClick={handleLogout}
                          className={`block w-full text-left px-5 py-3 text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-150 ${logoutLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={logoutLoading}
                        >
                          {logoutLoading ? 'Logger ut...' : 'Logg ut'}
                        </button>
                        {logoutError && <p className="text-red-500 text-xs px-5 py-1">{logoutError}</p>}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      {isMounted && showLoginModal && (
        <ErrorBoundary>
          <LoginModal onClose={closeLoginModal} />
        </ErrorBoundary>
      )}
    </ErrorBoundary>
  )
}