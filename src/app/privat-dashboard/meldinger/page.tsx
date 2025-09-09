'use client'

import { useState, useEffect, useRef } from 'react'
import supabase from '@/lib/supabase/client'
import {
  MessageCircle,
  Briefcase,
  Send,
  Clock,
  User,
  Building,
  Loader2,
  RotateCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

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
  description?: string
}

interface Conversation {
  job: Job
  messages: Message[]
  lastMessage: string
  lastMessageTime: string
  unread: boolean
  otherPartyMessages: number
}

export default function MeldingerPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [selectedMessages, setSelectedMessages] = useState<Message[]>([])
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
  }, [selectedMessages])

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUser(user)

      // Hent brukerens jobber
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title, created_at, description')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (jobsError) {
        console.error('Feil ved henting av jobber:', jobsError)
        return
      }

      // Hent meldinger for hver jobb
      const conversationsData: Conversation[] = []

      for (const job of jobs || []) {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('id, job_id, sender_role, content, created_at')
          .eq('job_id', job.id)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.error('Feil ved henting av meldinger for jobb:', job.id, messagesError)
          continue
        }

        if (messages && messages.length > 0) {
          const lastMessage = messages[messages.length - 1]
          const otherPartyMessages = messages.filter(m => m.sender_role === 'business_user').length
          
          conversationsData.push({
            job,
            messages,
            lastMessage: lastMessage.content.slice(0, 60) + (lastMessage.content.length > 60 ? '...' : ''),
            lastMessageTime: lastMessage.created_at,
            unread: false, // Kan implementeres senere
            otherPartyMessages
          })
        } else {
          // Vis også jobber uten meldinger
          conversationsData.push({
            job,
            messages: [],
            lastMessage: 'Ingen meldinger ennå',
            lastMessageTime: job.created_at,
            unread: false,
            otherPartyMessages: 0
          })
        }
      }

      // Sorter etter siste aktivitet
      conversationsData.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      )

      setConversations(conversationsData)
      
      // Velg første samtale som standard
      if (conversationsData.length > 0) {
        setSelectedJobId(conversationsData[0].job.id)
        setSelectedMessages(conversationsData[0].messages)
      }

    } catch (error) {
      console.error('Feil ved lasting av samtaler:', error)
    } finally {
      setLoading(false)
    }
  }

  // Real-time oppdateringer
  useEffect(() => {
    const channel = supabase
      .channel('private-messages-realtime')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' }, 
        (payload) => {
          const newMessage = payload.new as Message
          
          // Oppdater kun hvis meldingen tilhører en av brukerens jobber
          if (conversations.some(conv => conv.job.id === newMessage.job_id)) {
            if (newMessage.job_id === selectedJobId) {
              setSelectedMessages(prev => [...prev, newMessage])
            }
            // Oppdater conversations liste
            loadConversations()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversations, selectedJobId])

  const selectConversation = (jobId: string) => {
    setSelectedJobId(jobId)
    const conversation = conversations.find(conv => conv.job.id === jobId)
    if (conversation) {
      setSelectedMessages(conversation.messages)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedJobId || !currentUser) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          job_id: selectedJobId,
          sender_role: 'private_user',
          content: newMessage.trim(),
        })

      if (error) {
        console.error('Feil ved sending av melding:', error)
        alert(`Kunne ikke sende melding: ${error.message || 'Ukjent feil'}`)
        return
      }

      setNewMessage('')
      // Melding legges til via realtime
      
    } catch (error) {
      console.error('Feil ved sending av melding:', error)
      alert('Teknisk feil ved sending av melding')
    } finally {
      setSending(false)
    }
  }

  const selectedConversation = conversations.find(conv => conv.job.id === selectedJobId)

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
              <p className="text-slate-600 font-medium mt-2">Kommuniser med bedrifter om dine jobber og følg opp tilbud</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <User size={16} />
                  <span className="text-sm font-semibold">Privatportalen</span>
                </div>
              </div>
              <button
                onClick={loadConversations}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0009e2] hover:bg-blue-600 text-white text-sm font-semibold transition-all duration-200 shadow-lg"
              >
                <RotateCw size={16} />
                Oppdater
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-220px)]">
          {/* Samtale-liste */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Briefcase className="text-[#0009e2]" size={20} />
                  Mine jobber
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  {conversations.length} {conversations.length === 1 ? 'jobb' : 'jobber'}
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <Briefcase className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Ingen jobber enda</p>
                    <p className="text-sm text-slate-500">Opprett en jobb for å starte kommunikasjon</p>
                  </div>
                ) : (
                  <ul className="p-3 space-y-2">
                    {conversations.map(conv => (
                      <li
                        key={conv.job.id}
                        className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                          selectedJobId === conv.job.id 
                            ? 'bg-[#0009e2] text-white border-[#0009e2] shadow-lg' 
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => selectConversation(conv.job.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-sm">{conv.job.title}</div>
                          {conv.unread && (
                            <span className="bg-emerald-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">
                              NY
                            </span>
                          )}
                        </div>
                        <div className={`text-xs mb-2 ${selectedJobId === conv.job.id ? 'text-blue-100' : 'text-slate-600'}`}>
                          {conv.lastMessage}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`text-xs ${selectedJobId === conv.job.id ? 'text-blue-100' : 'text-slate-500'}`}>
                            {conv.messages.length > 0 
                              ? new Date(conv.lastMessageTime).toLocaleDateString('no-NO')
                              : 'Ingen aktivitet'
                            }
                          </div>
                          {conv.otherPartyMessages > 0 && (
                            <div className={`flex items-center gap-1 text-xs ${selectedJobId === conv.job.id ? 'text-blue-100' : 'text-slate-500'}`}>
                              <Building size={12} />
                              {conv.otherPartyMessages}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Hovedinnhold - Chat */}
          <div className="lg:col-span-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 h-full flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-6 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">{selectedConversation.job.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          Opprettet {new Date(selectedConversation.job.created_at).toLocaleDateString('no-NO')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedConversation.messages.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                            <span className="text-blue-700 text-sm font-semibold">
                              {selectedConversation.messages.length} meldinger
                            </span>
                          </div>
                        )}
                        {selectedConversation.otherPartyMessages > 0 && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                            <div className="flex items-center gap-2 text-emerald-700">
                              <Building size={16} />
                              <span className="text-sm font-semibold">
                                {selectedConversation.otherPartyMessages} fra bedrift
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Meldinger */}
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                    {selectedMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <MessageCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                          <h3 className="text-lg font-bold text-slate-800 mb-2">Ingen meldinger ennå</h3>
                          <p className="text-slate-600 font-medium mb-4">Start en samtale om denne jobben</p>
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                              <div className="text-sm text-blue-800">
                                <p className="font-semibold mb-1">Tips:</p>
                                <p>Bedrifter kan sende deg tilbud og meldinger når du har opprettet en jobb. Start gjerne samtalen selv!</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {selectedMessages.map(msg => {
                          const fromMe = msg.sender_role === 'private_user'
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
                                  <div className={`flex items-center gap-2 text-xs ${fromMe ? 'text-blue-100' : 'text-slate-500'}`}>
                                    {fromMe ? (
                                      <>
                                        <User size={12} />
                                        <span>Du</span>
                                      </>
                                    ) : (
                                      <>
                                        <Building size={12} />
                                        <span>Bedrift</span>
                                      </>
                                    )}
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
                    <form onSubmit={sendMessage} className="flex gap-3">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent font-medium"
                          placeholder="Skriv en melding til bedrifter..."
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
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-20 w-20 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Velg en jobb</h3>
                    <p className="text-slate-600 font-medium">Velg en jobb fra listen til venstre for å se meldinger</p>
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