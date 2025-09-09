'use client'

import React, { useState, useEffect, Fragment, useRef } from 'react'
import supabase from '@/lib/supabase/client'
import { FileText, Users, CheckCircle, ThumbsUp, Shield, Star, Clock, Phone, MessageCircle, TrendingUp, Hammer, PaintRoller, Wrench, Zap, Leaf, Truck, Car, Ruler, Building, UserCheck, Droplets, Target, Settings } from 'lucide-react'
import LottiePlayer from '@/components/LottiePlayer'
import Link from 'next/link'
import { FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa'

interface Category {
  name: string
}

export default function Home() {
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [searchValue, setSearchValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isClient, setIsClient] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const mainCategories = [
    { name: 'Håndverker', icon: Hammer },
    { name: 'Transport', icon: Truck },
    { name: 'Renhold', icon: Droplets },
    { name: 'Bilverksted', icon: Car },
    { name: 'Oppussing Bad', icon: Wrench },
    { name: 'UNG', icon: UserCheck, isComingSoon: true }
  ]

  const floatingCategories = [
    { name: 'Håndverker', icon: Hammer, color: 'from-[#0009e2] to-[#001960]', angle: 0 },
    { name: 'Elektriker', icon: Zap, color: 'from-[#001960] to-[#0009e2]', angle: 45 },
    { name: 'Maler', icon: PaintRoller, color: 'from-[#0009e2] to-[#001960]', angle: 90 },
    { name: 'Rørlegger', icon: Settings, color: 'from-[#001960] to-[#0009e2]', angle: 135 },
    { name: 'Transport', icon: Truck, color: 'from-[#0009e2] to-[#001960]', angle: 180 },
    { name: 'Snekker', icon: Ruler, color: 'from-[#001960] to-[#0009e2]', angle: 225 },
    { name: 'Renhold', icon: Droplets, color: 'from-[#0009e2] to-[#001960]', angle: 270 },
    { name: 'Hagearbeid', icon: Leaf, color: 'from-[#001960] to-[#0009e2]', angle: 315 }
  ]

  const norwegianPublicAgencies = [
    'brønnøysundregistrene', 'skatteetaten', 'arbeidstilsynet', 'altinn',
    'nav', 'plan- og bygningsetaten', 'mattilsynet', 'dsb'
  ]

  const getCirclePosition = (angle: number, radius: number) => {
    if (!isClient) return { x: 0, y: 0 }
    const radian = (angle * Math.PI) / 180
    return {
      x: Math.cos(radian) * radius,
      y: Math.sin(radian) * radius
    }
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setAllCategories([])
        return
      }

      const { data: cats, error } = await supabase
        .from('categories')
        .select('name')
        .order('name', { ascending: true })

      if (error) {
        setAllCategories([])
      } else if (cats && cats.length > 0) {
        setAllCategories(cats)
      } else {
        setAllCategories([])
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    const hint = 'Fant du ikke det du lette etter? Se alle kategorier her.'
    if (searchValue) {
      const filteredCategories = allCategories
        .map(c => c.name)
        .filter((c) => c && c.toLowerCase().includes(searchValue.toLowerCase()))

      setSuggestions(filteredCategories.length > 0 ? [...filteredCategories.slice(0, 4), hint] : [hint])
    } else {
      setSuggestions([])
    }
  }, [searchValue, allCategories])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const observerOptions = {
      threshold: [0, 0.2],
      rootMargin: '0px 0px -20% 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement
        
        if (element.classList.contains('reveal-up')) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            element.style.opacity = '1'
            element.style.transform = 'translateY(0px)'
          }
        }
      })
    }, observerOptions)

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-up')
      elements.forEach(el => observer.observe(el))
    }, 100)

    return () => observer.disconnect()
  }, [isClient])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchValue(e.target.value)

  const handleSuggestionClick = (s: string) => {
    if (s.includes('Fant du ikke')) {
      window.location.href = '/alle-kategorier'
    } else {
      window.location.href = `/privat-dashboard/new-job?category=${encodeURIComponent(s)}`
    }
  }

  const handleGetOffers = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedSearchValue = searchValue.trim()
    const matchedCategory = allCategories.find(
      (c) => c.name.toLowerCase() === trimmedSearchValue.toLowerCase()
    )
    if (matchedCategory) {
      window.location.href = `/privat-dashboard/new-job?category=${encodeURIComponent(
        matchedCategory.name
      )}`
    } else {
      window.location.href = '/privat-dashboard/new-job'
    }
  }

  const handleCategoryClick = (category: any) => {
    if (category.name === 'UNG' && category.isComingSoon) {
      return
    } else {
      window.location.href = `/privat-dashboard/new-job?main_category=${encodeURIComponent(category.name)}`
    }
  }

  const testimonials = [
    {
      id: 1,
      name: "Kari K.",
      company: "Privatkunde",
      text: "Skulle skifte kjøkkenbenkeplaten og tenkte det ville bli kjempedyrt. Fikk 4 tilbud på under 2 timer, og til min store overraskelse var prisene helt OK! Valgte en lokal snekker som gjorde en fantastisk jobb.",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face&auto=format"
    },
    {
      id: 2,
      name: "Lars E.",
      company: "Bergensfjord Elektro", 
      text: "Brukte tidligere en annen plattform og ble lei av alle de uklare avgiftene. Her er alt mye mer ryddig og transparent. Får faktisk jobber fra seriøse kunder, og systemet fungerer akkurat som det skal.",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format"
    },
    {
      id: 3,
      name: "Anne M.",
      company: "Privatkunde",
      text: "Badet vårt var helt forferdelig etter vannlekkasje. Følte meg helt lost, men her fikk jeg hjelp med å finne både rørlegger OG flislegger. Begge kom anbefalt og gjorde skikkelig bra jobb.",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format"
    }
  ]

  return (
    <Fragment>
      <style jsx>{`
        .reveal-up {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }
        
        .grid-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0.096;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px);
          background-size: 40px 40px;
          z-index: 1;
        }
        
        .grid-background::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.6), transparent);
          z-index: 2;
        }
        
        .grid-background::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 2px;
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.6), transparent);
          z-index: 2;
        }
        
        .logo-carousel {
          display: flex;
          animation: scroll-horizontal 100s linear infinite;
          white-space: nowrap;
          width: calc(200% + 8rem);
        }
        
        .logo-carousel:hover {
          animation-play-state: paused;
        }
        
        @keyframes scroll-horizontal {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-50% - 4rem)); }
        }
        
        .logo-item {
          flex-shrink: 0;
          margin-right: 4rem;
          color: #fbbf24 !important;
          display: inline-block;
        }
        
        .logo-item:hover {
          color: #f59e0b !important;
        }
        
        .orbit-container {
          position: relative;
          width: 400px;
          height: 400px;
          transition: all 0.3s ease;
          z-index: 10;
        }
        
        .hero-section:hover .orbit-card {
          animation-play-state: paused;
        }
        
        .orbit-container::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 140px;
          height: 140px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
        }
        
        .orbit-container::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 180px;
          height: 180px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
        }
        
        .orbit-circles {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
        }
        
        .orbit-circles::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 220px;
          height: 220px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
        
        .orbit-circles::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 260px;
          height: 260px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }
        
        .orbit-card {
          position: absolute;
          z-index: 2;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          animation: gentle-float 5s ease-in-out infinite;
        }
        
        @keyframes gentle-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
        
        .orbit-card:nth-child(1) { animation-delay: 0s; }
        .orbit-card:nth-child(2) { animation-delay: 0.4s; }
        .orbit-card:nth-child(3) { animation-delay: 0.8s; }
        .orbit-card:nth-child(4) { animation-delay: 1.2s; }
        .orbit-card:nth-child(5) { animation-delay: 1.6s; }
        .orbit-card:nth-child(6) { animation-delay: 2.0s; }
        .orbit-card:nth-child(7) { animation-delay: 2.4s; }
        .orbit-card:nth-child(8) { animation-delay: 2.8s; }
        
        .orbit-card:hover {
          transform: scale(1.1) translateY(0px) !important;
          animation-play-state: paused;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 8px 20px rgba(255, 255, 255, 0.2);
          z-index: 100;
        }
        
        .enhanced-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .enhanced-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 9, 226, 0.15);
        }
        
        .center-card {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
        }
        
        .crisp-card {
          backface-visibility: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
          transform: translateZ(0);
        }

        .category-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .category-hover:hover {
          transform: translateY(-8px) scale(1.05);
          box-shadow: 0 20px 40px rgba(0, 9, 226, 0.15);
        }

        .hero-parallax {
          transition: transform 0.1s ease-out;
        }
      `}</style>
      
      <div>
        {/* HERO */}
        <section className="hero-section relative pt-16 pb-24 sm:pb-32 flex-grow w-full overflow-hidden bg-gradient-to-br from-[#0009e2] via-[#0009e2] to-[#001960] min-h-screen flex items-center">
          <div className="grid-background"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
              <div className="flex justify-center lg:justify-start order-2 lg:order-1">
                <div className="relative w-full max-w-lg">
                  <div className="orbit-container mx-auto">
                    <div className="orbit-circles"></div>
                    
                    {floatingCategories.map((category, index) => {
                      const IconComponent = category.icon
                      const radius = 180
                      const position = getCirclePosition(category.angle, radius)
                      
                      return (
                        <div
                          key={index}
                          className="orbit-card cursor-pointer"
                          style={{
                            left: `calc(50% + ${position.x}px - 32px)`,
                            top: `calc(50% + ${position.y}px - 32px)`
                          }}
                          onClick={() => handleCategoryClick(category)}
                        >
                          <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-xl shadow-2xl flex items-center justify-center border-2 border-white border-opacity-60`}>
                            <IconComponent className="w-6 h-6 text-yellow-400" strokeWidth={2} />
                          </div>
                          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                            <span className="text-white text-xs font-semibold px-2 py-1 rounded-full">
                              {category.name}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    
                    <div className="center-card">
                      <div className="w-24 h-24 bg-gradient-to-br from-[#0009e2] to-[#001960] rounded-2xl shadow-2xl flex flex-col items-center justify-center border-2 border-white border-opacity-60">
                        <CheckCircle className="w-7 h-7 text-yellow-400 mb-1" strokeWidth={2.5} />
                        <span className="text-xs font-semibold text-white">Garantert</span>
                        <span className="text-xs font-semibold text-blue-200">Kvalitet</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center lg:text-left order-1 lg:order-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-6 text-white leading-relaxed">
                  <span className="block mb-2">Legg ut jobben</span>
                  <span className="block text-yellow-400">på få sekunder</span>
                </h1>
                <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-xl">
                  Norges mest effektive anbudsplattform som matcher deg med kvalitetssikrede fagfolk i ditt område. Sammenlign tilbud, spar tid og få jobben gjort riktig første gang.
                </p>

                <div className="mb-8">
                  <Link 
                    href="/privat-dashboard/new-job"
                    className="inline-flex items-center gap-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl"
                  >
                    Legg ut prosjekt nå
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-6 text-left mb-8 max-w-md">
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">24/7</div>
                    <div className="text-sm text-blue-200">Rask respons</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">2,800+</div>
                    <div className="text-sm text-blue-200">Leverandører</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-400">4.9/5</div>
                    <div className="text-sm text-blue-200">Vurdering</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-20 text-center">
              <p className="text-blue-100 text-lg mb-6 uppercase tracking-wide">Skapt for det norske markedet</p>
              <div className="overflow-hidden">
                <div className="logo-carousel">
                  {[...norwegianPublicAgencies, ...norwegianPublicAgencies, ...norwegianPublicAgencies].map((agency, index) => (
                    <div key={index} className="logo-item font-semibold text-lg transform transition-all duration-300 hover:scale-110">
                      {agency}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRANSITION SPACER */}
        <div className="h-12" style={{ backgroundColor: '#faf6f5' }}></div>
        <div className="h-48" style={{ backgroundColor: '#faf6f5' }}></div>

        {/* ANDRE HERO SEKSJON */}
        <section className="relative py-6 pb-64 w-full overflow-hidden" style={{ backgroundColor: '#faf6f5' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-32 lg:gap-48 items-center">
              <div className="text-center lg:text-left">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
                  Norges Fremste
                  <span className="block text-[#0009e2]">Anbudsmarked</span>
                </h2>
                <p className="text-lg sm:text-xl text-gray-600 mb-8">
                  Fra kjøkken til bad, fra hage til hytte - finn riktig fagfolk som utgjør stor nytte. Vi matcher deg automatisk med de mest relevante fagfolkene i ditt geografiske område.
                </p>

                <div className="mb-8">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {mainCategories.map((category, index) => {
                      const IconComponent = category.icon
                      return (
                        <button
                          key={index}
                          onClick={() => handleCategoryClick(category)}
                          className={`category-hover group bg-white border border-gray-200 rounded-xl px-4 py-5 transition-all duration-200 flex items-center gap-3 relative ${
                            category.isComingSoon 
                              ? 'hover:border-[#0009e2] hover:shadow-md cursor-pointer' 
                              : 'hover:border-[#0009e2] hover:shadow-md'
                          }`}
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#0009e2]/10 flex items-center justify-center group-hover:bg-[#0009e2]/20 transition-colors">
                            <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-[#0009e2]" strokeWidth={1.5} />
                          </div>
                          <span className="font-medium text-gray-900 text-sm sm:text-base">
                            {category.name}
                          </span>
                          {category.isComingSoon && (
                            <div className="absolute -top-2 -right-2 bg-amber-400 text-gray-900 text-xs px-2 py-1 rounded-full whitespace-nowrap font-semibold">
                              Kommer snart
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <form onSubmit={handleGetOffers} className="flex justify-center lg:justify-start">
                  <div className="relative w-full max-w-xl" ref={wrapperRef}>
                    <input
                      type="text"
                      value={searchValue}
                      onChange={handleSearchChange}
                      placeholder="Eller søk etter hva du trenger..."
                      className="w-full px-5 py-4 pr-14 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-[#0009e2] shadow-sm text-base"
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-3 bg-[#0009e2] text-white rounded-lg hover:bg-[#0007b8] transition-colors"
                      aria-label="Submit search"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </button>
                    {suggestions.length > 0 && (
                      <ul className="absolute z-10 w-full bg-white border border-gray-300 mt-1 rounded-md shadow-lg text-left">
                        {suggestions.map((s) => (
                          <li
                            key={s}
                            onClick={() => handleSuggestionClick(s)}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm"
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </form>
              </div>

              <div className="flex justify-center lg:justify-end">
                <div className="w-full max-w-lg hero-parallax">
                  <LottiePlayer src="/lottie/forside.json" className="w-full transform scale-125" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SÅNN FUNGERER DET */}
        <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-20 pb-32 mt-20">
          <div className="flex flex-col gap-y-16 md:gap-y-20">
            <div className="text-center mx-auto max-w-3xl">
              <h2 className="text-3xl font-bold text-[#0009e2]">
                Slik fungerer Anbudsmarkedet
              </h2>
              <p className="mb-[0.7em] leading-[1.4] text-lg text-gray-600 mt-5 md:mt-7">
                Vi gjør det raskt og enkelt å koble deg med dyktige fagfolk for jobben din.
              </p>
            </div>
            <div className="overflow-hidden rounded-md">
              <div className="grid -ml-1 -mt-1 md:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    icon: FileText,
                    title: "Legg ut jobben",
                    description: "Beskriv jobben din på plattformen vår. Det tar bare noen minutter å opprette et oppdrag."
                  },
                  {
                    icon: Users,
                    title: "Motta tilbud",
                    description: "Dyktige fagfolk sender deg tilbud basert på dine behov og krav."
                  },
                  {
                    icon: CheckCircle,
                    title: "Velg det beste tilbudet",
                    description: "Sammenlign tilbud og velg det som passer best for deg basert på pris og kvalitet."
                  },
                  {
                    icon: ThumbsUp,
                    title: "Få jobben gjort",
                    description: "Fagfolkene utfører jobben, og du får resultatet du ønsker, raskt og effektivt."
                  }
                ].map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div key={index} className="reveal-up enhanced-hover relative flex flex-col gap-y-2.5 md:gap-y-3 pt-12 px-8 pb-8 md:px-10 md:pb-12 lg:pb-14 bg-white border-l-[3px] border-t-[3px] border-[#0009e2] group cursor-pointer overflow-hidden">
                      {index < 3 && (
                        <span className="md:after:left:0 absolute left-6 top-full z-10 h-0 w-0 border-[14px] border-b-0 border-transparent after:absolute after:top-0 after:h-0 after:w-0 after:-translate-x-1/2 after:translate-y-[-20px] after:border-[16px] after:border-b-0 after:border-transparent md:left-full md:top-9 md:border-[16px] md:border-r-0 md:border-t-transparent md:after:-translate-y-1/2 md:after:translate-x-[-20px] md:after:border-[16px] md:after:border-r-0 md:after:border-t-transparent lg:top-10 border-t-[#0009e2] md:border-l-[#0009e2] after:border-t-white md:after:border-l-white"></span>
                      )}
                      
                      <div className="relative z-10 transition-all duration-500 ease-out group-hover:translate-y-[-4px]">
                        <div className="-mb-0.5 flex items-center gap-x-2 md:gap-x-3">
                          <div className="shrink-0 text-xl md:text-2xl -mt-1 md:-mt-1.5 transition-all duration-500 ease-out group-hover:scale-125 group-hover:text-amber-500 group-hover:rotate-12">
                            <Icon className="h-[1em] w-[1em] text-amber-500" aria-hidden="true" />
                          </div>
                          <span className="font-display text-3xl font-semibold md:text-4xl transition-all duration-500 ease-out group-hover:text-[#0009e2] group-hover:scale-110">{index + 1}</span>
                        </div>
                        <h3 className="text-lg font-semibold transition-all duration-500 ease-out group-hover:text-[#0009e2] group-hover:font-bold mb-3">{step.title}</h3>
                        <p className="text-sm text-gray-600 mb-[0.7em] leading-[1.4] transition-all duration-500 ease-out group-hover:text-gray-700">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* PLATTFORMENS FUNKSJONER */}
        <section className="py-36 mt-24" style={{ backgroundColor: '#faf6f5' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 reveal-up">
              <h2 className="text-3xl font-bold text-[#0009e2] mb-6">
                Bygget for effektivitet
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Moderne funksjoner som gjør det enkelt å finne riktig fagfolk
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Clock, title: "Sanntids-varsling", desc: "Få øyeblikkelig beskjed når fagfolk sender tilbud på prosjektet ditt." },
                { icon: Target, title: "Smart filtrering", desc: "Automatisk matching basert på lokasjon, kompetanse og tilgjengelighet." },
                { icon: Shield, title: "Verifiserte fagfolk", desc: "Alle leverandører er kvalitetssikret og verifisert gjennom Brønnøysund." },
                { icon: Phone, title: "Mobil-optimert", desc: "Full funksjonalitet på mobil - legg ut jobber og motta tilbud hvor som helst." },
                { icon: Star, title: "Vurderingssystem", desc: "Transparent rating-system som sikrer kvalitet og byggere tillit." },
                { icon: MessageCircle, title: "Døgnåpen support", desc: "Vårt supportteam er tilgjengelig for å hjelpe deg gjennom hele prosessen." }
              ].map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div key={index} className="crisp-card reveal-up enhanced-hover bg-white rounded-xl p-6 shadow-sm border border-gray-100 group">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-[#0009e2]/10 rounded-lg flex items-center justify-center group-hover:bg-amber-400/20 transition-colors">
                        <Icon className="w-5 h-5 text-[#0009e2] group-hover:text-amber-600 transition-colors" />
                      </div>
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm">{feature.desc}</p>
                  </div>
                )
              })}
            </div>

            <div className="mt-16 crisp-card reveal-up bg-white rounded-xl p-8 shadow-sm border border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-amber-500 mb-1">24t</div>
                  <div className="text-sm text-gray-600">Rask respons</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-500 mb-1">2,800+</div>
                  <div className="text-sm text-gray-600">Aktive leverandører</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-500 mb-1">15,000+</div>
                  <div className="text-sm text-gray-600">Fullførte prosjekt</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-500 mb-1">4.9/5</div>
                  <div className="text-sm text-gray-600">Kundetilfredshet</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="pt-20 pb-32 bg-white mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 reveal-up">
              <h2 className="text-3xl font-bold text-[#0009e2] mb-6">
                Hva våre kunder sier
              </h2>
              <p className="text-xl text-gray-600">
                Daglig hjelper vi tusenvis av nordmenn med å finne riktig fagfolk
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-10">
              {testimonials.map(testimonial => (
                <div key={testimonial.id} className="reveal-up enhanced-hover bg-white p-8 rounded-lg shadow-sm border-l-4 border-amber-400 flex flex-col h-full">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-amber-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic text-base leading-relaxed flex-grow">"{testimonial.text}"</p>
                  <div className="flex items-center mt-auto">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="ml-4">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{testimonial.name}</p>
                        <div className="flex items-center justify-center w-5 h-5 bg-amber-500 rounded-full">
                          <CheckCircle className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{testimonial.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center mt-12 reveal-up">
              <Link 
                href="/privat-dashboard/new-job"
                className="enhanced-hover bg-amber-400 hover:bg-amber-500 text-gray-900 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 inline-flex items-center gap-2 mr-3"
              >
                Legg ut ditt prosjekt
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link 
                href="/registrer-bedrift"
                className="enhanced-hover border border-[#0009e2] text-[#0009e2] hover:bg-[#0009e2] hover:text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-300"
              >
                Bli en av våre fagfolk
              </Link>
            </div>
          </div>
        </section>

        {/* SMARTE FUNKSJONER */}
        <section className="py-36 mt-24" style={{ backgroundColor: '#faf6f5' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 reveal-up">
              <h2 className="text-3xl font-bold text-[#0009e2] mb-6">
                Smartere måte å samarbeide på
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Funksjoner som gjør prosessen enklere for både kunder og leverandører
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 mb-16">
              <div className="crisp-card reveal-up enhanced-hover bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-[#0009e2]/10 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#0009e2]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">For kunder</h3>
                    <p className="text-gray-600 text-sm">Spar tid og få bedre resultater</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Flere tilbud, raskt</h4>
                      <p className="text-gray-600 text-sm">Få tilbud fra flere fagfolk på minutter og sammenlign enkelt.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Kvalitetsgaranti</h4>
                      <p className="text-gray-600 text-sm">Kun verifiserte og kvalifiserte leverandører med gode vurderinger.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Trygg prosess</h4>
                      <p className="text-gray-600 text-sm">Transparent kommunikasjon og sikker håndtering av hele prosjektet.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="crisp-card reveal-up enhanced-hover bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Building className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">For leverandører</h3>
                    <p className="text-gray-600 text-sm">Få flere oppdrag, mindre jobb</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Automatisk matching</h4>
                      <p className="text-gray-600 text-sm">Få relevante prosjekter som passer din kompetanse og lokasjon.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Enkel administrasjon</h4>
                      <p className="text-gray-600 text-sm">Profesjonelt dashboard for oppfølging av alle dine prosjekter.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Bygg omdømme</h4>
                      <p className="text-gray-600 text-sm">Vurderingssystem som hjelper deg å bygge tillit og få flere kunder.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="crisp-card reveal-up enhanced-hover bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200">
              <div className="text-center mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Resultater som teller</h3>
                <p className="text-gray-600">Dokumenterte forbedringer for alle våre brukere</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div className="crisp-card bg-white rounded-xl p-4 shadow-sm enhanced-hover">
                  <div className="text-2xl font-bold text-amber-500 mb-1">32%</div>
                  <div className="text-sm text-gray-600">Lavere kostnader</div>
                </div>
                <div className="crisp-card bg-white rounded-xl p-4 shadow-sm enhanced-hover">
                  <div className="text-2xl font-bold text-amber-500 mb-1">5x</div>
                  <div className="text-sm text-gray-600">Raskere prosess</div>
                </div>
                <div className="crisp-card bg-white rounded-xl p-4 shadow-sm enhanced-hover">
                  <div className="text-2xl font-bold text-amber-500 mb-1">98%</div>
                  <div className="text-sm text-gray-600">Vellykket matching</div>
                </div>
                <div className="crisp-card bg-white rounded-xl p-4 shadow-sm enhanced-hover">
                  <div className="text-2xl font-bold text-amber-500 mb-1">24/7</div>
                  <div className="text-sm text-gray-600">Support tilgjengelig</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KONTAKT */}
        <section className="pt-20 pb-32 bg-white mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 reveal-up">
              <h2 className="text-3xl font-bold text-[#0009e2] mb-6">
                Trenger du hjelp eller har spørsmål?
              </h2>
              <p className="text-xl text-gray-600">
                Vårt kundeserviceteam er klare til å hjelpe deg
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto">
              <div className="crisp-card reveal-up enhanced-hover text-center bg-[#faf6f5] p-8 rounded-lg shadow-sm border-t-4 border-[#0009e2]">
                <Phone className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-3">Ring oss</h3>
                <p className="text-[#0009e2] font-semibold">22 08 60 00</p>
                <p className="text-sm text-gray-600 mt-2">Mandag - Fredag: 08:00 - 16:00</p>
              </div>
              <div className="crisp-card reveal-up enhanced-hover text-center bg-[#faf6f5] p-8 rounded-lg shadow-sm border-t-4 border-[#0009e2]">
                <MessageCircle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-3">Send e-post</h3>
                <p className="text-[#0009e2] font-semibold">post@anbudsmarkedet.no</p>
                <p className="text-sm text-gray-600 mt-2">Svarer innen 24 timer</p>
              </div>
              <div className="crisp-card reveal-up enhanced-hover text-center bg-[#faf6f5] p-8 rounded-lg shadow-sm border-t-4 border-[#0009e2]">
                <TrendingUp className="w-8 h-8 text-amber-500 mx-auto mb-4" />
                <h3 className="font-semibold mb-3">Kom i gang</h3>
                <p className="text-[#0009e2] font-semibold">Gratis registrering</p>
                <p className="text-sm text-gray-600 mt-2">Opprett konto og få tilgang til relevante oppdrag</p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-gradient-to-r from-[#001540] to-[#002650] border-t border-gray-600 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div className="col-span-2 md:col-span-1">
                <h3 className="text-white font-bold text-lg mb-4">Anbudsmarkedet AS</h3>
                <p className="text-gray-200 text-sm leading-relaxed mb-4">
                  Norges tryggeste anbudsplattform som kobler sammen kunder med verifiserte fagfolk.
                </p>
                <p className="text-gray-300 text-sm">
                  Org.nr: <span className="font-medium text-white">931 863 010</span>
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-4">Sider</h3>
                <ul className="space-y-2">
                  <li><Link href="/om-oss" className="text-gray-200 hover:text-white text-sm transition-colors">Om oss</Link></li>
                  <li><Link href="/kontakt-oss" className="text-gray-200 hover:text-white text-sm transition-colors">Kontakt oss</Link></li>
                  <li><Link href="/priser" className="text-gray-200 hover:text-white text-sm transition-colors">Priser</Link></li>
                  <li><Link href="/hjelp" className="text-gray-200 hover:text-white text-sm transition-colors">Hjelp & Support</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-4">For bedrifter</h3>
                <ul className="space-y-2">
                  <li><Link href="/registrer-bedrift" className="text-gray-200 hover:text-white text-sm transition-colors">Registrer bedrift</Link></li>
                  <li><Link href="/bedrift-dashboard" className="text-gray-200 hover:text-white text-sm transition-colors">Bedriftsdashboard</Link></li>
                  <li><Link href="/success-stories" className="text-gray-200 hover:text-white text-sm transition-colors">Success stories</Link></li>
                  <li><Link href="/api" className="text-gray-200 hover:text-white text-sm transition-colors">API for bedrifter</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-4">Kontakt oss</h3>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-200">
                    <Phone size={16} className="mr-2" />
                    <span className="text-sm">22 08 60 00</span>
                  </div>
                  <div className="flex items-center text-gray-200">
                    <MessageCircle size={16} className="mr-2" />
                    <span className="text-sm">post@anbudsmarkedet.no</span>
                  </div>
                  <div className="flex items-start text-gray-200">
                    <span className="mr-2 mt-0.5">📍</span>
                    <span className="text-sm">Karl Johans gate 1<br />0154 Oslo</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-500 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="mb-4 md:mb-0">
                  <p className="text-gray-300 text-sm">
                    © {new Date().getFullYear()} Anbudsmarkedet AS - Alle rettigheter reservert
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 mb-4 md:mb-0">
                  <Link href="/brukervilkar" className="text-gray-200 hover:text-white text-sm font-medium border border-gray-400 hover:border-white px-4 py-2 rounded transition-colors">
                    Brukervilkår
                  </Link>
                  <Link href="/personvern" className="text-gray-200 hover:text-white text-sm font-medium border border-gray-400 hover:border-white px-4 py-2 rounded transition-colors">
                    Personvern
                  </Link>
                  <Link href="/cookies" className="text-gray-200 hover:text-white text-sm font-medium border border-gray-400 hover:border-white px-4 py-2 rounded transition-colors">
                    Cookies
                  </Link>
                </div>

                <div className="flex space-x-4">
                  <a href="#" className="text-gray-300 hover:text-white transition-colors" aria-label="Facebook">
                    <FaFacebook size={20} />
                  </a>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors" aria-label="Instagram">
                    <FaInstagram size={20} />
                  </a>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors" aria-label="TikTok">
                    <FaTiktok size={20} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Fragment>
  )
}