'use client'

import { useState, useEffect, useMemo } from 'react'
import supabase from '@/lib/supabase/client'
import {
  FlagTriangleRight,
  Search,
  RotateCw,
  CheckCircle,
  X,
  AlertTriangle,
  MessageCircle,
  Ban as BanIcon,
  Eye,
  EyeOff,
  Clock,
  Briefcase,
  Users,
  TrendingUp,
  Filter,
  Trash2,
  Shield,
  Scan,
  Zap,
  Star,
} from 'lucide-react'
import AdminGuard from '@/components/AdminGuard'

type MessageRow = {
  id: string
  job_id: string
  topic?: string
  extension?: string
  payload?: any
  sender_role?: string
  content?: string
  event?: string
  private?: boolean
  created_at: string
  updated_at?: string
  inserted_at?: string
  flagged?: boolean
  flagged_reason?: string
  // Joined data
  job_title?: string
  job_user_email?: string
}

type ScanResult = {
  flagged: boolean
  reasons: string[]
  confidence: number
}

async function getAccessTokenOrWait(timeoutMs = 2000): Promise<string | null> {
  const { data: s0 } = await supabase.auth.getSession()
  const t0 = s0.session?.access_token
  if (t0) return t0

  return new Promise((resolve) => {
    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      resolve(null)
    }, timeoutMs)

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      if (done) return
      const { data: s1 } = await supabase.auth.getSession()
      const t1 = s1.session?.access_token ?? null
      if (t1) {
        done = true
        clearTimeout(timer)
        sub.subscription.unsubscribe()
        resolve(t1)
      }
    })
  })
}

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

