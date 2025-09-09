'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import supabase from '@/lib/supabase/client'
import { MessageCircle, Receipt, Building2, TrendingUp, Clock, CheckCircle, Users, Eye, Scissors, AlertTriangle } from 'lucide-react'

export default function BedriftDashboard() {
  const router = useRouter()
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [clipData, setClipData] = useState<{
    remaining: number
    total: number
    nextReset: string
  } | null>(null)
  const [stats, setStats] = useState({
    activeOffers: 0,
    wonJobs: 0,
    responseRate: 0,
    totalViews: 0,
    unreadMessages: 0
  })

  useEffect(() => {
    const handleRefreshClips = async () => {
      const sb: any = supabase
      const { data: { session } } = await sb.auth.getSession()
      if (session?.user) {
        try {
          const { data: clipsData, error: clipsError } = await sb
            .from('business_clips')
            .select('remaining_clips, total_monthly_clips, next_reset_date')
            .eq('user_id', session.user.id)
            .single()

          if (clipsData && !clipsError) {
            setClipData({
              remaining: clipsData.remaining_clips,
              total: clipsData.total_monthly_clips,
              nextReset: clipsData.next_reset_date
            })
          }
        } catch (err) {
          console.log('Klipp refresh error:', err)
        }
      }
    }

    // Refresh clips when component mounts
    handleRefreshClips()

    // Refresh clips when page becomes visible (user returns from job detail)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleRefreshClips()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const sb: any = supabase

      // 1) Session
      const { data: { session } } = await sb.auth.getSession()
      if (!session) {
        router.replace('/')
        return
      }

      // 2) Rolle fra profiles (unngår users → policy-rekursjon)
      const { data: profile, error: profErr } = await sb
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (profErr || !profile) {
        setErr('Kunne ikke hente profil')
        setJobs([])
        setLoading(false)
        router.replace('/')
        return
      }

      if (profile.role !== 'business_user') {
        setErr('Ikke autorisert (krever bedrift/administrator)')
        setJobs([])
        setLoading(false)
        router.replace('/')
        return
      }

      // 3) Hent klipp-data
      const { data: clipsData, error: clipsError } = await sb
        .from('business_clips')
        .select('remaining_clips, total_monthly_clips, next_reset_date')
        .eq('user_id', session.user.id)
        .single()

      if (clipsData && !clipsError) {
        setClipData({
          remaining: clipsData.remaining_clips,
          total: clipsData.total_monthly_clips,
          nextReset: clipsData.next_reset_date
        })
      }

      // 4) Godkjente jobber - include job_id for links
      const { data, error } = await sb
        .from('jobs')
        .select('id,job_id,title,address,created_at,attachments')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) {
        setErr(error?.message || 'Kunne ikke hente jobber')
        setJobs([])
      } else {
        setErr(null)
        setJobs(data || [])
      }

      // 5) Hent statistikker (mock data for nå - kan kobles til faktiske data senere)
      setStats({
        activeOffers: Math.floor(Math.random() * 15) + 5, // Mock: 5-20 aktive tilbud
        wonJobs: Math.floor(Math.random() * 8) + 2, // Mock: 2-10 vunne jobber denne måneden
        responseRate: Math.floor(Math.random() * 30) + 70, // Mock: 70-100% response rate
        totalViews: Math.floor(Math.random() * 200) + 150, // Mock: 150-350 totale visninger
        unreadMessages: Math.floor(Math.random() * 5) // Mock: 0-5 uleste meldinger
      })

      setLoading(false)
    })()
  }, [router])

  // Helper function to get first attachment URL
  const getFirstAttachment = (attachments: any) => {
    if (!attachments) return null
    
    // Handle different possible formats
    if (Array.isArray(attachments) && attachments.length > 0) {
      return attachments[0]
    }
    
    // If it's a string (sometimes Supabase serializes arrays as strings)
    if (typeof attachments === 'string') {
      try {
        const parsed = JSON.parse(attachments)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0]
        }
      } catch {
        // If it's not JSON, might be a single URL string
        return attachments
      }
    }
    
    return null
  }

  const getClipStatus = () => {
    if (!clipData) return { color: 'gray', message: 'Laster...' }
    
    const percentage = (clipData.remaining / clipData.total) * 100
    
    if (percentage > 50) return { color: 'green', message: 'God tilstand' }
    if (percentage > 20) return { color: 'yellow', message: 'Moderat bruk' }
    if (percentage > 0) return { color: 'orange', message: 'Lav beholdning' }
    return { color: 'red', message: 'Ingen klipp igjen' }
  }

  if (loading) return (
    <div className="p-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )

  const clipStatus = getClipStatus()

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header med navigasjon */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bedriftsdashboard</h1>
          <div className="flex gap-3">
            <Link
              href="/bedrift-dashboard/meldinger"
              className="relative bg-[#0009e2] hover:bg-[#0007b8] text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <MessageCircle size={16} />
              Meldinger
              {stats.unreadMessages > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                  {stats.unreadMessages}
                </span>
              )}
            </Link>
            <Link
              href="/bedrift-dashboard/faktura"
              className="bg-white hover:bg-[#0009e2] text-gray-700 hover:text-white border border-gray-300 hover:border-[#0009e2] px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Receipt size={16} />
              Faktura
            </Link>
            <Link
              href="/bedrift-dashboard/min-bedriftsside"
              className="bg-white hover:bg-[#0009e2] text-gray-700 hover:text-white border border-gray-300 hover:border-[#0009e2] px-4 py-2 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
            >
              <Building2 size={16} />
              Min bedriftsside
            </Link>
          </div>
        </div>

        {/* Statistikk-bokser med klipp */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-[#0009e2]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Aktive tilbud</p>
                <p className="text-3xl font-bold text-[#0009e2]">{stats.activeOffers}</p>
                <p className="text-xs text-gray-500 mt-1">Jobber du har budt på</p>
              </div>
              <TrendingUp className="w-8 h-8 text-[#0009e2]" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Vunne jobber</p>
                <p className="text-3xl font-bold text-green-600">{stats.wonJobs}</p>
                <p className="text-xs text-gray-500 mt-1">Denne måneden</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Svarprosent</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.responseRate}%</p>
                <p className="text-xs text-gray-500 mt-1">Hvor ofte du svarer</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Profil-visninger</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalViews}</p>
                <p className="text-xs text-gray-500 mt-1">Siste 30 dager</p>
              </div>
              <Eye className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          {/* Klipp-status boks */}
          <div className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${
            clipStatus.color === 'green' ? 'border-green-500' :
            clipStatus.color === 'yellow' ? 'border-yellow-500' :
            clipStatus.color === 'orange' ? 'border-orange-500' :
            clipStatus.color === 'red' ? 'border-red-500' : 'border-gray-500'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Klipp</p>
                <p className={`text-3xl font-bold ${
                  clipStatus.color === 'green' ? 'text-green-600' :
                  clipStatus.color === 'yellow' ? 'text-yellow-600' :
                  clipStatus.color === 'orange' ? 'text-orange-600' :
                  clipStatus.color === 'red' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {clipData ? `${clipData.remaining}/${clipData.total}` : '...'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {clipData ? `Fornyes ${new Date(clipData.nextReset).toLocaleDateString('nb-NO')}` : 'Laster...'}
                </p>
              </div>
              <div className="relative">
                <Scissors className={`w-8 h-8 ${
                  clipStatus.color === 'green' ? 'text-green-600' :
                  clipStatus.color === 'yellow' ? 'text-yellow-600' :
                  clipStatus.color === 'orange' ? 'text-orange-600' :
                  clipStatus.color === 'red' ? 'text-red-600' : 'text-gray-600'
                }`} />
                {clipData && clipData.remaining === 0 && (
                  <AlertTriangle className="w-4 h-4 text-red-500 absolute -top-1 -right-1" />
                )}
              </div>
            </div>
            {clipData && clipData.remaining <= 5 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Få klipp igjen! Kontakt support for å øke kontingenten.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feilhåndtering */}
      {err && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
          <strong>Feil:</strong> {err}
        </div>
      )}

      {/* Raske handlinger */}
      <div className="bg-[#faf6f5] p-6 rounded-lg mb-8">
        <h2 className="text-xl font-semibold text-[#0009e2] mb-4">Raske handlinger</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/bedrift-dashboard/nytt-tilbud"
            className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow border"
          >
            <div className="w-10 h-10 bg-[#0009e2] rounded-full flex items-center justify-center mr-3">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Gi nytt tilbud</h3>
              <p className="text-sm text-gray-600">Send tilbud på ny jobb</p>
            </div>
          </Link>
          
          <Link
            href="/bedrift-dashboard/meldinger"
            className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow border"
          >
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Sjekk meldinger</h3>
              <p className="text-sm text-gray-600">Se nye henvendelser</p>
            </div>
          </Link>
          
          <Link
            href="/bedrift-dashboard/min-bedriftsside"
            className="flex items-center p-4 bg-white rounded-lg hover:shadow-md transition-shadow border"
          >
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center mr-3">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Oppdater profil</h3>
              <p className="text-sm text-gray-600">Rediger bedriftsinfo</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Tilgjengelige jobber */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Tilgjengelige jobber</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">{jobs.length} aktive jobber</span>
              {clipData && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  <Scissors className="w-3 h-3 inline mr-1" />
                  {clipData.remaining} klipp igjen
                </span>
              )}
            </div>
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen jobber tilgjengelig</h3>
            <p className="text-gray-600 mb-4">Det er ingen nye jobber akkurat nå, men sjekk tilbake senere!</p>
            <Link
              href="/bedrift-dashboard/meldinger"
              className="inline-flex items-center px-4 py-2 bg-[#0009e2] text-white rounded-md hover:bg-[#0007b8] transition-colors"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Sjekk meldinger i stedet
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {jobs.map((job) => {
              const firstAttachment = getFirstAttachment(job.attachments)
              
              return (
                <Link
                  key={job.id}
                  href={`/bedrift-dashboard/${job.job_id}`} // CHANGED: Use job_id instead of id
                  className="group block border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 hover:border-[#0009e2] bg-white"
                >
                  {/* Bilde */}
                  {firstAttachment ? (
                    <div className="h-48 bg-gray-100 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={firstAttachment}
                        alt={job.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          // If image fails to load, replace with placeholder
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          target.nextElementSibling!.classList.remove('hidden')
                        }}
                      />
                      <div className="hidden h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Building2 className="w-8 h-8 mx-auto mb-2" />
                          <span className="text-sm">Bilde ikke tilgjengelig</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 bg-gray-200 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Building2 className="w-8 h-8 mx-auto mb-2" />
                        <span className="text-sm">Ingen bilde</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Innhold */}
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2 text-gray-900 group-hover:text-[#0009e2] transition-colors line-clamp-2">
                      {job.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 flex items-center">
                      <Building2 className="w-4 h-4 mr-1" />
                      {job.address || 'Adresse ikke spesifisert'}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center mb-1">
                      <Clock className="w-4 h-4 mr-1" />
                      Publisert: {new Date(job.created_at).toLocaleDateString('nb-NO')}
                    </p>
                    {/* Display job_id */}
                    {job.job_id && (
                      <p className="text-xs text-gray-500">
                        ID: {job.job_id}
                      </p>
                    )}
                    
                    {/* CTA */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#0009e2]">Se detaljer →</span>
                        <span className="text-xs bg-[#0009e2] text-white px-2 py-1 rounded-full">
                          Aktiv
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}