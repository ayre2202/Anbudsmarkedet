'use client'

import { useEffect, useMemo, useState } from 'react'
import supabase from '@/lib/supabase/client'
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Filter, 
  AlertTriangle, 
  Eye,
  X,
  User,
  Calendar,
  MapPin,
  Building2,
  FileText,
  Image as ImageIcon,
  Clock,
  TrendingUp,
  Search
} from 'lucide-react'

type JobRow = {
  id: string
  title: string | null
  created_at: string
  status: 'pending' | 'approved' | 'rejected' | 'archived' | null
  rejected_reason: string | null
  user_id: string | null
  description?: string | null
  location?: string | null
  company?: string | null
  salary?: string | null
  images?: string[] | null
  category?: string | null
  employment_type?: string | null
  requirements?: string | null
  benefits?: string | null
  contact_email?: string | null
  contact_phone?: string | null
}

type JobStats = {
  total: number
  pending: number
  approved: number
  rejected: number
  archived: number
  todayCount: number
}

/**
 * Henter access token. Hvis det ikke finnes helt ennå (hydration-race),
 * venter vi kort på et auth-state-event før vi gir opp.
 */
async function getAccessTokenOrWait(timeoutMs = 2000): Promise<string | null> {
  const { data: sess0 } = await supabase.auth.getSession()
  const t0 = sess0.session?.access_token
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
      const { data: sess1 } = await supabase.auth.getSession()
      const t1 = sess1.session?.access_token ?? null
      if (t1) {
        done = true
        clearTimeout(timer)
        sub.subscription.unsubscribe()
        resolve(t1)
      }
    })
  })
}

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'archived'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [acting, setActing] = useState<string | null>(null)
  const [notAuthed, setNotAuthed] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobRow | null>(null)
  const [showJobDetail, setShowJobDetail] = useState(false)

  const fetchJobs = async () => {
    try {
      setErr(null)
      setLoading(true)

      const token = await getAccessTokenOrWait()
      if (!token) {
        setNotAuthed(true)
        setJobs([])
        return
      }

      const res = await fetch('/api/admin/jobs', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'failed')
      setJobs(json.jobs || [])
      setNotAuthed(false)
    } catch (e: any) {
      console.error(e)
      setErr(e?.message || 'Kunne ikke hente jobber')
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchJobs()
    setRefreshing(false)
  }

  const approveJob = async (id: string) => {
    try {
      setActing(id)
      const token = await getAccessTokenOrWait()
      if (!token) {
        setNotAuthed(true)
        return
      }

      const res = await fetch('/api/admin/jobs', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved', rejected_reason: null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'approve-failed')

      setJobs(prev => prev.map(j => (j.id === id ? json.job : j)))
    } catch (e: any) {
      alert('Kunne ikke godkjenne: ' + (e?.message || 'ukjent feil'))
    } finally {
      setActing(null)
    }
  }

  const rejectJob = async (id: string) => {
    const reason = window.prompt('Begrunnelse for avslag (valgfritt):') || null
    try {
      setActing(id)
      const token = await getAccessTokenOrWait()
      if (!token) {
        setNotAuthed(true)
        return
      }

      const res = await fetch('/api/admin/jobs', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'rejected', rejected_reason: reason }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'reject-failed')

      setJobs(prev => prev.map(j => (j.id === id ? json.job : j)))
    } catch (e: any) {
      alert('Kunne ikke avslå: ' + (e?.message || 'ukjent feil'))
    } finally {
      setActing(null)
    }
  }

  const openJobDetail = (job: JobRow) => {
    setSelectedJob(job)
    setShowJobDetail(true)
  }

  const closeJobDetail = () => {
    setSelectedJob(null)
    setShowJobDetail(false)
  }

  const stats: JobStats = useMemo(() => {
    const total = jobs.length
    const pending = jobs.filter(j => (j.status ?? 'pending') === 'pending').length
    const approved = jobs.filter(j => j.status === 'approved').length
    const rejected = jobs.filter(j => j.status === 'rejected').length
    const archived = jobs.filter(j => j.status === 'archived').length
    
    const today = new Date().toDateString()
    const todayCount = jobs.filter(j => new Date(j.created_at).toDateString() === today).length

    return { total, pending, approved, rejected, archived, todayCount }
  }, [jobs])

  const filtered = useMemo(() => {
    let result = jobs
    
    if (filter !== 'all') {
      result = result.filter(j => (j.status ?? 'pending') === filter)
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(j => 
        (j.title?.toLowerCase().includes(query)) ||
        (j.company?.toLowerCase().includes(query)) ||
        (j.location?.toLowerCase().includes(query))
      )
    }
    
    return result
  }, [jobs, filter, searchQuery])

  if (loading) {
    return (
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
          <p className="text-slate-600 font-medium text-center">Laster jobber…</p>
        </div>
      </div>
    )
  }

  if (notAuthed) {
    return (
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
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-200 text-center max-w-md">
          <AlertTriangle className="mx-auto mb-4 text-amber-500" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-3">Ikke autorisert</h2>
          <p className="text-slate-600 font-medium">
            Du er ikke innlogget eller mangler tilgang. Last siden på nytt eller gå til innlogging.
          </p>
        </div>
      </div>
    )
  }

  return (
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
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Jobbmoderering</h1>
              <p className="text-slate-600 font-medium mt-2">Godkjenn eller avslå jobbannonser før publisering til bedrifter</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0009e2] hover:bg-blue-600 text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Oppdater alle jobber"
              >
                <RefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
                {refreshing ? 'Oppdaterer…' : 'Oppdater'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <StatsCard title="Totalt" value={stats.total} icon={<FileText className="h-6 w-6" />} />
          <StatsCard title="Ventende" value={stats.pending} icon={<Clock className="h-6 w-6" />} color="warning" />
          <StatsCard title="Godkjente" value={stats.approved} icon={<CheckCircle className="h-6 w-6" />} color="success" />
          <StatsCard title="Avslåtte" value={stats.rejected} icon={<XCircle className="h-6 w-6" />} color="danger" />
          <StatsCard title="I dag" value={stats.todayCount} icon={<TrendingUp className="h-6 w-6" />} color="info" />
        </div>

        {/* Controls */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søk etter tittel, bedrift eller lokasjon…"
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent font-medium"
              />
            </div>
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="appearance-none bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 pr-12 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
              >
                <option value="all">Alle jobber</option>
                <option value="pending">Ventende ({stats.pending})</option>
                <option value="approved">Godkjente ({stats.approved})</option>
                <option value="rejected">Avslåtte ({stats.rejected})</option>
                <option value="archived">Arkiverte ({stats.archived})</option>
              </select>
              <Filter size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {err && (
          <div className="mb-6 p-5 rounded-xl bg-red-50 border border-red-200 text-red-800 shadow-xl hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              <span className="font-semibold">Feil:</span>
              {err}
            </div>
          </div>
        )}

        {/* Jobs Table */}
        {filtered.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-12 text-center text-slate-600 shadow-xl border border-slate-200">
            <AlertTriangle className="mx-auto mb-4 text-slate-400" size={48} />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Ingen jobber funnet</h3>
            <p className="font-medium">Prøv å justere søkekriteriene eller filteret.</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/80">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">Jobb</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">Detaljer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600 uppercase tracking-wider">Handlinger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900 mb-1">
                          {job.title || '(Uten tittel)'}
                        </div>
                        {job.company && (
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Building2 size={14} />
                            {job.company}
                          </div>
                        )}
                        {job.rejected_reason && job.status === 'rejected' && (
                          <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded-lg border border-red-200">
                            <span className="font-semibold">Avslag:</span> {job.rejected_reason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-500 space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            {new Date(job.created_at).toLocaleDateString('no-NO', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {job.location && (
                            <div className="flex items-center gap-2">
                              <MapPin size={14} />
                              {job.location}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openJobDetail(job)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold transition-all duration-200"
                            title="Se detaljer"
                          >
                            <Eye size={16} />
                            Se mer
                          </button>
                          <button
                            onClick={() => approveJob(job.id)}
                            disabled={acting === job.id || job.status === 'approved'}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                            title="Godkjenn"
                          >
                            <CheckCircle size={16} />
                            Godkjenn
                          </button>
                          <button
                            onClick={() => rejectJob(job.id)}
                            disabled={acting === job.id || job.status === 'rejected'}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                            title="Avslå"
                          >
                            <XCircle size={16} />
                            Avslå
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      {showJobDetail && selectedJob && (
        <JobDetailModal 
          job={selectedJob} 
          onClose={closeJobDetail}
          onApprove={() => approveJob(selectedJob.id)}
          onReject={() => rejectJob(selectedJob.id)}
          isActing={acting === selectedJob.id}
        />
      )}
    </div>
  )
}

function StatsCard({ 
  title, 
  value, 
  icon, 
  color = 'default' 
}: { 
  title: string
  value: number
  icon: React.ReactNode
  color?: 'default' | 'warning' | 'success' | 'danger' | 'info'
}) {
  const colorClasses = {
    default: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    warning: 'bg-amber-100 text-amber-600 border-amber-200',
    success: 'bg-emerald-100 text-emerald-600 border-emerald-200',
    danger: 'bg-red-100 text-red-600 border-red-200',
    info: 'bg-blue-100 text-blue-600 border-blue-200',
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{value.toLocaleString('no-NO')}</p>
        </div>
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: JobRow['status'] }) {
  const map: Record<'pending' | 'approved' | 'rejected' | 'archived', { text: string; cls: string }> = {
    pending:  { text: 'Venter', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    approved: { text: 'Godkjent', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    rejected: { text: 'Avslått', cls: 'bg-red-100 text-red-700 border-red-200' },
    archived: { text: 'Arkivert', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  }
  const s: 'pending' | 'approved' | 'rejected' | 'archived' = (status ?? 'pending')
  const v = map[s]
  return <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${v.cls}`}>{v.text}</span>
}

function JobDetailModal({ 
  job, 
  onClose, 
  onApprove, 
  onReject, 
  isActing 
}: { 
  job: JobRow
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  isActing: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h3 className="text-2xl font-bold text-slate-800">{job.title || 'Uten tittel'}</h3>
            <div className="flex items-center gap-4 mt-2">
              {job.company && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 size={16} />
                  <span className="font-medium">{job.company}</span>
                </div>
              )}
              <StatusBadge status={job.status} />
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
          <div className="p-6 space-y-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Grunnleggende informasjon</h4>
                  <div className="space-y-3">
                    <InfoRow icon={<Calendar size={16} />} label="Opprettet" 
                      value={new Date(job.created_at).toLocaleDateString('no-NO', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} 
                    />
                    {job.location && <InfoRow icon={<MapPin size={16} />} label="Lokasjon" value={job.location} />}
                    {job.employment_type && <InfoRow icon={<User size={16} />} label="Type stilling" value={job.employment_type} />}
                    {job.category && <InfoRow icon={<FileText size={16} />} label="Kategori" value={job.category} />}
                    {job.salary && <InfoRow icon={<TrendingUp size={16} />} label="Lønn" value={job.salary} />}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Kontaktinformasjon</h4>
                  <div className="space-y-3">
                    {job.contact_email && <InfoRow icon={<User size={16} />} label="E-post" value={job.contact_email} />}
                    {job.contact_phone && <InfoRow icon={<User size={16} />} label="Telefon" value={job.contact_phone} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {job.description && (
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Beskrivelse</h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">{job.description}</p>
                </div>
              </div>
            )}

            {/* Requirements */}
            {job.requirements && (
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Krav</h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">{job.requirements}</p>
                </div>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && (
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Fordeler</h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-700 whitespace-pre-wrap font-medium leading-relaxed">{job.benefits}</p>
                </div>
              </div>
            )}

            {/* Images */}
            {job.images && job.images.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <ImageIcon size={20} />
                  Bilder ({job.images.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {job.images.map((imageUrl, index) => (
                    <div key={index} className="rounded-xl overflow-hidden border border-slate-200 shadow-lg">
                      <img 
                        src={imageUrl} 
                        alt={`Jobbilde ${index + 1}`}
                        className="w-full h-48 object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection Reason */}
            {job.rejected_reason && job.status === 'rejected' && (
              <div>
                <h4 className="text-lg font-semibold text-red-800 mb-3">Avslagsbegrunnelse</h4>
                <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-red-700 font-medium">{job.rejected_reason}</p>
                </div>
              </div>
            )}
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
              <button
                onClick={onReject}
                disabled={isActing || job.status === 'rejected'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
              >
                <XCircle size={18} />
                Avslå jobb
              </button>
              <button
                onClick={onApprove}
                disabled={isActing || job.status === 'approved'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
              >
                <CheckCircle size={18} />
                Godkjenn jobb
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-slate-400">{icon}</div>
      <span className="text-sm font-semibold text-slate-600">{label}:</span>
      <span className="text-sm text-slate-800 font-medium">{value}</span>
    </div>
  )
}