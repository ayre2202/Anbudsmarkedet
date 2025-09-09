'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import supabase from '@/lib/supabase/client'
import { ArrowLeft, MapPin, Calendar, FileText, Image, Eye, TrendingUp, MessageSquare } from 'lucide-react'

type JobDetail = {
  id: string
  job_id: string
  title: string
  description: string
  attachments: string[] | null
  created_at: string
  status?: 'pending' | 'approved' | 'rejected' | 'archived'
  rejected_reason?: string | null
  views?: number
  category?: string
  additional_info?: any
}

export default function PrivatJobDetailPage() {
  const router = useRouter()
  const { jobId } = useParams()

  const [job, setJob] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalViews: 0,
    offersReceived: 0,
    messagesCount: 0
  })

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          return router.replace('/auth/role-login')
        }

        // Check role from profiles table
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()

        if (profErr || !profile || profile.role !== 'private_user') {
          return router.replace('/auth/role-login')
        }

        if (!jobId) {
          setError('Ugyldig anbuds-ID.')
          setLoading(false)
          return
        }

        // Fetch job with all details
        const { data, error: fetchError } = await supabase
          .from('jobs')
          .select(`
            id, job_id, title, description, attachments, created_at, status, rejected_reason, 
            views, category, additional_info
          `)
          .eq('job_id', jobId)
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (fetchError) {
          setError('Kunne ikke hente jobb: ' + fetchError.message)
        } else if (!data) {
          setError('Fant ingen jobb med anbuds-ID: ' + jobId)
        } else {
          setJob(data as JobDetail)

          // Fetch statistics
          const [offersData, messagesData] = await Promise.all([
            supabase
              .from('offers')
              .select('id')
              .eq('job_id', data.id),
            supabase
              .from('messages')
              .select('id')
              .eq('job_id', data.id)
          ])

          setStats({
            totalViews: data.views || 0,
            offersReceived: offersData.data?.length || 0,
            messagesCount: messagesData.data?.length || 0
          })
        }
      } catch (err: any) {
        setError('Uventet feil: ' + err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [jobId, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0009e2] mx-auto mb-4"></div>
          <p className="text-gray-600">Laster jobbinformasjon...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 bg-[#0009e2] text-white rounded-md hover:bg-[#0007b8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake
          </button>
        </div>
      </div>
    )
  }

  if (!job) return null

  const attachments: string[] = Array.isArray(job.attachments) ? job.attachments : []

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'bg-green-50 border-green-200 text-green-800'
      case 'rejected': return 'bg-red-50 border-red-200 text-red-800'
      case 'archived': return 'bg-gray-50 border-gray-200 text-gray-800'
      default: return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'approved': return 'Godkjent og publisert'
      case 'rejected': return 'Avslått'
      case 'archived': return 'Arkivert'
      default: return 'Venter på godkjenning'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center text-gray-600 hover:text-[#0009e2] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Tilbake til mine jobber
              </button>
              <div className="px-3 py-1 bg-[#0009e2] text-white rounded-full text-sm font-medium">
                Anbuds ID: {job.job_id}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(job.status)}`}>
              {getStatusText(job.status)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Job Overview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-8 border-b border-gray-200 bg-gradient-to-r from-[#0009e2] to-[#0007b8]">
              <h1 className="text-3xl font-bold text-white mb-4">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                {job.category && (
                  <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {job.category}
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-sm">Publisert {new Date(job.created_at).toLocaleDateString('nb-NO')}</span>
                </div>
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  <span className="text-sm">{stats.totalViews} visninger</span>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="px-6 py-6 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <Eye className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Totale visninger</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tilbud mottatt</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.offersReceived}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <MessageSquare className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Meldinger</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.messagesCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Message */}
            {job.status === 'rejected' && job.rejected_reason && (
              <div className="px-6 py-4 bg-red-50 border-b border-red-200">
                <div className="text-red-800">
                  <strong>Begrunnelse for avslag:</strong> {job.rejected_reason}
                </div>
              </div>
            )}

            {/* Job Description */}
            <div className="px-6 py-8">
              <div className="flex items-center mb-4">
                <FileText className="w-5 h-5 text-[#0009e2] mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Jobbeskrivelse</h2>
              </div>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 whitespace-pre-line leading-relaxed">{job.description}</p>
              </div>

              {/* Additional Information */}
              {job.additional_info && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Tilleggsinformasjon:</h3>
                  <div className="space-y-1 text-sm text-blue-800">
                    {job.additional_info.wall_color && (
                      <p><span className="font-medium">Ønsket veggfarge:</span> {job.additional_info.wall_color}</p>
                    )}
                    {job.additional_info.pipe_location && (
                      <p><span className="font-medium">Rørenes lokasjon:</span> {job.additional_info.pipe_location}</p>
                    )}
                    {job.additional_info.electric_issue && (
                      <p><span className="font-medium">Elektrisk problem:</span> {job.additional_info.electric_issue}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Elegant 3D Activity Graph */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-6 bg-[#faf6f5] border-b border-gray-200">
              <div className="flex items-center mb-4">
                <TrendingUp className="w-5 h-5 text-[#0009e2] mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Aktivitet på din annonse</h2>
              </div>
              
              <div className="bg-white p-8 rounded-lg border border-gray-200">
                {/* Clean 3D Graph */}
                <div className="relative h-80 w-full">
                  <div className="relative w-full h-full">
                    {/* Subtle Grid */}
                    <div className="absolute inset-0">
                      {/* Vertical lines */}
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                          key={`v-${i}`}
                          className="absolute h-full border-l border-gray-100"
                          style={{ left: `${15 + (i * 12)}%` }}
                        />
                      ))}
                      {/* Horizontal lines */}
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={`h-${i}`}
                          className="absolute w-full border-b border-gray-100"
                          style={{ bottom: `${20 + (i * 15)}%` }}
                        />
                      ))}
                    </div>

                    {/* Elegant SVG Lines */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 280">
                      {/* Unique visitors - Blue */}
                      <path
                        d="M 60 220 Q 90 200 120 180 T 180 140 T 240 100 T 300 80 T 360 60"
                        fill="none"
                        stroke="#0009e2"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      {/* Repeated visitors - Green */}
                      <path
                        d="M 60 240 Q 90 230 120 220 T 180 190 T 240 160 T 300 130 T 360 100"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      {/* Contact attempts - Orange */}
                      <path
                        d="M 60 250 Q 90 245 120 240 T 180 220 T 240 200 T 300 180 T 360 160"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      {/* Message clicks - Red */}
                      <path
                        d="M 60 255 Q 90 250 120 245 T 180 230 T 240 215 T 300 200 T 360 185"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />

                      {/* Data points */}
                      {[60, 120, 180, 240, 300, 360].map((x, i) => (
                        <g key={i}>
                          <circle cx={x} cy={220 - (i * 30)} r="2" fill="#0009e2" />
                          <circle cx={x} cy={240 - (i * 25)} r="2" fill="#10b981" />
                          <circle cx={x} cy={250 - (i * 18)} r="2" fill="#f59e0b" />
                          <circle cx={x} cy={255 - (i * 12)} r="2" fill="#ef4444" />
                        </g>
                      ))}
                    </svg>
                  </div>

                  {/* Clean Labels */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-between text-xs text-gray-500 px-14">
                    <span>31. aug</span>
                    <span>1. sep</span>
                    <span>2. sep</span>
                    <span>3. sep</span>
                    <span>4. sep</span>
                    <span>5. sep</span>
                  </div>

                  {/* Y-axis */}
                  <div className="absolute left-2 top-4 bottom-16 flex flex-col justify-between text-xs text-gray-400">
                    <span>15</span>
                    <span>10</span>
                    <span>5</span>
                    <span>0</span>
                  </div>
                </div>

                {/* Clean Legend */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-[#0009e2] rounded-full mr-2"></div>
                    <span className="text-gray-700">Unike besøkende</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-700">Gjentatte besøk (3+)</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-gray-700">Kontakt-forsøk</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-gray-700">"Send melding" klikk</span>
                  </div>
                </div>

                {/* Key insights */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Nøkkelinnsikt fra din annonse:</h4>
                  <div className="grid md:grid-cols-2 gap-3 text-sm text-blue-800">
                    <div>• {Math.floor(stats.totalViews * 0.3)} bedrifter har besøkt 3+ ganger</div>
                    <div>• {stats.offersReceived} har trykket "send tilbud"</div>
                    <div>• {Math.floor(stats.offersReceived * 0.8)} har trykket "send melding"</div>
                    <div>• Høyest aktivitet på 5. sep</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-8 bg-gray-50">
                <div className="flex items-center mb-4">
                  <Image className="w-5 h-5 text-[#0009e2] mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Vedlegg</h2>
                  <span className="ml-2 px-2 py-1 bg-[#0009e2] text-white text-xs rounded-full">
                    {attachments.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {attachments.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block border-2 border-gray-200 rounded-lg overflow-hidden hover:border-[#0009e2] hover:shadow-md transition-all duration-200"
                    >
                      {/\.(jpe?g|png|gif|webp)$/i.test(url) ? (
                        <div className="relative">
                          <img
                            src={url}
                            alt={`Vedlegg ${i + 1}`}
                            className="object-cover w-full h-32 group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Image className="w-8 h-8 text-white drop-shadow-lg" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-32 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center">
                          <div className="text-center">
                            <FileText className="w-8 h-8 text-gray-400 group-hover:text-[#0009e2] mx-auto mb-2 transition-colors" />
                            <span className="text-sm text-gray-600 group-hover:text-[#0009e2] font-medium transition-colors">
                              Fil {i + 1}
                            </span>
                          </div>
                        </div>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}