// Avansert innholdsscanning med nordiske banneord og profanity
function scanMessageContent(content: string): ScanResult {
  const profanityWords = [
    // Norsk
    'faen', 'helvete', 'dritt', 'jævla', 'jævlig', 'satan', 'pokker', 'fy faen', 'fy fader',
    'horunge', 'fitte', 'kuk', 'rass', 'tiss', 'bæsj', 'piss', 'dritt', 'fæl', 'ekkel',
    'idiot', 'dust', 'tulling', 'taper', 'fetter', 'kjerring', 'ludder', 'hora',
    
    // Engelsk  
    'fuck', 'shit', 'damn', 'hell', 'crap', 'piss', 'ass', 'bitch', 'bastard',
    'whore', 'slut', 'cunt', 'dick', 'cock', 'pussy', 'tits', 'boobs', 'nigger',
    'faggot', 'retard', 'moron', 'stupid', 'idiot', 'asshole',
    
    // Svensk
    'fan', 'skit', 'helvete', 'jävla', 'jävlar', 'kuk', 'fitta', 'hora', 
    'rövhål', 'idiot', 'dum', 'piss', 'bajs', 'äckel', 'fula', 'mög',
    
    // Dansk
    'fanden', 'helvede', 'lort', 'pis', 'røv', 'fisse', 'pik', 'ludder',
    'idiot', 'dum', 'taber', 'skid', 'møg', 'satan', 'kraftedeme'
  ]
  
  const hateSpeechWords = [
    // Norsk hets og diskriminering
    'neger', 'svarting', 'homo', 'lesbe', 'transe', 'jøde', 'muslim', 'utlending',
    'innvandrer', 'pakis', 'polakk', 'russ', 'svenske', 'dansker',
    
    // Engelsk hate speech
    'nigger', 'kike', 'spic', 'chink', 'gook', 'towelhead', 'terrorist',
    'immigrant', 'wetback', 'paki', 'muzzie',
    
    // Svensk diskriminering  
    'blattar', 'svartskalle', 'bögar', 'jävla invandrare', 'muslim',
    
    // Dansk diskriminering
    'perker', 'neger', 'bøsse', 'immigrant'
  ]

  const threatWords = [
    // Norsk trusler
    'drep', 'drap', 'mord', 'vold', 'slå', 'banke', 'drepe', 'skade', 'tortur',
    'kidnap', 'true', 'trussel', 'hevn', 'straff', 'ødelegg', 'knuse',
    
    // Engelsk trusler
    'kill', 'murder', 'death', 'die', 'hurt', 'harm', 'beat', 'destroy',
    'violence', 'threat', 'revenge', 'punish', 'torture', 'kidnap',
    
    // Svensk trusler
    'döda', 'mörda', 'våld', 'skada', 'slå', 'hota', 'tortyr', 'kidnappar',
    
    // Dansk trusler  
    'dræb', 'mord', 'vold', 'skade', 'slå', 'true', 'tortur', 'kidnappe'
  ]

  const spamScamWords = [
    'gratis', 'free', 'vinn', 'win', 'winner', 'congrats', 'gratulerer',
    'click here', 'klikk her', 'urgent', 'hasteløs', 'limited time',
    'begrenset tid', 'claim now', 'hent nå', 'guarantee', 'garanti',
    'money back', 'penger tilbake', 'risk free', 'risikofritt',
    'inheritance', 'arv', 'lottery', 'lotteri', 'casino', 'gambling',
    'bitcoin', 'crypto', 'investment', 'investering', 'profit', 'profitt'
  ]
  
  const suspiciousPatterns = [
    /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, // Kredittkortnummer
    /\b\d{6}\s?\d{5}\b/, // Personnummer (norsk)  
    /\b\d{8}-\d{4}\b/, // Personnummer (svensk)
    /\b\d{6}-\d{4}\b/, // Personnummer (dansk)
    /(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[@#$%^&+=]).{8,}/, // Sterke passord
    /https?:\/\/[^\s]+\.tk|\.ml|\.ga|\.cf|\.ru/i, // Mistenkelige domener
    /\b(?:gratis|free|win|winner|vinn|gratulerer)\b.*\b(?:money|cash|prize|penger|premie|gevinst)\b/i,
    /\b(?:viagra|cialis|sex|porn|porno|casino|gambling)\b/i,
    /\b(?:click here|klikk her|download|last ned|install|installer)\b.*\b(?:now|nå|immediately|umiddelbart)\b/i
  ]

  const lowerContent = content.toLowerCase()
  const reasons: string[] = []
  let confidence = 0

  // Sjekk for profanity
  const profanityFound = profanityWords.filter(word => lowerContent.includes(word.toLowerCase()))
  if (profanityFound.length > 0) {
    reasons.push(`Banneord/profanity: ${profanityFound.slice(0, 3).join(', ')}${profanityFound.length > 3 ? '...' : ''}`)
    confidence += profanityFound.length * 0.2
  }

  // Sjekk for hatefulle ytringer
  const hateSpeechFound = hateSpeechWords.filter(word => lowerContent.includes(word.toLowerCase()))
  if (hateSpeechFound.length > 0) {
    reasons.push(`Diskriminerende språk: ${hateSpeechFound.slice(0, 2).join(', ')}${hateSpeechFound.length > 2 ? '...' : ''}`)
    confidence += hateSpeechFound.length * 0.6 // Høyere vekting for hate speech
  }

  // Sjekk for trusler
  const threatsFound = threatWords.filter(word => lowerContent.includes(word.toLowerCase()))
  if (threatsFound.length > 0) {
    reasons.push(`Potensielle trusler: ${threatsFound.slice(0, 2).join(', ')}${threatsFound.length > 2 ? '...' : ''}`)
    confidence += threatsFound.length * 0.7 // Høy vekting for trusler
  }

  // Sjekk for spam/svindel
  const spamFound = spamScamWords.filter(word => lowerContent.includes(word.toLowerCase()))
  if (spamFound.length > 0) {
    reasons.push(`Mulig spam/svindel: ${spamFound.slice(0, 2).join(', ')}${spamFound.length > 2 ? '...' : ''}`)
    confidence += spamFound.length * 0.3
  }

  // Sjekk for mistenkelige mønstre
  suspiciousPatterns.forEach((pattern, index) => {
    if (pattern.test(content)) {
      const patternReasons = [
        'Mulig kredittkortnummer',
        'Mulig norsk personnummer', 
        'Mulig svensk personnummer',
        'Mulig dansk personnummer',
        'Mulig passord deling',
        'Mistenkelig lenke',
        'Mulig spam/svindel mønster',
        'Seksuelt/gambling innhold',
        'Mistenkelig kall-til-handling'
      ]
      reasons.push(patternReasons[index] || 'Mistenkelig mønster')
      confidence += 0.4
    }
  })

  // Sjekk for eksessiv bruk av store bokstaver (mulig skriking)
  const upperCaseRatio = (content.match(/[A-ZÆØÅÄÖÉÈÀÜß]/g) || []).length / content.length
  if (upperCaseRatio > 0.6 && content.length > 15) {
    reasons.push('Eksessiv bruk av store bokstaver (mulig skriking/spam)')
    confidence += 0.2
  }

  // Sjekk for repeterende tekst (spam-indikator)
  const words = content.split(/\s+/)
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))
  if (words.length > 8 && uniqueWords.size / words.length < 0.4) {
    reasons.push('Repeterende tekst (mulig spam)')
    confidence += 0.3
  }

  // Sjekk for eksessiv punktum eller utropstegn
  const exclamationCount = (content.match(/[!]{2,}/g) || []).length
  const questionCount = (content.match(/[?]{2,}/g) || []).length
  if (exclamationCount > 0 || questionCount > 0) {
    reasons.push('Eksessiv bruk av tegnsetting')
    confidence += 0.15
  }

  return {
    flagged: confidence > 0.4, // Lavere terskel for nordisk innhold
    reasons,
    confidence: Math.min(confidence, 1)
  }
}

