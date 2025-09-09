'use client'

import { useEffect, useMemo, useState } from 'react'
import supabase from '@/lib/supabase/client'
import {
  Users,
  User as UserIcon,
  Building,
  Shield,
  RefreshCw,
  ArrowUpRight,
  Briefcase,
  Ban as BanIcon,
  Lock,
  FlagTriangleRight,
  Search,
  X,
  CheckCircle,
  Receipt,
  Activity,
  Database,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import AdminGuard from '@/components/AdminGuard'

type AppUser = {
  id: string
  email: string
  name: string | null
  role: 'private' | 'business' | 'admin'
  created_at: string
  banned?: boolean | null
  business_access_revoked?: boolean | null
}

type JobRow = {
  id: string
  title: string | null
  status: 'pending' | 'approved' | 'rejected' | 'archived'
  created_at: string
  user_id: string | null
  category?: string | null
}

type MessageRow = {
  id: string
  content: string
  created_at: string
  from_user_id: string | null
  to_user_id: string | null
  flagged?: boolean | null
  reason?: string | null
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

// Kopierer skanne-logikken fra messages siden
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

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [users, setUsers] = useState<AppUser[]>([])
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notAuthed, setNotAuthed] = useState(false)

  const [bannedOpen, setBannedOpen] = useState(false)
  const [bannedSearch, setBannedSearch] = useState('')
  const [unbanningId, setUnbanningId] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [rescanning, setRescanning] = useState(false)

  useEffect(() => {
    let jobsChannel: any | null = null
    let messagesChannel: any | null = null

    const load = async () => {
      setLoading(true)
      setError(null)
      setNotAuthed(false)

      const token = await getAccessTokenOrWait()
      if (!token) {
        setNotAuthed(true)
        setUsers([])
        setJobs([])
        setMessages([])
        setError('Ikke autoriseret')
        setLoading(false)
        return
      }

      const [
        userResponse,
        { data: jobData, error: jErr },
        { data: msgData, error: mErr },
      ] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
        supabase
          .from('jobs')
          .select('id,title,status,created_at,user_id,category')
          .order('created_at', { ascending: false }),
        supabase
          .from('messages')
          .select('id,content,created_at,from_user_id,to_user_id,flagged,reason')
          .eq('flagged', true)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      if (userResponse.status === 401 || userResponse.status === 403) {
        setNotAuthed(true)
        setUsers([])
        setError('Ikke autoriseret')
      } else {
        const userJson = await userResponse.json()
        if (!userResponse.ok) {
          setError(userJson?.error || 'Kunne ikke hente brukere')
          setUsers([])
        } else {
          setUsers(userJson.users || [])
        }
      }

      if (jErr) {
        setError((prev) => prev ?? 'Kunne ikke hente jobber')
        setJobs([])
      } else {
        setJobs((jobData || []) as JobRow[])
      }

      if (mErr) {
        setMessages([])
      } else {
        setMessages((msgData || []) as MessageRow[])
      }

      jobsChannel = supabase
        .channel('admin-jobs-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload) => {
          setJobs((prev) => {
            if (payload.eventType === 'INSERT') return [payload.new as JobRow, ...prev]
            if (payload.eventType === 'UPDATE')
              return prev.map((j) => (j.id === (payload.new as JobRow).id ? (payload.new as JobRow) : j))
            if (payload.eventType === 'DELETE')
              return prev.filter((j) => j.id !== (payload.old as JobRow).id)
            return prev
          })
        })
        .subscribe()

      messagesChannel = supabase
        .channel('admin-messages-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => {
            setMessages((prev) => {
              const rec = (payload.new || payload.old) as MessageRow
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                if (rec.flagged) {
                  const updated = [payload.new as MessageRow, ...prev.filter((m) => m.id !== rec.id)]
                  return updated.slice(0, 20)
                } else {
                  return prev.filter((m) => m.id !== rec.id)
                }
              }
              if (payload.eventType === 'DELETE') {
                return prev.filter((m) => m.id !== rec.id)
              }
              return prev
            })
          }
        )
        .subscribe()

      setLoading(false)
    }

    load()

    return () => {
      if (jobsChannel) supabase.removeChannel(jobsChannel)
      if (messagesChannel) supabase.removeChannel(messagesChannel)
    }
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    setError(null)
    setNotAuthed(false)

    const token = await getAccessTokenOrWait()
    if (!token) {
      setNotAuthed(true)
      setUsers([])
      setJobs([])
      setMessages([])
      setError('Ikke autoriseret')
      setRefreshing(false)
      return
    }

    const [
      userResponse,
      { data: jobData, error: jErr },
      { data: msgData, error: mErr },
    ] = await Promise.all([
      fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }),
      supabase
        .from('jobs')
        .select('id,title,status,created_at,user_id,category')
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('id,content,content,created_at,from_user_id,to_user_id,flagged,reason')
        .eq('flagged', true)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (userResponse.status === 401 || userResponse.status === 403) {
      setNotAuthed(true)
      setUsers([])
      setError('Ikke autoriseret')
    } else {
      const userJson = await userResponse.json()
      if (!userResponse.ok) {
        setError(userJson?.error || 'Kunne ikke hente brukere')
        setUsers([])
      } else {
        setUsers(userJson.users || [])
      }
    }

    if (jErr) {
      setError((prev) => prev ?? 'Kunne ikke hente jobber')
      setJobs([])
    } else {
      setJobs((jobData || []) as JobRow[])
    }

    if (mErr) {
      setMessages([])
    } else {
      setMessages((msgData || []) as MessageRow[])
    }

    setRefreshing(false)
  }

  const stats = useMemo(() => {
    const total = users.length
    const privateUsers = users.filter((u) => u.role === 'private').length
    const businessUsers = users.filter((u) => u.role === 'business').length
    const adminUsers = users.filter((u) => u.role === 'admin').length
    const bannedCount = users.filter((u) => !!u.banned).length
    const revokedBusinessAccess = users.filter((u) => u.role === 'business' && !!u.business_access_revoked).length

    const now = new Date()
    const daysAgo = (n: number) => {
      const d = new Date(now)
      d.setDate(d.getDate() - n)
      return d
    }

    const last7 = users.filter((u) => new Date(u.created_at) >= daysAgo(7)).length
    const last30 = users.filter((u) => new Date(u.created_at) >= daysAgo(30)).length

    const pendingJobs = jobs.filter((j) => j.status === 'pending').length
    const approvedLast7 = jobs.filter((j) => j.status === 'approved' && new Date(j.created_at) >= daysAgo(7)).length

    const flaggedMessages = messages.length

    return {
      total,
      privateUsers,
      businessUsers,
      adminUsers,
      last7,
      last30,
      pendingJobs,
      approvedLast7,
      bannedCount,
      revokedBusinessAccess,
      flaggedMessages,
    }
  }, [users, jobs, messages])

  const growthData = useMemo(() => {
    const days: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' })
      const count = users.filter((u) => new Date(u.created_at).toDateString() === d.toDateString()).length
      days.push({ date: label, count })
    }
    return days
  }, [users])

  const bannedUsers = useMemo(
    () =>
      users
        .filter((u) => !!u.banned)
        .filter((u) => {
          const q = bannedSearch.trim().toLowerCase()
          if (!q) return true
          const name = (u.name || '').toLowerCase()
          const email = (u.email || '').toLowerCase()
          return name.includes(q) || email.includes(q)
        }),
    [users, bannedSearch]
  )

  const unbanUser = async (userId: string) => {
    setUnbanningId(userId)
    try {
      const token = await getAccessTokenOrWait()
      if (!token) throw new Error('Ikke autoriseret')

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, unban: true }),
      })

      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || 'Kunne ikke fjerne ban')

      if (json?.user) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? (json.user as AppUser) : u)))
      } else {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, banned: false } : u)))
      }
      setBanner({ type: 'success', text: 'Ban fjernet.' })
    } catch (e: any) {
      setBanner({ type: 'error', text: e?.message || 'Feil ved unban' })
    } finally {
      setUnbanningId(null)
      setTimeout(() => setBanner(null), 4000)
    }
  }

  const triggerModerationScan = async () => {
    setRescanning(true)
    try {
      // Hent alle meldinger og skann dem lokalt
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id,content')
        .order('created_at', { ascending: false })
        .limit(300)

      if (messagesError) {
        throw new Error('Kunne ikke hente meldinger for skanning')
      }

      let scannedCount = 0
      let flaggedCount = 0
      const flaggedCategories: { [key: string]: number } = {}

      for (const msg of messagesData || []) {
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
          }
        }
        scannedCount++
        
        // Lite delay for å unngå å overbelaste systemet
        if (scannedCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      setBanner({ 
        type: 'success', 
        text: `Skanning fullført: ${scannedCount} meldinger skannet, ${flaggedCount} flagget`
      })
      
      // Oppdater data
      await handleRefresh()
      
    } catch (e: any) {
      setBanner({ 
        type: 'error', 
        text: 'Feil ved skanning: ' + (e?.message || 'ukjent feil')
      })
    } finally {
      setRescanning(false)
      setTimeout(() => setBanner(null), 5000)
    }
  }

  const currentTime = new Date().toLocaleString('no-NO', {
    timeZone: 'Europe/Oslo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

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
        {/* Admin Header */}
        <div className="bg-gradient-to-b from-blue-500/20 via-blue-600/10 to-transparent shadow-lg">
          <div className="w-full px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg text-slate-700 font-medium">{currentTime}</p>
              </div>
              <div>
                <p className="text-xl text-[#0009e2] font-semibold">Administrasjonspanel</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-3 px-4 py-2 bg-green-100/80 rounded-lg border border-green-300/50">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">System Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Action Bar */}
          <div className="mb-8 flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setBannedOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 hover:text-red-800 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-lg"
                title="Vis bannede brukere"
              >
                <BanIcon size={18} />
                Bannede brukere ({stats.bannedCount})
              </button>
              <button
                onClick={triggerModerationScan}
                disabled={rescanning}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 hover:text-purple-800 text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-lg"
                title="Kjør moderering skann"
              >
                <FlagTriangleRight className={rescanning ? 'animate-spin' : ''} size={18} />
                {rescanning ? 'Skanner…' : 'Skann moderering'}
              </button>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0009e2] hover:bg-blue-600 text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              disabled={refreshing}
              title="Oppdater alle data"
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
              {refreshing ? 'Oppdaterer…' : 'Oppdater data'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-5 rounded-xl bg-red-50 border border-red-200 text-red-800 shadow-xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} />
                <span className="font-semibold">Feil:</span>
                {error}
              </div>
            </div>
          )}
          
          {banner && (
            <div
              className={`mb-6 p-5 rounded-xl border flex items-center gap-3 shadow-xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200 ${
                banner.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {banner.type === 'success' ? <CheckCircle size={18} /> : <X size={18} />}
              <span className="text-sm font-semibold">{banner.text}</span>
            </div>
          )}

          {/* System Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatusCard
              title="Database Status"
              value="Operativ"
              icon={<Database className="h-6 w-6" />}
              description="Alle tabeller tilgjengelig"
            />
            <StatusCard
              title="Aktive Sesjoner"
              value={`${stats.adminUsers + stats.businessUsers}`}
              icon={<Activity className="h-6 w-6" />}
              description="Brukere online"
            />
            <StatusCard
              title="Systemoppetid"
              value="99.9%"
              icon={<TrendingUp className="h-6 w-6" />}
              description="Siste 30 dager"
            />
            <StatusCard
              title="Siste Backup"
              value={new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
              icon={<Clock className="h-6 w-6" />}
              description="Automatisk sikkerhetskopi"
            />
          </div>

          {/* Main KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <AdminKpiCard
              title="Totalt antall brukere"
              value={stats.total}
              change="+12% denne måneden"
              changePositive={true}
              icon={<Users className="h-6 w-6" />}
            />
            <AdminKpiCard
              title="Privatpersoner"
              value={stats.privateUsers}
              change={`${stats.last7} siste 7 dager`}
              changePositive={true}
              icon={<UserIcon className="h-6 w-6" />}
            />
            <AdminKpiCard
              title="Bedrifter"
              value={stats.businessUsers}
              change={`${((stats.businessUsers / stats.total) * 100).toFixed(1)}% av total`}
              changePositive={true}
              icon={<Building className="h-6 w-6" />}
            />
            <AdminKpiCard
              title="Administratorer"
              value={stats.adminUsers}
              change="Systemadministratorer"
              changePositive={true}
              icon={<Shield className="h-6 w-6" />}
            />
            <AdminKpiCard
              title="Ventende jobber"
              value={stats.pendingJobs}
              change={stats.pendingJobs > 10 ? "Høy aktivitet" : "Normal aktivitet"}
              changePositive={stats.pendingJobs <= 10}
              icon={<Briefcase className="h-6 w-6" />}
            />
          </div>

          {/* Alert Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <AlertCard
              title="Sikkerhetsvarsler"
              count={stats.bannedCount}
              type="danger"
              description="Bannede kontoer som krever oppfølging"
              icon={<BanIcon className="h-6 w-6" />}
              actionText="Administrer bannede"
              onAction={() => setBannedOpen(true)}
            />
            <AlertCard
              title="Bedriftstilgang"
              count={stats.revokedBusinessAccess}
              type="warning"
              description="Bedrifter med stengt tilgang"
              icon={<Lock className="h-6 w-6" />}
              actionText="Se tilganger"
              onAction={() => {}}
            />
            <AlertCard
              title="Moderering"
              count={stats.flaggedMessages}
              type="info"
              description="Meldinger som venter på moderering"
              icon={<FlagTriangleRight className="h-6 w-6" />}
              actionText="Moderer innhold"
              onAction={() => window.location.href = '/admin/messages'}
            />
          </div>

          {/* Brukervekst Graf */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 mb-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <TrendingUp size={24} />
                Brukervekst (30 dager)
              </h2>
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                  <span className="text-slate-600 font-medium">Daglige registreringer</span>
                </div>
                <div className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-semibold">
                  +{stats.last7} denne uken
                </div>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0009e2" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    allowDecimals={false} 
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      color: '#1e293b',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                    labelStyle={{ color: '#374151', fontWeight: '600' }}
                    formatter={(value: any) => [`${value} nye brukere`, 'Registreringer']}
                    labelFormatter={(label: string) => `Dato: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="url(#colorGradient)"
                    strokeWidth={3}
                    dot={{ 
                      fill: '#0009e2', 
                      strokeWidth: 3, 
                      r: 5,
                      stroke: '#ffffff'
                    }}
                    activeDot={{ 
                      r: 7, 
                      fill: '#0009e2',
                      strokeWidth: 3,
                      stroke: '#ffffff'
                    }}
                    fill="url(#colorGradient)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-6">
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-2xl font-bold text-slate-800">{stats.last7}</p>
                <p className="text-sm text-slate-600 font-medium">Siste 7 dager</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-2xl font-bold text-slate-800">{stats.last30}</p>
                <p className="text-sm text-slate-600 font-medium">Siste 30 dager</p>
              </div>
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-2xl font-bold text-slate-800">{((stats.last30 / 30) * 7).toFixed(1)}</p>
                <p className="text-sm text-slate-600 font-medium">Ukentlig snitt</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <QuickActionCard
              href="/admin/users"
              title="Brukerhåndtering"
              description="Administrer brukere, roller, bann og bedriftstilgang."
              icon={<Users className="h-6 w-6" />}
              color="blue"
            />
            <QuickActionCard
              href="/admin/jobs"
              title="Jobbmoderering"
              description="Godkjenn/avvis jobber og håndter innhold."
              icon={<Briefcase className="h-6 w-6" />}
              color="green"
            />
            <QuickActionCard
              href="/admin/faktura"
              title="Fakturaadministrasjon"
              description="Håndter fakturer, betalinger og påminnelser."
              icon={<Receipt className="h-6 w-6" />}
              color="purple"
            />
          </div>
        </div>

        {/* Banned Users Modal */}
        {bannedOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-5xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-200">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <BanIcon className="text-red-600" size={26} />
                  <h3 className="text-2xl font-bold text-slate-800">Bannede brukere</h3>
                </div>
                <button
                  onClick={() => setBannedOpen(false)}
                  className="rounded-xl p-3 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                  title="Lukk"
                >
                  <X size={22} />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-8">
                <div className="relative w-full">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={bannedSearch}
                    onChange={(e) => setBannedSearch(e.target.value)}
                    placeholder="Søk e-post eller navn…"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                  />
                </div>
              </div>

              {bannedUsers.length === 0 ? (
                <p className="text-slate-500 text-center py-12">Ingen bannede brukere funnet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          Bruker
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          Rolle
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          Opprettet
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">
                          Handling
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bannedUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-900">
                              {u.name || <span className="italic text-slate-500">Ukjent navn</span>}
                            </div>
                            <div className="text-sm text-slate-500">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <RoleBadge role={u.role} />
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(u.created_at).toLocaleDateString('no-NO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => unbanUser(u.id)}
                              disabled={unbanningId === u.id}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-[#0009e2] hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-lg"
                              title="Fjern ban"
                            >
                              {unbanningId === u.id ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                              ) : null}
                              Fjern ban
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-8 flex items-center justify-end">
                <button
                  onClick={() => setBannedOpen(false)}
                  className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                >
                  Lukk
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  )
}

function StatusCard({
  title,
  value,
  icon,
  description
}: {
  title: string
  value: string
  icon: React.ReactNode
  description: string
}) {
  return (
    <div className="p-6 rounded-2xl border bg-white/80 backdrop-blur-sm shadow-xl border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
          {icon}
        </div>
      </div>
    </div>
  )
}

function AdminKpiCard({
  title,
  value,
  change,
  changePositive,
  icon
}: {
  title: string
  value: number
  change: string
  changePositive: boolean
  icon: React.ReactNode
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{value.toLocaleString('no-NO')}</p>
          <p className={`text-xs mt-2 font-semibold ${changePositive ? 'text-emerald-600' : 'text-red-600'}`}>
            {change}
          </p>
        </div>
        <div className="inline-flex p-4 rounded-xl bg-indigo-100 text-indigo-600 border border-indigo-200">
          {icon}
        </div>
      </div>
    </div>
  )
}

function AlertCard({
  title,
  count,
  type,
  description,
  icon,
  actionText,
  onAction
}: {
  title: string
  count: number
  type: 'danger' | 'warning' | 'info'
  description: string
  icon: React.ReactNode
  actionText: string
  onAction: () => void
}) {
  const typeColors = {
    danger: 'bg-red-50/80 border-red-200 text-red-700',
    warning: 'bg-amber-50/80 border-amber-200 text-amber-700',
    info: 'bg-blue-50/80 border-blue-200 text-blue-700',
  }

  return (
    <div className={`p-6 rounded-2xl border shadow-xl backdrop-blur-sm hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 ${typeColors[type]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-slate-800">{icon}</div>
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
        </div>
        <span className="text-3xl font-bold text-slate-800">{count}</span>
      </div>
      <p className="text-sm text-slate-600 mb-4 font-medium">{description}</p>
      <button
        onClick={onAction}
        className="text-sm font-bold text-[#0009e2] hover:text-blue-600 hover:underline transition-colors"
      >
        {actionText}
      </button>
    </div>
  )
}

function QuickActionCard({
  href,
  title,
  description,
  icon,
  color
}: {
  href: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
}) {
  const colorClasses = {
    blue: 'hover:border-blue-300 hover:bg-blue-50/80',
    green: 'hover:border-green-300 hover:bg-green-50/80',
    purple: 'hover:border-purple-300 hover:bg-purple-50/80',
  }

  return (
    <Link
      href={href}
      className={`block rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-6 shadow-xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 group ${colorClasses[color as keyof typeof colorClasses]}`}
    >
      <div className="flex items-start gap-4">
        <div className="p-4 rounded-xl bg-slate-100 group-hover:bg-slate-200 transition-colors text-slate-600">
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
            {title}
          </div>
          <div className="text-sm text-slate-600 mt-2 font-medium">{description}</div>
          <div className="flex items-center gap-2 mt-4 text-sm text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 font-semibold">
            <span>Åpne</span>
            <ArrowUpRight size={16} />
          </div>
        </div>
      </div>
    </Link>
  )
}

function RoleBadge({ role }: { role: 'private' | 'business' | 'admin' }) {
  const map: Record<'admin' | 'business' | 'private', { text: string; cls: string }> = {
    admin: { text: 'Administrator', cls: 'bg-red-100 text-red-700 border-red-200' },
    business: { text: 'Bedrift', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    private: { text: 'Privatperson', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  }
  return (
    <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${map[role].cls}`}>
      {map[role].text}
    </span>
  )
}