'use client'

import { useEffect, useMemo, useState } from 'react'
import supabase from '@/lib/supabase/client'
import {
  Play,
  TrendingUp,
  Calendar,
  Users,
  Briefcase,
  RefreshCw,
  Search,
  Eye,
  BarChart3,
  Clock,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  Building2,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  Filter,
  Download,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import AdminGuard from '@/components/AdminGuard'

type BusinessClip = {
  id: string
  title: string
  content: string
  created_at: string
  user_id: string
  is_active: boolean
  category?: string
}

type ClipUsageLog = {
  id: string
  clip_id: string
  job_id: string
  user_id: string
  used_at: string
  clip_title: string
  job_title: string
  created_at: string
  jobs?: {
    id: string
    title: string
    job_id: string
    location: string
    contact_email: string
    contact_phone: string
    created_at: string
  }
  users?: {
    id: string
    email: string
    role: string
  }
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

export default function AdminClipsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [clips, setClips] = useState<BusinessClip[]>([])
  const [usageLogs, setUsageLogs] = useState<ClipUsageLog[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClip, setSelectedClip] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'companies' | 'clips'>('overview')
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAccessTokenOrWait()
      console.log('Token:', token ? 'OK' : 'MANGLER')
      
      if (!token) {
        setError('Ikke autoriseret - ingen token')
        return
      }

      const [clipsResponse, logsResponse] = await Promise.all([
        fetch('/api/admin/clips', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        }),
        fetch('/api/admin/clip-logs', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
      ])

      if (!clipsResponse.ok || !logsResponse.ok) {
        throw new Error('Kunne ikke hente data fra API')
      }

      const clipsData = await clipsResponse.json()
      const logsData = await logsResponse.json()

      setClips(clipsData.clips || [])
      setUsageLogs(logsData.logs || [])
    } catch (e: any) {
      setError(e?.message || 'Kunne ikke laste data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const toggleClipStatus = async (clipId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('business_clips')
        .update({ is_active: newStatus })
        .eq('id', clipId)

      if (error) throw error

      setClips(prev => 
        prev.map(clip => 
          clip.id === clipId ? { ...clip, is_active: newStatus } : clip
        )
      )

      setBanner({ 
        type: 'success', 
        text: `Clip ${newStatus ? 'aktivert' : 'deaktivert'}` 
      })
    } catch (e: any) {
      setBanner({ type: 'error', text: e?.message || 'Kunne ikke endre status' })
    } finally {
      setTimeout(() => setBanner(null), 3000)
    }
  }

  const deleteClip = async (clipId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne clipen permanent?')) return

    try {
      const { error } = await supabase
        .from('business_clips')
        .delete()
        .eq('id', clipId)

      if (error) throw error

      setClips(prev => prev.filter(clip => clip.id !== clipId))
      setBanner({ type: 'success', text: 'Clip slettet' })
    } catch (e: any) {
      setBanner({ type: 'error', text: e?.message || 'Kunne ikke slette clip' })
    } finally {
      setTimeout(() => setBanner(null), 3000)
    }
  }

  const filteredLogs = useMemo(() => {
    let filtered = usageLogs

    // Date filter
    if (dateFilter !== 'all') {
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - days)
      filtered = filtered.filter(log => new Date(log.used_at) >= cutoff)
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(log => 
        log.job_title?.toLowerCase().includes(search) ||
        log.clip_title?.toLowerCase().includes(search) ||
        log.users?.email?.toLowerCase().includes(search) ||
        log.jobs?.job_id?.toLowerCase().includes(search) ||
        log.jobs?.location?.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [usageLogs, dateFilter, searchTerm])

  const stats = useMemo(() => {
    const now = new Date()
    const daysAgo = (n: number) => {
      const d = new Date(now)
      d.setDate(d.getDate() - n)
      return d
    }

    const total_clips = clips.length
    const active_clips = clips.filter(c => c && c.is_active).length
    const total_usage = usageLogs.length
    const usage_last_7_days = usageLogs.filter(log => 
      new Date(log.used_at) >= daysAgo(7)
    ).length
    const usage_last_30_days = usageLogs.filter(log => 
      new Date(log.used_at) >= daysAgo(30)
    ).length

    // Unike bedrifter som har brukt klipp
    const uniqueCompanies = new Set(usageLogs.map(log => log.user_id)).size

    // Mest brukte clip
    const clipUsageCount = usageLogs.reduce((acc, log) => {
      acc[log.clip_id] = (acc[log.clip_id] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostUsedClipId = Object.keys(clipUsageCount).reduce((a, b) => 
      clipUsageCount[a] > clipUsageCount[b] ? a : b, ''
    )
    
    const mostUsedClip = clips.find(c => c && c.id === mostUsedClipId)
    const most_used_clip_title = mostUsedClip?.title || 'Ingen data'
    const most_used_clip_count = clipUsageCount[mostUsedClipId] || 0

    return {
      total_clips,
      active_clips,
      total_usage,
      usage_last_7_days,
      usage_last_30_days,
      unique_companies: uniqueCompanies,
      most_used_clip_title,
      most_used_clip_count,
    }
  }, [clips, usageLogs])

  const companyStats = useMemo(() => {
    const companies = usageLogs.reduce((acc, log) => {
      const email = log.users?.email || 'Ukjent bedrift'
      if (!acc[email]) {
        acc[email] = {
          email,
          usageCount: 0,
          lastUsed: log.used_at,
          jobs: new Set()
        }
      }
      acc[email].usageCount += 1
      if (log.jobs?.job_id) {
        acc[email].jobs.add(log.jobs.job_id)
      }
      if (new Date(log.used_at) > new Date(acc[email].lastUsed)) {
        acc[email].lastUsed = log.used_at
      }
      return acc
    }, {} as Record<string, any>)

    return Object.values(companies)
      .map((company: any) => ({
        ...company,
        uniqueJobs: company.jobs.size
      }))
      .sort((a: any, b: any) => b.usageCount - a.usageCount)
  }, [usageLogs])

  const usageOverTime = useMemo(() => {
    const days: { date: string; count: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' })
      const count = usageLogs.filter(log => 
        new Date(log.used_at).toDateString() === d.toDateString()
      ).length
      days.push({ date: label, count })
    }
    return days
  }, [usageLogs])

  const jobStats = useMemo(() => {
    const jobs = usageLogs.reduce((acc, log) => {
      const jobId = log.jobs?.job_id || 'Ukjent jobb'
      const jobTitle = log.jobs?.title || log.job_title || 'Ukjent tittel'
      if (!acc[jobId]) {
        acc[jobId] = {
          jobId,
          title: jobTitle,
          location: log.jobs?.location || 'Ukjent lokasjon',
          usageCount: 0,
          companies: new Set()
        }
      }
      acc[jobId].usageCount += 1
      if (log.users?.email) {
        acc[jobId].companies.add(log.users.email)
      }
      return acc
    }, {} as Record<string, any>)

    return Object.values(jobs)
      .map((job: any) => ({
        ...job,
        uniqueCompanies: job.companies.size
      }))
      .sort((a: any, b: any) => b.usageCount - a.usageCount)
      .slice(0, 10)
  }, [usageLogs])

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0009e2] mx-auto mb-4"></div>
            <p className="text-gray-600">Laster clip-data...</p>
          </div>
        </div>
      </AdminGuard>
    )
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Clip Analytics Dashboard</h1>
              <p className="text-gray-600 mt-2">Detaljert oversikt over klipp-bruk og bedriftsaktivitet</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0009e2] hover:bg-blue-600 text-white font-medium transition-all duration-200 shadow-lg"
              >
                <RefreshCw className={refreshing ? 'animate-spin' : ''} size={18} />
                {refreshing ? 'Oppdaterer...' : 'Oppdater'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-5 rounded-xl bg-red-50 border border-red-200 text-red-800 shadow-lg">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} />
              <span className="font-semibold">Feil:</span>
              {error}
            </div>
          </div>
        )}

        {banner && (
          <div className={`mb-6 p-5 rounded-xl border flex items-center gap-3 shadow-lg ${
            banner.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {banner.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="font-semibold">{banner.text}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Totalt antall clips"
            value={stats.total_clips}
            icon={<FileText className="h-6 w-6" />}
            description={`${stats.active_clips} aktive clips`}
            color="blue"
          />
          <StatCard
            title="Total bruk"
            value={stats.total_usage}
            icon={<Play className="h-6 w-6" />}
            description="Alle ganger clips er brukt"
            color="green"
          />
          <StatCard
            title="Aktive bedrifter"
            value={stats.unique_companies}
            icon={<Building2 className="h-6 w-6" />}
            description="Unike bedrifter som bruker klipp"
            color="purple"
          />
          <StatCard
            title="Siste 7 dager"
            value={stats.usage_last_7_days}
            icon={<TrendingUp className="h-6 w-6" />}
            description="Klipp-bruk denne uken"
            color="orange"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'overview', label: 'Oversikt', icon: BarChart3 },
                { key: 'logs', label: 'Detaljert logg', icon: FileText },
                { key: 'companies', label: 'Bedriftsanalyse', icon: Building2 },
                { key: 'clips', label: 'Clip-administrasjon', icon: Play }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-[#0009e2] text-[#0009e2]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="mr-2 h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Usage Over Time */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <BarChart3 size={24} />
                  Klipp-bruk over tid (30 dager)
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usageOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                      <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#0009e2"
                        strokeWidth={3}
                        dot={{ fill: '#0009e2', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Jobs */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Briefcase size={24} />
                  Mest populære jobber
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobStats.slice(0, 8)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" fontSize={12} />
                      <YAxis 
                        type="category"
                        dataKey="jobId"
                        stroke="#64748b"
                        fontSize={10}
                        width={80}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: any, name: any, props: any) => [
                          `${value} klipp brukt`,
                          props.payload.title
                        ]}
                      />
                      <Bar 
                        dataKey="usageCount" 
                        fill="#0009e2"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Søk i jobber, bedrifter, anbuds-ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent w-80"
                    />
                  </div>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                  >
                    <option value="7d">Siste 7 dager</option>
                    <option value="30d">Siste 30 dager</option>
                    <option value="90d">Siste 90 dager</option>
                    <option value="all">Alle</option>
                  </select>
                </div>
                <div className="text-sm text-gray-600">
                  Viser {filteredLogs.length} av {usageLogs.length} hendelser
                </div>
              </div>
            </div>

            {/* Usage Logs Table */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <FileText size={24} />
                  Detaljert klipp-brukslogg
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tidspunkt
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bedrift
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Anbuds-ID / Jobb
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lokasjon
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kontaktinfo låst opp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clip brukt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            {new Date(log.used_at).toLocaleString('no-NO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <Building2 size={16} className="text-blue-500" />
                            <div>
                              <div className="font-medium text-gray-900">
                                {log.users?.email || 'Ukjent bedrift'}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {log.users?.role || 'ukjent rolle'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>
                            <div className="font-medium text-gray-900 flex items-center gap-2">
                              <ExternalLink size={14} className="text-gray-400" />
                              {log.jobs?.job_id || 'Ukjent ID'}
                            </div>
                            <div className="text-gray-500 mt-1">
                              {log.jobs?.title || log.job_title || 'Ukjent tittel'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <MapPin size={14} className="text-gray-400" />
                            {log.jobs?.location || 'Ukjent'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="space-y-1">
                            {log.jobs?.contact_email && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Mail size={14} className="text-gray-400" />
                                {log.jobs.contact_email}
                              </div>
                            )}
                            {log.jobs?.contact_phone && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Phone size={14} className="text-gray-400" />
                                {log.jobs.contact_phone}
                              </div>
                            )}
                            {!log.jobs?.contact_email && !log.jobs?.contact_phone && (
                              <span className="text-gray-400 text-xs">Ingen kontaktinfo</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="inline-flex px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                            {log.clip_title || 'Ukjent clip'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {filteredLogs.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm ? 'Ingen logger funnet som matcher søket.' : 'Ingen klipp-bruk registrert.'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <Building2 size={24} />
                Bedriftsanalyse
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bedrift
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Totalt klipp brukt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unike jobber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sist aktiv
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companyStats.map((company: any, index) => (
                    <tr key={company.email} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 h-8 w-8 bg-[#0009e2] rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {index + 1}
                          </div>
                          <div className="font-medium text-gray-900">{company.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="inline-flex px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full font-semibold">
                          {company.usageCount} klipp
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {company.uniqueJobs} jobber
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(company.lastUsed).toLocaleDateString('no-NO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Clips Tab - Existing clip management */}
        {activeTab === 'clips' && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <FileText size={24} />
                Administrer clips
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Søk i clips..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Clip
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Bruk
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Opprettet
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider">
                      Handlinger
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clips
                    .filter(clip => clip && clip.title && clip.content)
                    .filter(clip => {
                      const searchLower = searchTerm.toLowerCase()
                      const title = clip.title || ''
                      const content = clip.content || ''
                      const category = clip.category || ''
                      return (
                        title.toLowerCase().includes(searchLower) ||
                        content.toLowerCase().includes(searchLower) ||
                        category.toLowerCase().includes(searchLower)
                      )
                    })
                    .map((clip) => {
                      const usageCount = usageLogs.filter(log => log.clip_id === clip.id).length
                      return (
                        <tr key={clip.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{clip.title || 'Ingen tittel'}</div>
                              <div className="text-sm text-gray-500 mt-1">
                                {clip.content && clip.content.length > 100 
                                  ? clip.content.substring(0, 100) + '...' 
                                  : (clip.content || 'Ingen innhold')
                                }
                              </div>
                              {clip.category && (
                                <div className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full mt-2">
                                  {clip.category}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                              clip.is_active 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {clip.is_active ? 'Aktiv' : 'Inaktiv'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">{usageCount} ganger</div>
                            <div className="text-xs text-gray-500">Total bruk</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(clip.created_at).toLocaleDateString('no-NO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedClip(clip.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                              >
                                <Eye size={14} />
                                Se bruk
                              </button>
                              <button
                                onClick={() => toggleClipStatus(clip.id, !clip.is_active)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                  clip.is_active
                                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                              >
                                {clip.is_active ? 'Deaktiver' : 'Aktiver'}
                              </button>
                              <button
                                onClick={() => deleteClip(clip.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                              >
                                <Trash2 size={14} />
                                Slett
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Usage Details Modal */}
        {selectedClip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-8 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Clip-brukshistorikk</h3>
                <button
                  onClick={() => setSelectedClip(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">
                  {clips.find(c => c.id === selectedClip)?.title}
                </h4>
                <p className="text-gray-600 text-sm">
                  Totalt brukt {usageLogs.filter(log => log.clip_id === selectedClip).length} ganger
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Bedrift</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Jobb</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Anbuds-ID</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Brukt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usageLogs
                      .filter(log => log.clip_id === selectedClip)
                      .sort((a, b) => new Date(b.used_at).getTime() - new Date(a.used_at).getTime())
                      .map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {log.users?.email || 'Ukjent bedrift'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {log.jobs?.title || log.job_title || 'Ukjent jobb'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {log.jobs?.job_id || 'Ukjent ID'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(log.used_at).toLocaleString('no-NO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  )
}

function StatCard({
  title,
  value,
  icon,
  description,
  color = 'blue'
}: {
  title: string
  value: number
  icon: React.ReactNode
  description: string
  color?: 'blue' | 'green' | 'purple' | 'orange'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600', 
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value.toLocaleString('no-NO')}</p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}