export default function MessagesAdmin() {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)
  const [filterFlagged, setFilterFlagged] = useState(false)
  
  const [selectedMessage, setSelectedMessage] = useState<MessageRow | null>(null)
  const [showMessageDetail, setShowMessageDetail] = useState(false)
  
  const [banModal, setBanModal] = useState<{
    open: boolean
    senderInfo: string | null
    reason: string
  }>({ open: false, senderInfo: null, reason: '' })

  useEffect(() => {
    let messagesChannel: any | null = null

    const load = async () => {
      setLoading(true)
      try {
        console.log('Starter henting av meldinger...')
        
        // Hent alle meldinger - prøv både content og message kolonner
        console.log('Henter meldinger...')
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('id,job_id,sender_role,content,created_at,flagged,flagged_reason')
          .order('created_at', { ascending: false })
          .limit(300)

        if (messagesError) {
          console.error('Feil ved henting av meldinger:', messagesError)
          throw new Error(`Messages query failed: ${messagesError.message || JSON.stringify(messagesError)}`)
        }
        console.log('Meldinger hentet:', messagesData?.length || 0)

        // Hent jobber for kontekst
        console.log('Henter jobber...')
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('id,title,user_id')

        if (jobsError) {
          console.error('Feil ved henting av jobber:', jobsError)
          console.warn('Kunne ikke hente jobber, fortsetter uten jobbinfo')
        }
        console.log('Jobber hentet:', jobsData?.length || 0)

        // Hent brukere for e-poster
        console.log('Henter brukere...')
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id,email,name')

        if (usersError) {
          console.error('Feil ved henting av brukere:', usersError)
          console.warn('Kunne ikke hente brukere, fortsetter uten brukerinfo')
        }
        console.log('Brukere hentet:', usersData?.length || 0)

        // Lag lookup maps (kun hvis data finnes)
        const jobsMap = new Map((jobsData || []).map(job => [job.id, job]))
        const usersMap = new Map((usersData || []).map(user => [user.id, user]))

        // Merge meldinger med jobbinformasjon
        const enrichedMessages = (messagesData || []).map((msg: any) => {
          const jobInfo = jobsMap.get(msg.job_id)
          const userInfo = jobInfo ? usersMap.get(jobInfo.user_id) : null
          return {
            ...msg,
            job_title: jobInfo?.title || 'Ukjent jobb',
            job_user_email: userInfo?.email || 'Ukjent bruker',
          }
        }) as MessageRow[]

        console.log('Behandlede meldinger:', enrichedMessages.length)
        setMessages(enrichedMessages)
        setMessage(null)
      } catch (e: any) {
        console.error('Feil ved henting av meldinger:', e)
        showMessage('error', e?.message || 'Kunne ikke hente meldinger')
        setMessages([])
      }

      // Real-time oppdateringer
      messagesChannel = supabase
        .channel('admin-messages-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
          console.log('Realtime melding mottatt:', payload)
          setMessages((prev) => {
            const rec = (payload.new || payload.old) as MessageRow
            if (payload.eventType === 'INSERT') {
              return [payload.new as MessageRow, ...prev]
            }
            if (payload.eventType === 'UPDATE') {
              return prev.map((m) => (m.id === rec.id ? (payload.new as MessageRow) : m))
            }
            if (payload.eventType === 'DELETE') {
              return prev.filter((m) => m.id !== rec.id)
            }
            return prev
          })
        })
        .subscribe()

      setLoading(false)
    }

    load()

    return () => {
      if (messagesChannel) supabase.removeChannel(messagesChannel)
    }
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id,job_id,sender_role,content,created_at,flagged,flagged_reason')
        .order('created_at', { ascending: false })
        .limit(300)

      if (messagesError) throw messagesError

      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('id,title,user_id')

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id,email,name')

      const jobsMap = new Map((jobsData || []).map(job => [job.id, job]))
      const usersMap = new Map((usersData || []).map(user => [user.id, user]))

      const enrichedMessages = (messagesData || []).map((msg: any) => {
        const jobInfo = jobsMap.get(msg.job_id)
        const userInfo = jobInfo ? usersMap.get(jobInfo.user_id) : null
        return {
          ...msg,
          job_title: jobInfo?.title || 'Ukjent jobb',
          job_user_email: userInfo?.email || 'Ukjent bruker',
        }
      }) as MessageRow[]

      setMessages(enrichedMessages)
      setMessage(null)
    } catch (e: any) {
      showMessage('error', e?.message || 'Kunne ikke oppdatere meldinger')
    }
    
    setRefreshing(false)
  }

  const scanAllMessages = async () => {
    setScanning(true)
    try {
      let scannedCount = 0
      let flaggedCount = 0
      const flaggedCategories: { [key: string]: number } = {}

      for (const msg of messages) {
        const content = msg.content || ''
        if (!content.trim()) continue

        const scanResult = scanMessageContent(content)
        
        if (scanResult.flagged) {
          // Kategoriser flaggede årsaker for statistikk
          scanResult.reasons.forEach(reason => {
            const category = reason.split(':')[0]
            flaggedCategories[category] = (flaggedCategories[category] || 0) + 1
          })

          // Oppdater meldingen i databasen hvis den er flagget
          const { error } = await supabase
            .from('messages')
            .update({ 
              flagged: true, 
              flagged_reason: scanResult.reasons.join('; ') 
            })
            .eq('id', msg.id)

          if (!error) {
            flaggedCount++
            // Oppdater lokal state
            setMessages(prev => prev.map(m => 
              m.id === msg.id 
                ? { ...m, flagged: true, flagged_reason: scanResult.reasons.join('; ') }
                : m
            ))
          }
        }
        scannedCount++
        
        // Lite delay for å unngå å overbelaste systemet
        if (scannedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Vis resultat i banner i stedet for alert
      showMessage('success', `Skanning fullført: ${scannedCount} meldinger skannet, ${flaggedCount} flagget`)
      
    } catch (e: any) {
      showMessage('error', 'Feil ved skanning: ' + (e?.message || 'ukjent feil'))
    } finally {
      setScanning(false)
    }
  }

  const deleteMessage = async (messageId: string) => {
    setUpdating(messageId)
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)

      if (error) throw error

      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      showMessage('success', 'Melding slettet')
      closeMessageDetail()
    } catch (e: any) {
      showMessage('error', 'Feil ved sletting: ' + (e?.message || 'ukjent'))
    } finally {
      setUpdating(null)
    }
  }

  const flagMessage = async (messageId: string, reason: string) => {
    setUpdating(messageId)
    try {
      const { error } = await supabase
        .from('messages')
        .update({ flagged: true, flagged_reason: reason })
        .eq('id', messageId)

      if (error) throw error

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, flagged: true, flagged_reason: reason }
          : msg
      ))
      showMessage('success', 'Melding flagget')
    } catch (e: any) {
      showMessage('error', 'Feil ved flagging: ' + (e?.message || 'ukjent'))
    } finally {
      setUpdating(null)
    }
  }

  const unflagMessage = async (messageId: string) => {
    setUpdating(messageId)
    try {
      const { error } = await supabase
        .from('messages')
        .update({ flagged: false, flagged_reason: null })
        .eq('id', messageId)

      if (error) throw error

      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, flagged: false, flagged_reason: undefined }
          : msg
      ))
      showMessage('success', 'Flagging fjernet')
    } catch (e: any) {
      showMessage('error', 'Feil ved fjerning av flagging: ' + (e?.message || 'ukjent'))
    } finally {
      setUpdating(null)
    }
  }

  const openBanModal = (senderRole: string) => {
    const senderInfo = senderRole || 'Ukjent avsender'
    setBanModal({ open: true, senderInfo, reason: '' })
  }

  const submitBan = async () => {
    if (!banModal.senderInfo) return
    
    try {
      showMessage('success', `Varsel om ${banModal.senderInfo} registrert`)
      setBanModal({ open: false, senderInfo: null, reason: '' })
    } catch (e: any) {
      showMessage('error', e?.message || 'Feil ved varsling')
    }
  }

  const openMessageDetail = (msg: MessageRow) => {
    setSelectedMessage(msg)
    setShowMessageDetail(true)
  }

  const closeMessageDetail = () => {
    setSelectedMessage(null)
    setShowMessageDetail(false)
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const getMessageContent = (msg: MessageRow): string => {
    return msg.content || 'Tom melding'
  }

  const getSenderInfo = (msg: MessageRow): string => {
    if (msg.sender_role) return msg.sender_role
    return 'Ukjent avsender'
  }

  const stats = useMemo(() => {
    const total = messages.length
    const flagged = messages.filter(m => m.flagged).length
    const today = new Date().toDateString()
    const todayCount = messages.filter(m => new Date(m.created_at).toDateString() === today).length
    const last7Days = messages.filter(m => new Date(m.created_at) >= new Date(Date.now() - 7*24*60*60*1000)).length
    
    const uniqueRoles = new Set(messages.map(m => m.sender_role || 'ukjent')).size
    const uniqueJobs = new Set(messages.map(m => m.job_id)).size

    return { total, flagged, todayCount, last7Days, uniqueRoles, uniqueJobs }
  }, [messages])

  const filteredMessages = useMemo(() => {
    let filtered = messages

    if (filterFlagged) {
      filtered = filtered.filter(msg => msg.flagged)
    }

    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((msg) => {
        const content = getMessageContent(msg).toLowerCase()
        const senderInfo = getSenderInfo(msg).toLowerCase()
        const jobTitle = (msg.job_title || '').toLowerCase()
        const jobUserEmail = (msg.job_user_email || '').toLowerCase()
        
        return content.includes(q) || senderInfo.includes(q) || jobTitle.includes(q) || jobUserEmail.includes(q)
      })
    }

    return filtered
  }, [messages, debouncedSearch, filterFlagged])

  if (loading) {
    return (
      <AdminGuard>
        <div 
          className="min-h-screen bg-gradient-to-br from-blue-400/50 via-blue-500/40 via-slate-50 to-slate-100 flex items-center justify-center"
          style={{
            backgroundImage: `
              linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
              linear-gradient(rgba(148, 163, 184, 0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(148, 163, 184, 0.035) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px, 60px 60px, 20px 20px, 20px 20px',
            backgroundPosition: '0 0, 0 0, 0 0, 0 0'
          }}
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0009e2] mx-auto mb-4"></div>
            </div>
            <p className="text-slate-600 font-medium text-center">Laster meldinger…</p>
          </div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div 
        className="min-h-screen bg-gradient-to-br from-blue-400/50 via-blue-500/40 via-slate-50 to-slate-100"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
            linear-gradient(rgba(148, 163, 184, 0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.035) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px, 60px 60px, 20px 20px, 20px 20px',
          backgroundPosition: '0 0, 0 0, 0 0, 0 0'
        }}
      >
        <div className="w-full max-w-none mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Meldingsmoderering</h1>
                <p className="text-slate-600 font-medium mt-2">Administrer og moderer meldinger fra jobbchatter og kommunikasjon</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={scanAllMessages}
                  disabled={scanning}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  title="Skann alle meldinger for problematisk innhold"
                >
                  <Scan className={scanning ? 'animate-pulse' : ''} size={18} />
                  {scanning ? 'Skanner…' : 'Skann moderering'}
                </button>
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0009e2] hover:bg-blue-600 text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  title="Oppdater alle meldinger"
                >
                  <RotateCw className={refreshing ? 'animate-spin' : ''} size={18} />
                  {refreshing ? 'Oppdaterer…' : 'Oppdater'}
                </button>
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`mb-6 p-5 rounded-xl border flex items-center gap-3 shadow-xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200 ${
                message.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
              <span className="font-semibold">{message.text}</span>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
            <StatsCard
              icon={<MessageCircle className="h-6 w-6" />}
              label="Totalt"
              value={stats.total}
              color="default"
            />
            <StatsCard
              icon={<FlagTriangleRight className="h-6 w-6" />}
              label="Flagget"
              value={stats.flagged}
              color="warning"
            />
            <StatsCard
              icon={<Clock className="h-6 w-6" />}
              label="I dag"
              value={stats.todayCount}
              color="info"
            />
            <StatsCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="Siste 7 dager"
              value={stats.last7Days}
              color="success"
            />
            <StatsCard
              icon={<Users className="h-6 w-6" />}
              label="Ulike avsendere"
              value={stats.uniqueRoles}
              color="info"
            />
            <StatsCard
              icon={<Briefcase className="h-6 w-6" />}
              label="Aktive jobber"
              value={stats.uniqueJobs}
              color="success"
            />
          </div>

          {/* Search and Filter */}
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søk etter innhold, avsender, jobbtittel eller e-post…"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent font-medium"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={filterFlagged}
                  onChange={(e) => setFilterFlagged(e.target.checked)}
                  className="rounded border-slate-300 text-[#0009e2] focus:ring-[#0009e2]"
                />
                <FlagTriangleRight size={16} className="text-amber-600" />
                <span className="text-sm font-semibold text-slate-700">Kun flaggede</span>
              </label>
            </div>
          </div>

          {/* Messages Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Jobbchatter ({filteredMessages.length})
                  </h2>
                  {debouncedSearch && (
                    <p className="text-sm text-slate-600 mt-1 font-medium">Søk: "{debouncedSearch}"</p>
                  )}
                  {filterFlagged && (
                    <p className="text-sm text-amber-600 mt-1 font-medium">Viser kun flaggede meldinger</p>
                  )}
                </div>
                <div className="text-sm text-slate-600 font-medium">
                  Siste oppdatering: {new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {filteredMessages.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <MessageCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Ingen meldinger funnet</h3>
                <p className="text-slate-600 font-medium">
                  {messages.length === 0 ? 'Ingen meldinger i systemet enda.' : 'Prøv å justere søkekriteriene.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50/80">
                    <tr className="border-b border-slate-200">
                      <Th>Status</Th>
                      <Th>Innhold</Th>
                      <Th>Avsender</Th>
                      <Th>Jobb</Th>
                      <Th>Tidspunkt</Th>
                      <Th>Handlinger</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMessages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-slate-50/50 transition-colors">
                        <Td>
                          {msg.flagged ? (
                            <div className="flex items-center gap-2">
                              <FlagTriangleRight className="text-red-600" size={20} />
                              <div>
                                <div className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded border border-red-200">
                                  FLAGGET
                                </div>
                                {msg.flagged_reason && (
                                  <div className="text-xs text-slate-600 mt-1" title={msg.flagged_reason}>
                                    {msg.flagged_reason.length > 30 ? msg.flagged_reason.slice(0, 30) + '…' : msg.flagged_reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="text-emerald-600" size={20} />
                              <div className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded border border-emerald-200">
                                OK
                              </div>
                            </div>
                          )}
                        </Td>

                        <Td>
                          <div className="max-w-md">
                            <p className="text-sm text-slate-900 truncate font-medium" title={getMessageContent(msg)}>
                              {getMessageContent(msg).length > 120 ? getMessageContent(msg).slice(0, 120) + '…' : getMessageContent(msg)}
                            </p>
                            <button
                              onClick={() => openMessageDetail(msg)}
                              className="text-xs text-[#0009e2] hover:underline mt-1 flex items-center gap-1 font-semibold"
                            >
                              <Eye size={12} /> Se hele melding
                            </button>
                          </div>
                        </Td>

                        <Td>
                          <div className="text-sm font-semibold text-slate-900">
                            {getSenderInfo(msg)}
                          </div>
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <Briefcase className="text-slate-400" size={16} />
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {msg.job_title || <span className="italic text-slate-500">Ukjent jobb</span>}
                              </div>
                              {msg.job_user_email && (
                                <div className="text-xs text-slate-600 font-medium">{msg.job_user_email}</div>
                              )}
                            </div>
                          </div>
                        </Td>

                        <Td>
                          <span className="text-sm text-slate-600 font-medium">
                            {new Date(msg.created_at).toLocaleDateString('no-NO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            {new Date(msg.created_at).toLocaleTimeString('no-NO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            {msg.flagged ? (
                              <button
                                onClick={() => unflagMessage(msg.id)}
                                disabled={updating === msg.id}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                                title="Fjern flagg"
                              >
                                <CheckCircle size={16} />
                                Fjern flagg
                              </button>
                            ) : (
                              <button
                                onClick={() => flagMessage(msg.id, 'Manuelt flagget av admin')}
                                disabled={updating === msg.id}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                                title="Flagg melding"
                              >
                                <FlagTriangleRight size={16} />
                                Flagg
                              </button>
                            )}

                            <button
                              onClick={() => deleteMessage(msg.id)}
                              disabled={updating === msg.id}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                              title="Slett melding"
                            >
                              <Trash2 size={16} />
                              Slett
                            </button>

                            <button
                              onClick={() => openBanModal(msg.sender_role || '')}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-purple-600 hover:bg-purple-700 font-semibold transition-all duration-200 shadow-lg"
                              title="Varsle om avsender"
                            >
                              <Shield size={16} />
                              Varsle
                            </button>

                            {updating === msg.id && (
                              <div className="inline-flex items-center justify-center ml-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0009e2]"></div>
                              </div>
                            )}
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Message Detail Modal */}
        {showMessageDetail && selectedMessage && (
          <MessageDetailModal 
            message={selectedMessage} 
            onClose={closeMessageDetail}
            onDelete={() => deleteMessage(selectedMessage.id)}
            onFlag={() => flagMessage(selectedMessage.id, 'Manuelt flagget av admin')}
            onUnflag={() => unflagMessage(selectedMessage.id)}
            onWarn={() => openBanModal(selectedMessage.sender_role || '')}
            isUpdating={updating === selectedMessage.id}
          />
        )}

        {/* Ban Modal */}
        {banModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-3">
                <Shield size={24} />
                Varsle om avsender
              </h3>
              <p className="text-sm text-slate-600 font-medium mb-6">
                Registrer varsel om avsender: <strong>{banModal.senderInfo}</strong>. Dette kan brukes for oppfølging.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-600 mb-2">Årsak (valgfritt)</label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                  rows={3}
                  placeholder="Skriv en kort begrunnelse…"
                  value={banModal.reason}
                  onChange={(e) => setBanModal(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                  onClick={() => setBanModal({ open: false, senderInfo: null, reason: '' })}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl text-white bg-red-600 hover:bg-red-700 font-semibold transition-all duration-200 shadow-lg"
                  onClick={submitBan}
                >
                  Registrer varsel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  )
}

function StatsCard({ 
  icon, 
  label, 
  value, 
  color = 'default' 
}: { 
  icon: React.ReactNode
  label: string
  value: number
  color?: 'default' | 'success' | 'info' | 'danger' | 'warning'
}) {
  const colorClasses = {
    default: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    success: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    info: 'bg-blue-100 text-blue-600 border-blue-200',
    danger: 'bg-red-100 text-red-600 border-red-200',
    warning: 'bg-amber-100 text-amber-600 border-amber-200',
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{value.toLocaleString('no-NO')}</p>
        </div>
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function MessageDetailModal({ 
  message, 
  onClose, 
  onDelete, 
  onFlag,
  onUnflag,
  onWarn, 
  isUpdating 
}: { 
  message: MessageRow
  onClose: () => void
  onDelete: () => void
  onFlag: () => void
  onUnflag: () => void
  onWarn: () => void
  isUpdating: boolean
}) {
  const content = message.content || 'Tom melding'
  const senderInfo = message.sender_role || 'Ukjent avsender'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <MessageCircle size={24} />
              Meldingsdetaljer
              {message.flagged && <FlagTriangleRight className="text-red-600" size={20} />}
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm font-semibold text-slate-600">
                Avsender: {senderInfo}
              </span>
              {message.flagged && (
                <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded border border-red-200">
                  FLAGGET
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-3 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            title="Lukk"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Message Content */}
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-3">Innhold</h4>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">{content}</p>
              </div>
            </div>

            {/* Flagging Information */}
            {message.flagged && message.flagged_reason && (
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <FlagTriangleRight className="text-red-600" size={20} />
                  Flagg årsak
                </h4>
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-red-800 font-medium">{message.flagged_reason}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Jobb informasjon</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Briefcase className="text-slate-400" size={16} />
                    <span className="text-sm font-semibold text-slate-600">Tittel:</span>
                    <span className="text-sm text-slate-800 font-medium">{message.job_title || 'Ukjent'}</span>
                  </div>
                  {message.job_user_email && (
                    <div className="flex items-center gap-3">
                      <Users className="text-slate-400" size={16} />
                      <span className="text-sm font-semibold text-slate-600">Jobb eier:</span>
                      <span className="text-sm text-slate-800 font-medium">{message.job_user_email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Tidsinformasjon</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Clock className="text-slate-400" size={16} />
                    <span className="text-sm font-semibold text-slate-600">Sendt:</span>
                    <span className="text-sm text-slate-800 font-medium">
                      {new Date(message.created_at).toLocaleString('no-NO')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50/80">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            >
              Lukk
            </button>
            <div className="flex items-center gap-3">
              {message.flagged ? (
                <button
                  onClick={onUnflag}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  Fjern flagg
                </button>
              ) : (
                <button
                  onClick={onFlag}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-all duration-200 shadow-lg disabled:opacity-50"
                >
                  <FlagTriangleRight size={18} />
                  Flagg melding
                </button>
              )}
              <button
                onClick={onWarn}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all duration-200 shadow-lg"
              >
                <Shield size={18} />
                Varsle avsender
              </button>
              <button
                onClick={onDelete}
                disabled={isUpdating}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
              >
                <Trash2 size={18} />
                Slett melding
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
      {children}
    </th>
  )
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-4">{children}</td>
}