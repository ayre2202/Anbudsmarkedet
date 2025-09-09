'use client'

import { useState, useEffect, useRef } from 'react'
import supabase from '@/lib/supabase/client'
import {
  MessageCircle,
  Briefcase,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building,
  User,
  Loader2,
  RotateCw,
  TrendingUp,
} from 'lucide-react'

interface Offer {
  id: string
  job_id: string
  price: number
  sender_name: string
  sender_org: string
  created_at: string
  status: string
  jobs: { title: string }
}

interface Message {
  id: string
  job_id: string
  sender_role: string
  content: string
  created_at: string
}

interface Job {
  id: string
  title: string
  created_at: string
}

export default function MeldingerPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUser(user)

      const { data: userJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id,title,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (jobsError) {
        console.error('Feil ved henting av jobber:', jobsError)
        return
      }

      setJobs(userJobs || [])
      if (userJobs && userJobs.length > 0 && !selectedJobId) {
        setSelectedJobId(userJobs[0].id)
      }
    } catch (error) {
      console.error('Feil ved lasting av data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedJobId) return
    loadJobData()
  }, [selectedJobId])

  const loadJobData = async () => {
    if (!selectedJobId) return

    try {
      // Tilbud (offers)
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('id,job_id,price,sender_name,sender_org,created_at,status,jobs(title)')
        .eq('job_id', selectedJobId)
        .order('created_at', { ascending: false })

      if (offersError) {
        console.error('Feil ved henting av tilbud:', offersError)
      } else {
        const normalizedOffers: Offer[] = (offersData || []).map((offer: any) => ({
          ...offer,
          jobs: offer.jobs?.[0] || { title: '' },
        }))
        setOffers(normalizedOffers)
      }

      // Meldinger (messages)
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id,job_id,sender_role,content,created_at')
        .eq('job_id', selectedJobId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Feil ved henting av meldinger:', messagesError)
      } else {
        setMessages(messagesData || [])
      }

    } catch (error) {
      console.error('Feil ved lasting av jobbdata:', error)
    }
  }

  // Real-time oppdateringer
  useEffect(() => {
    const channel = supabase
      .channel('business-messages-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          const newMessage = payload.new as Message
          if (newMessage.job_id === selectedJobId) {
            setMessages(prev => [...prev, newMessage])
          }
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'offers' }, 
        () => {
          loadJobData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedJobId])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedJobId || !currentUser) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          job_id: selectedJobId,
          sender_role: 'business_user',
          content: newMessage.trim(),
        })

      if (error) {
        console.error('Feil ved sending av melding:', error)
        alert(`Kunne ikke sende melding: ${error.message || 'Ukjent feil'}`)
        return
      }

      setNewMessage('')
      
    } catch (error) {
      console.error('Feil ved sending av melding:', error)
      alert('Teknisk feil ved sending av melding')
    } finally {
      setSending(false)
    }
  }

  const updateStatus = async (offerId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status: newStatus })
        .eq('id', offerId)

      if (error) {
        console.error('Feil ved oppdatering av tilbud:', error)
        alert(`Kunne ikke oppdatere tilbud: ${error.message}`)
        return
      }

      setOffers(prev => prev.map(offer => 
        offer.id === offerId 
          ? { ...offer, status: newStatus }
          : offer
      ))

    } catch (error) {
      console.error('Feil ved oppdatering av tilbudsstatus:', error)
    }
  }

  const requestPriceChange = async (offerId: string) => {
    const answer = prompt('Skriv ønsket ny pris (NOK):')
    if (!answer) return
    
    const newPrice = parseFloat(answer.replace(',', '.'))
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Ugyldig pris.')
      return
    }

    try {
      const { error } = await supabase
        .from('offers')
        .update({ price: newPrice, status: 'pending' })
        .eq('id', offerId)

      if (error) {
        console.error('Feil ved oppdatering av pris:', error)
        alert(`Kunne ikke endre pris: ${error.message}`)
        return
      }

      setOffers(prev => prev.map(offer => 
        offer.id === offerId 
          ? { ...offer, price: newPrice, status: 'pending' }
          : offer
      ))

    } catch (error) {
      console.error('Feil ved endring av pris:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="text-emerald-600" size={16} />
      case 'declined':
        return <XCircle className="text-red-600" size={16} />
      default:
        return <Clock className="text-amber-600" size={16} />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'Akseptert'
      case 'declined':
        return 'Avslått'
      case 'pending':
        return 'Venter'
      default:
        return 'Ukjent'
    }
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId)
  const hasMessages = messages.length > 0
  const hasOffers = offers.length > 0

  if (loading) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-blue-400/50 via-blue-500/40 via-slate-50 to-slate-100 flex items-center justify-center"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 60px 60px'
        }}
      >
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0009e2] mx-auto mb-4"></div>
          </div>
          <p className="text-slate-600 font-medium text-center">Laster meldinger...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-400/50 via-blue-500/40 via-slate-50 to-slate-100 py-8"
      style={{
        backgroundImage: `
          linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px, 60px 60px'
      }}
    >
      <div className="max-w-7xl mx-auto px-8">
        {/* Header */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <MessageCircle className="text-[#0009e2]" size={28} />
                Meldinger
              </h1>
              <p className="text-slate-600 font-medium mt-2">Kommuniser med kunder og håndter tilbud for dine jobber</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                <div className="flex items-center gap-2 text-blue-700">
                  <Building size={16} />
                  <span className="text-sm font-semibold">Bedriftsportalen</span>
                </div>
              </div>
              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0009e2] hover:bg-blue-600 text-white text-sm font-semibold transition-all duration-200 shadow-lg"
              >
                <RotateCw size={16} />
                Oppdater
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-220px)]">
          {/* Jobbliste */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="text-[#0009e2]" size={20} />
                  Mine jobber
                </h2>
                <p className="text-sm text-slate-600 mt-1">Velg jobb for å se meldinger</p>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {jobs.length === 0 ? (
                  <div className="p-6 text-center">
                    <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Ingen jobber enda</p>
                    <p className="text-sm text-slate-500">Opprett en jobb for å starte kommunikasjon</p>
                  </div>
                ) : (
                  <ul className="p-3 space-y-2">
                    {jobs.map(job => (
                      <li
                        key={job.id}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                          selectedJobId === job.id 
                            ? 'bg-[#0009e2] text-white border-[#0009e2] shadow-lg' 
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedJobId(job.id)}
                      >
                        <div className="font-semibold text-sm">{job.title}</div>
                        <div className={`text-xs mt-1 ${selectedJobId === job.id ? 'text-blue-100' : 'text-slate-500'}`}>
                          {new Date(job.created_at).toLocaleDateString('no-NO')}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Hovedinnhold */}
          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col">
              {selectedJob ? (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{selectedJob.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">Opprettet {new Date(selectedJob.created_at).toLocaleDateString('no-NO')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {hasOffers && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                            <span className="text-emerald-700 text-sm font-semibold">{offers.length} tilbud</span>
                          </div>
                        )}
                        {hasMessages && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                            <span className="text-blue-700 text-sm font-semibold">{messages.length} meldinger</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tilbud seksjonen */}
                  <div className="p-6 border-b border-slate-200 bg-slate-50/50">
                    <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <TrendingUp className="text-emerald-600" size={20} />
                      Tilbud mottatt
                    </h4>
                    
                    {offers.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">Ingen tilbud mottatt ennå</p>
                        <p className="text-sm text-slate-500">Tilbud vil vises her når de kommer inn</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {offers.map(offer => (
                          <div
                            key={offer.id}
                            className="bg-white rounded-xl p-4 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <Building className="text-slate-400" size={16} />
                                  <span className="font-bold text-slate-800">{offer.sender_name}</span>
                                  <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                                    {offer.sender_org}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-4 mb-3">
                                  <div className="text-2xl font-bold text-[#0009e2]">
                                    {offer.price.toLocaleString('no-NO')} NOK
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(offer.status)}
                                    <span className="text-sm font-semibold text-slate-700">
                                      {getStatusText(offer.status)}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="text-xs text-slate-500">
                                  Mottatt {new Date(offer.created_at).toLocaleString('no-NO')}
                                </div>
                              </div>

                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => updateStatus(offer.id, "accepted")}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all duration-200 shadow-lg"
                                >
                                  <CheckCircle size={16} />
                                  Aksepter
                                </button>
                                <button
                                  onClick={() => updateStatus(offer.id, "declined")}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all duration-200 shadow-lg"
                                >
                                  <XCircle size={16} />
                                  Avslå
                                </button>
                                <button
                                  onClick={() => requestPriceChange(offer.id)}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-all duration-200 shadow-lg"
                                >
                                  <TrendingUp size={16} />
                                  Endre pris
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Meldinger seksjonen */}
                  <div className="flex-1 flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-200">
                      <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <MessageCircle className="text-[#0009e2]" size={20} />
                        Chat
                      </h4>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <MessageCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                            <p className="text-slate-600 font-medium">Ingen meldinger ennå</p>
                            <p className="text-sm text-slate-500">Start samtalen med kunden</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map(msg => {
                            const fromMe = msg.sender_role === 'business_user'
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`max-w-sm rounded-2xl px-4 py-3 shadow-lg border ${
                                  fromMe
                                    ? 'bg-[#0009e2] text-white border-[#0009e2]'
                                    : 'bg-white text-slate-800 border-slate-200'
                                }`}>
                                  <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className={`text-xs ${fromMe ? 'text-blue-100' : 'text-slate-500'}`}>
                                      {fromMe ? 'Du' : 'Kunde'}
                                    </div>
                                    <div className={`text-xs ${fromMe ? 'text-blue-100' : 'text-slate-500'}`}>
                                      {new Date(msg.created_at).toLocaleTimeString('no-NO', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {/* Send melding */}
                    <div className="p-6 border-t border-slate-200 bg-white">
                      <form onSubmit={handleSendMessage} className="flex gap-3">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent font-medium"
                            placeholder="Skriv en melding til kunden..."
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            disabled={sending}
                          />
                        </div>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0009e2] hover:bg-blue-600 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!newMessage.trim() || sending}
                        >
                          {sending ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <Send size={18} />
                          )}
                          {sending ? 'Sender...' : 'Send'}
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Briefcase className="h-20 w-20 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Velg en jobb</h3>
                    <p className="text-slate-600 font-medium">Velg en jobb fra listen til venstre for å se meldinger og tilbud</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}