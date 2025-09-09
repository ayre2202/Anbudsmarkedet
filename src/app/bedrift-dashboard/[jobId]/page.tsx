'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import supabase from '@/lib/supabase/client'
import { ArrowLeft, MapPin, Calendar, FileText, Image, Download, Send, AlertCircle, CheckCircle, X, ChevronLeft, ChevronRight, Mail, Phone, User, Eye, Lock, Coins } from 'lucide-react'

export default function JobOfferPage() {
  const { jobId } = useParams()
  const router = useRouter()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [offer, setOffer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  // Image gallery states
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  
  // Contact unlock states
  const [contactUnlocked, setContactUnlocked] = useState(false)
  const [unlockingContact, setUnlockingContact] = useState(false)
  const [clipError, setClipError] = useState<string | null>(null)
  const [userClips, setUserClips] = useState<{remaining: number, total: number} | null>(null)

  useEffect(() => {
    const fetchJobAndClips = async () => {
      if (!jobId) {
        setErrorMsg('Ugyldig anbuds-ID.')
        setLoading(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setErrorMsg('Du må være logget inn for å se denne siden.')
        setLoading(false)
        return
      }

      // Check business role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (!profile || profile.role !== 'business_user') {
        setErrorMsg('Kun bedriftsbrukere kan se denne siden.')
        setLoading(false)
        return
      }

      // Fetch job
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_id', jobId)
        .maybeSingle()

      if (error) {
        setErrorMsg('Kunne ikke hente jobb: ' + error.message)
      } else if (!data) {
        setErrorMsg('Fant ingen jobb med anbuds-ID: ' + jobId)
      } else {
        setJob(data)
        
        // Set image gallery
        if (data.attachments) {
          const images = data.attachments.filter((url: string) => 
            /\.(jpe?g|png|gif|webp)$/i.test(url)
          )
          setImageUrls(images)
        }

        // Track view
        await trackJobView(data.id)
      }

      // Fetch clips
      const { data: clipsData } = await supabase
        .from('business_clips')
        .select('remaining_clips, total_monthly_clips')
        .eq('user_id', session.user.id)
        .single()

      if (clipsData) {
        setUserClips({
          remaining: clipsData.remaining_clips,
          total: clipsData.total_monthly_clips
        })
      }

      // Check if already unlocked
      if (data) {
        const { data: unlockedData } = await supabase
          .from('unlocked_jobs')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('job_id', data.id)
          .single()

        if (unlockedData) {
          setContactUnlocked(true)
        }
      }

      setLoading(false)
    }

    fetchJobAndClips()
  }, [jobId])

  const trackJobView = async (jobUUID: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      let sessionId = localStorage.getItem('anbudsmarkedet_session_id')
      if (!sessionId) {
        sessionId = crypto.randomUUID()
        localStorage.setItem('anbudsmarkedet_session_id', sessionId)
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      
      const { data: recentView } = await supabase
        .from('job_views')
        .select('id')
        .eq('job_id', jobUUID)
        .or(user ? `user_id.eq.${user.id}` : `session_id.eq.${sessionId}`)
        .gte('viewed_at', oneHourAgo)
        .maybeSingle()

      if (!recentView) {
        await supabase
          .from('job_views')
          .insert({
            job_id: jobUUID,
            user_id: user?.id || null,
            session_id: user ? null : sessionId
          })

        const { data: currentJob } = await supabase
          .from('jobs')
          .select('views')
          .eq('id', jobUUID)
          .single()

        if (currentJob) {
          await supabase
            .from('jobs')
            .update({ views: (currentJob.views || 0) + 1 })
            .eq('id', jobUUID)
        }
      }
    } catch (error) {
      console.error('Error tracking job view:', error)
    }
  }

  const sendOffer = async () => {
    if (!offer.trim()) {
      alert('Skriv inn et tilbud før du sender.')
      return
    }
    
    setSubmitting(true)
    const { error } = await supabase
      .from('offers')
      .insert({ 
        job_id: job.id,
        price: offer, 
        sender_role: 'business_user' 
      })

    if (error) {
      alert('Feil ved innsending: ' + error.message)
      setSubmitting(false)
    } else {
      setSubmitted(true)
      setSubmitting(false)
      setTimeout(() => router.push('/bedrift-dashboard'), 2000)
    }
  }

  const unlockContactInfo = async () => {
    if (!userClips || userClips.remaining <= 0) {
      setClipError('Du har ingen klipp igjen. Kontakt support for å kjøpe flere.')
      return
    }

    setUnlockingContact(true)
    setClipError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setClipError('Ikke logget inn')
        return
      }

      // Check if already unlocked
      const { data: existingUnlock } = await supabase
        .from('unlocked_jobs')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('job_id', job.id)
        .single()

      if (existingUnlock) {
        setContactUnlocked(true)
        return
      }

      // Deduct clip
      const { data: updatedData, error: updateError } = await supabase
        .from('business_clips')
        .update({ 
          remaining_clips: userClips.remaining - 1,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.user.id)
        .select('remaining_clips')

      if (updateError || !updatedData?.length) {
        throw new Error('Klarte ikke å trekke fra klipp')
      }

      // Record unlock
      await supabase
        .from('unlocked_jobs')
        .insert({
          user_id: session.user.id,
          job_id: job.id
        })

      setUserClips(prev => prev ? { ...prev, remaining: updatedData[0].remaining_clips } : null)
      setContactUnlocked(true)
      
    } catch (error: any) {
      setClipError('Feil: ' + (error.message || 'Ukjent feil'))
    } finally {
      setUnlockingContact(false)
    }
  }

  const openImageModal = (imageUrl: string) => {
    const index = imageUrls.findIndex(url => url === imageUrl)
    setCurrentImageIndex(index >= 0 ? index : 0)
    setShowImageModal(true)
  }

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % imageUrls.length)
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0009e2] mx-auto mb-4"></div>
          <p className="text-gray-600">Laster jobbdetaljer...</p>
        </div>
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Ups! Noe gikk galt</h1>
          <p className="text-gray-600 mb-6">{errorMsg}</p>
          <Link
            href="/bedrift-dashboard"
            className="inline-flex items-center px-4 py-2 bg-[#0009e2] text-white rounded-md hover:bg-[#0007b8] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tilbake til dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!job) return null

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Tilbud sendt!</h1>
          <p className="text-gray-600 mb-4">Ditt tilbud er nå sendt til kunden. Du blir omdirigert til dashboard...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0009e2] mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Image Gallery Modal */}
      {showImageModal && imageUrls.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowImageModal(false)}
          ></div>
          
          <div className="relative z-10 max-w-5xl max-h-[90vh] w-full mx-4">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X size={24} />
            </button>

            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div className="flex items-center justify-center h-full">
              <img
                src={imageUrls[currentImageIndex]}
                alt={`Bilde ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            </div>

            {imageUrls.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
                {currentImageIndex + 1} / {imageUrls.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/bedrift-dashboard"
                className="inline-flex items-center text-gray-600 hover:text-[#0009e2] transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Tilbake til dashboard
              </Link>
              <div className="px-3 py-1 bg-[#0009e2] text-white rounded-full text-sm font-medium">
                Anbuds ID: {job.job_id}
              </div>
            </div>
            {userClips && (
              <div className="flex items-center gap-2 text-sm">
                <Coins className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900">
                  {userClips.remaining}/{userClips.total} klipp
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Job Header and Description */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Job Header */}
            <div className="px-6 py-8 border-b border-gray-200 bg-gradient-to-r from-[#0009e2] to-[#0007b8]">
              <h1 className="text-3xl font-bold text-white mb-4">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white/90">
                {job.category && (
                  <div className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                    {job.category}
                  </div>
                )}
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="text-sm">{job.address || 'Adresse ikke oppgitt'}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span className="text-sm">Publisert {new Date(job.created_at).toLocaleDateString('nb-NO')}</span>
                </div>
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  <span className="text-sm">{job.views || 0} visninger</span>
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="px-6 py-8">
              <div className="flex items-center mb-4">
                <FileText className="w-5 h-5 text-[#0009e2] mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Jobbeskrivelse</h2>
              </div>
              <p className="text-gray-700 whitespace-pre-line leading-relaxed">{job.description}</p>

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

          {/* Locked Content Section */}
          <div className="relative">
            {/* Blur overlay when locked */}
            {!contactUnlocked && (
              <div className="absolute inset-0 backdrop-blur-sm bg-white/30 z-10 rounded-lg"></div>
            )}
            
            <div className="space-y-6">
              {/* Top Row: Contact Info + Send Offer */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-8 bg-[#faf6f5]">
                    {contactUnlocked ? (
                      <div>
                        <div className="flex items-center mb-4">
                          <User className="w-5 h-5 text-[#0009e2] mr-2" />
                          <h2 className="text-xl font-semibold text-gray-900">Kontaktinformasjon</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                            <User className="w-4 h-4 text-gray-400 mr-3" />
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Navn</p>
                              <p className="text-gray-900 font-medium">{job.full_name || 'Ikke oppgitt'}</p>
                            </div>
                          </div>
                          <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                            <Mail className="w-4 h-4 text-gray-400 mr-3" />
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">E-post</p>
                              <p className="text-gray-900 font-medium">{job.email || 'Ikke oppgitt'}</p>
                            </div>
                          </div>
                          <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                            <Phone className="w-4 h-4 text-gray-400 mr-3" />
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Telefon</p>
                              <p className="text-gray-900 font-medium">{job.phone || 'Ikke oppgitt'}</p>
                            </div>
                          </div>
                          <div className="flex items-center p-3 bg-white rounded-lg border border-gray-200">
                            <MapPin className="w-4 h-4 text-gray-400 mr-3" />
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">Poststed</p>
                              <p className="text-gray-900 font-medium">
                                {job.zip && job.city ? `${job.zip} ${job.city}` : 'Ikke oppgitt'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Kontaktinformasjon låst</h3>
                        <p className="text-gray-600">Bruk 1 klipp for å låse opp kundens kontaktdetaljer</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Send Offer */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-8">
                    {contactUnlocked ? (
                      <div>
                        <div className="flex items-center mb-4">
                          <Send className="w-5 h-5 text-[#0009e2] mr-2" />
                          <h2 className="text-xl font-semibold text-gray-900">Send tilbud</h2>
                        </div>
                        <p className="text-sm text-gray-600 mb-6">Gi ditt beste tilbud for denne jobben</p>
                        
                        <div className="space-y-6">
                          <div>
                            <label htmlFor="offer-price" className="block text-sm font-semibold text-gray-700 mb-3">
                              Ditt tilbud
                            </label>
                            <textarea
                              id="offer-price"
                              value={offer}
                              onChange={(e) => setOffer(e.target.value)}
                              placeholder="F.eks: 15 000 NOK for hele jobben inkludert material&#10;&#10;Eller beskriv ditt tilbud mer detaljert..."
                              className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 focus:border-[#0009e2] focus:ring-2 focus:ring-[#0009e2]/20 focus:outline-none transition-all resize-none text-sm leading-relaxed"
                              rows={6}
                            />
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                              Inkluder pris, tidsramme, hva som er inkludert og eventuell kontaktinfo
                            </p>
                          </div>

                          <button
                            onClick={sendOffer}
                            disabled={submitting || !offer.trim()}
                            className="w-full bg-gradient-to-r from-[#0009e2] to-[#0007b8] hover:from-[#0007b8] hover:to-[#0009e2] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center shadow-lg"
                          >
                            {submitting ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                Sender tilbud...
                              </>
                            ) : (
                              <>
                                <Send className="w-5 h-5 mr-3" />
                                Send tilbud
                              </>
                            )}
                          </button>

                          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                            <h4 className="text-sm font-bold text-blue-900 mb-3">Tips for et godt tilbud:</h4>
                            <ul className="text-xs text-blue-800 space-y-1 leading-relaxed">
                              <li>• Vær konkret og profesjonell</li>
                              <li>• Inkluder tidsramme hvis relevant</li>
                              <li>• Spesifiser hva som er inkludert</li>
                              <li>• Legg ved din kontaktinfo</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Send tilbud låst</h3>
                        <p className="text-gray-600">Tilgjengelig etter opplåsing av kontaktinformasjon</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Attachments (full width) */}
              {job.attachments && job.attachments.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-8 bg-gray-50">
                    {contactUnlocked ? (
                      <div>
                        <div className="flex items-center mb-4">
                          <Image className="w-5 h-5 text-[#0009e2] mr-2" />
                          <h2 className="text-xl font-semibold text-gray-900">Vedlegg</h2>
                          <span className="ml-2 px-2 py-1 bg-[#0009e2] text-white text-xs rounded-full">
                            {job.attachments.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {job.attachments.map((url: string, i: number) => (
                            <div
                              key={i}
                              className="group block border-2 border-gray-200 rounded-lg overflow-hidden hover:border-[#0009e2] hover:shadow-md transition-all duration-200 cursor-pointer"
                            >
                              {/\.(jpe?g|png|gif|webp)$/i.test(url) ? (
                                <div 
                                  className="relative"
                                  onClick={() => openImageModal(url)}
                                >
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
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block h-32 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                  <div className="h-full flex items-center justify-center">
                                    <div className="text-center">
                                      <Download className="w-8 h-8 text-gray-400 group-hover:text-[#0009e2] mx-auto mb-2 transition-colors" />
                                      <span className="text-sm text-gray-600 group-hover:text-[#0009e2] font-medium transition-colors">
                                        Fil {i + 1}
                                      </span>
                                    </div>
                                  </div>
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600">Vedlegg tilgjengelig etter opplåsing</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Central Unlock Button - positioned over the blur */}
            {!contactUnlocked && (
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <div className="text-center">
                  {clipError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm inline-block">
                      {clipError}
                    </div>
                  )}
                  
                  <button
                    onClick={unlockContactInfo}
                    disabled={unlockingContact || !userClips || userClips.remaining <= 0}
                    className="bg-[#0009e2] hover:bg-[#0007b8] disabled:bg-gray-400 text-white px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-105 disabled:hover:scale-100 flex items-center mx-auto shadow-2xl border-4 border-white disabled:cursor-not-allowed"
                  >
                    {unlockingContact ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Låser opp...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-3" />
                        Lås opp for 1 klipp
                      </>
                    )}
                  </button>
                  {userClips && (
                    <p className="text-xs text-gray-700 mt-2 bg-white/80 px-2 py-1 rounded">
                      Du har {userClips.remaining} av {userClips.total} klipp igjen
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}