'use client'

import { useState, useEffect, useMemo } from 'react'
import supabase from '@/lib/supabase/client'
import {
  Receipt,
  Search,
  RotateCw,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Building,
  Filter,
  X,
  CreditCard,
  Calendar,
  DollarSign,
  Plus,
  Send,
  FileText,
  TrendingUp,
  TrendingDown,
  Euro,
} from 'lucide-react'
import AdminGuard from '@/components/AdminGuard'

type InvoiceRow = {
  id: string
  user_id: string
  amount: number
  kid: string
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
  // Joined from users table
  user_email?: string
  user_name?: string | null
  user_role?: 'private' | 'business' | 'admin'
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

export default function FakturaAdmin() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all')
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newInvoice, setNewInvoice] = useState({
    user_email: '',
    amount: '',
    due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // 30 dager frem
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let invoicesChannel: any | null = null

    const load = async () => {
      setLoading(true)
      try {
        // Hent alle fakturer
        const { data: invoicesData, error: invoicesError } = await supabase
          .from('invoices')
          .select('id,user_id,amount,kid,due_date,status,created_at')
          .order('created_at', { ascending: false })

        if (invoicesError) throw invoicesError

        // Hent alle brukere
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id,email,name,role')

        if (usersError) throw usersError

        // Lag lookup map for brukere
        const usersMap = new Map(usersData?.map(user => [user.id, user]) || [])

        // Merge fakturer med brukerinformasjon
        const flattenedInvoices = (invoicesData || []).map((invoice: any) => {
          const user = usersMap.get(invoice.user_id)
          return {
            ...invoice,
            user_email: user?.email,
            user_name: user?.name,
            user_role: user?.role,
          }
        }) as InvoiceRow[]

        setInvoices(flattenedInvoices)

        // Oppdater status for forfalt fakturer
        await updateOverdueInvoices(flattenedInvoices)

        setMessage(null)
      } catch (e: any) {
        console.error('Feil ved henting av fakturer:', e)
        showMessage('error', e?.message || 'Kunne ikke hente fakturer')
        setInvoices([])
      }

      // Real-time oppdateringer
      invoicesChannel = supabase
        .channel('admin-invoices-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, (payload) => {
          setInvoices((prev) => {
            if (payload.eventType === 'INSERT') {
              const newInvoice = payload.new as InvoiceRow
              return [newInvoice, ...prev]
            }
            if (payload.eventType === 'UPDATE') {
              const updatedInvoice = payload.new as InvoiceRow
              return prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv))
            }
            if (payload.eventType === 'DELETE') {
              const deletedInvoice = payload.old as InvoiceRow
              return prev.filter((inv) => inv.id !== deletedInvoice.id)
            }
            return prev
          })
        })
        .subscribe()

      setLoading(false)
    }

    load()

    return () => {
      if (invoicesChannel) supabase.removeChannel(invoicesChannel)
    }
  }, [])

  const updateOverdueInvoices = async (invoicesList: InvoiceRow[]) => {
    const today = new Date().toISOString().split('T')[0]
    const overdueInvoices = invoicesList.filter(
      (inv) => inv.status === 'pending' && inv.due_date < today
    )

    if (overdueInvoices.length > 0) {
      try {
        const { error } = await supabase
          .from('invoices')
          .update({ status: 'overdue' })
          .in('id', overdueInvoices.map(inv => inv.id))

        if (!error) {
          setInvoices(prev => prev.map(inv => 
            overdueInvoices.find(o => o.id === inv.id) 
              ? { ...inv, status: 'overdue' as const }
              : inv
          ))
        }
      } catch (e) {
        console.error('Kunne ikke oppdatere forfalte fakturer:', e)
      }
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    
    try {
      // Hent alle fakturer
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('id,user_id,amount,kid,due_date,status,created_at')
        .order('created_at', { ascending: false })

      if (invoicesError) throw invoicesError

      // Hent alle brukere
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id,email,name,role')

      if (usersError) throw usersError

      // Lag lookup map for brukere
      const usersMap = new Map(usersData?.map(user => [user.id, user]) || [])

      // Merge fakturer med brukerinformasjon
      const flattenedInvoices = (invoicesData || []).map((invoice: any) => {
        const user = usersMap.get(invoice.user_id)
        return {
          ...invoice,
          user_email: user?.email,
          user_name: user?.name,
          user_role: user?.role,
        }
      }) as InvoiceRow[]

      setInvoices(flattenedInvoices)
      await updateOverdueInvoices(flattenedInvoices)
      setMessage(null)
    } catch (e: any) {
      showMessage('error', e?.message || 'Kunne ikke oppdatere fakturer')
    }
    
    setRefreshing(false)
  }

  const updateInvoiceStatus = async (invoiceId: string, newStatus: 'pending' | 'paid' | 'overdue') => {
    setUpdating(invoiceId)
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId)

      if (error) throw error

      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, status: newStatus } : inv
      ))
      
      showMessage('success', `Fakturastatus oppdatert til ${getStatusText(newStatus)}`)
    } catch (e: any) {
      showMessage('error', 'Feil ved oppdatering: ' + (e?.message || 'ukjent'))
    } finally {
      setUpdating(null)
    }
  }

  const createInvoice = async () => {
    if (!newInvoice.user_email || !newInvoice.amount) {
      showMessage('error', 'E-post og beløp må fylles ut')
      return
    }

    setCreating(true)
    try {
      // Finn bruker basert på e-post
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', newInvoice.user_email.trim())
        .single()

      if (userError || !userData) {
        throw new Error('Bruker med denne e-posten finnes ikke')
      }

      // Generer KID-nummer (enkel implementasjon)
      const kid = `${Date.now()}${Math.floor(Math.random() * 1000)}`

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          user_id: userData.id,
          amount: parseFloat(newInvoice.amount),
          due_date: newInvoice.due_date,
          kid: kid,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error

      // Legg til i lokal state (blir også oppdatert via realtime)
      const newInvoiceWithUser = {
        ...data,
        user_email: newInvoice.user_email.trim(),
        user_name: null, // Dette kommer fra realtime oppdatering
        user_role: null
      } as InvoiceRow

      setInvoices(prev => [newInvoiceWithUser, ...prev])
      
      // Reset form
      setNewInvoice({
        user_email: '',
        amount: '',
        due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      })
      setShowCreateModal(false)
      
      showMessage('success', `Faktura opprettet med KID: ${kid}`)
    } catch (e: any) {
      showMessage('error', e?.message || 'Kunne ikke opprette faktura')
    } finally {
      setCreating(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const getStatusIcon = (status: 'pending' | 'paid' | 'overdue') => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="text-emerald-600" size={16} />
      case 'overdue':
        return <AlertTriangle className="text-red-600" size={16} />
      default:
        return <Clock className="text-amber-600" size={16} />
    }
  }

  const getStatusText = (status: 'pending' | 'paid' | 'overdue') => {
    switch (status) {
      case 'paid':
        return 'Betalt'
      case 'overdue':
        return 'Forfalt'
      default:
        return 'Avventer'
    }
  }

  const getStatusBadgeColor = (status: 'pending' | 'paid' | 'overdue') => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'overdue':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-amber-100 text-amber-700 border-amber-200'
    }
  }

  const getRoleIcon = (role?: 'private' | 'business' | 'admin') => {
    switch (role) {
      case 'business':
        return <Building className="text-blue-600" size={16} />
      case 'admin':
        return <Receipt className="text-red-600" size={16} />
      default:
        return <User className="text-slate-500" size={16} />
    }
  }

  const stats = useMemo(() => {
    const total = invoices.length
    const pending = invoices.filter((inv) => inv.status === 'pending').length
    const paid = invoices.filter((inv) => inv.status === 'paid').length
    const overdue = invoices.filter((inv) => inv.status === 'overdue').length
    
    const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
    const pendingAmount = invoices.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.amount, 0)
    const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0)
    const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0)

    const today = new Date().toDateString()
    const todayCount = invoices.filter(inv => new Date(inv.created_at).toDateString() === today).length

    return { total, pending, paid, overdue, totalAmount, pendingAmount, overdueAmount, paidAmount, todayCount }
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    let filtered = invoices

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === statusFilter)
    }

    // Search filter
    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      filtered = filtered.filter((inv) => {
        const name = (inv.user_name || '').toLowerCase()
        const email = (inv.user_email || '').toLowerCase()
        const kid = (inv.kid || '').toLowerCase()
        return name.includes(q) || email.includes(q) || kid.includes(q)
      })
    }

    return filtered
  }, [invoices, statusFilter, debouncedSearch])

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
            <p className="text-slate-600 font-medium text-center">Laster fakturer…</p>
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
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Fakturaadministrasjon</h1>
                <p className="text-slate-600 font-medium mt-2">Administrer fakturer, betalinger og påminnelser til bedriftskunder</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  title="Opprett ny faktura"
                >
                  <Plus size={18} />
                  Ny faktura
                </button>
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0009e2] hover:bg-blue-600 text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  title="Oppdater alle fakturer"
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
              icon={<Receipt className="h-6 w-6" />}
              label="Totalt"
              value={stats.total}
              subtitle={`${stats.totalAmount.toLocaleString('no-NO')} NOK`}
              color="default"
            />
            <StatsCard
              icon={<Clock className="h-6 w-6" />}
              label="Avventer"
              value={stats.pending}
              subtitle={`${stats.pendingAmount.toLocaleString('no-NO')} NOK`}
              color="warning"
            />
            <StatsCard
              icon={<CheckCircle className="h-6 w-6" />}
              label="Betalt"
              value={stats.paid}
              subtitle={`${stats.paidAmount.toLocaleString('no-NO')} NOK`}
              color="success"
            />
            <StatsCard
              icon={<AlertTriangle className="h-6 w-6" />}
              label="Forfalt"
              value={stats.overdue}
              subtitle={`${stats.overdueAmount.toLocaleString('no-NO')} NOK`}
              color="danger"
            />
            <StatsCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="I dag"
              value={stats.todayCount}
              color="info"
            />
            <StatsCard
              icon={<Euro className="h-6 w-6" />}
              label="Snitt beløp"
              value={Math.round(stats.totalAmount / (stats.total || 1))}
              subtitle="NOK"
              color="info"
            />
          </div>

          {/* Search and Controls */}
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søk etter e-post, navn eller KID…"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent font-medium"
                />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="appearance-none bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 pr-12 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                >
                  <option value="all">Alle fakturer ({stats.total})</option>
                  <option value="pending">Avventer ({stats.pending})</option>
                  <option value="paid">Betalt ({stats.paid})</option>
                  <option value="overdue">Forfalt ({stats.overdue})</option>
                </select>
                <Filter size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {statusFilter !== 'all' ? `${getStatusText(statusFilter)} fakturer` : 'Alle fakturer'} ({filteredInvoices.length})
                  </h2>
                  {debouncedSearch && (
                    <p className="text-sm text-slate-600 mt-1 font-medium">Søk: "{debouncedSearch}"</p>
                  )}
                </div>
                <div className="text-sm text-slate-600 font-medium">
                  Siste oppdatering: {new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {filteredInvoices.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <Receipt className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Ingen fakturer funnet</h3>
                <p className="text-slate-600 font-medium">
                  {debouncedSearch ? 'Prøv å justere søkekriteriene.' : 'Opprett fakturer for å komme i gang.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50/80">
                    <tr className="border-b border-slate-200">
                      <Th>Kunde</Th>
                      <Th>Faktura</Th>
                      <Th>Beløp</Th>
                      <Th>Forfallsdato</Th>
                      <Th>Status</Th>
                      <Th>Opprettet</Th>
                      <Th>Handlinger</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors">
                        <Td>
                          <div className="flex items-center gap-3">
                            {getRoleIcon(invoice.user_role)}
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {invoice.user_name || <span className="italic text-slate-500">Ukjent navn</span>}
                              </div>
                              <div className="text-sm text-slate-600 font-medium">{invoice.user_email}</div>
                            </div>
                          </div>
                        </Td>

                        <Td>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">KID: {invoice.kid}</div>
                          </div>
                        </Td>

                        <Td>
                          <div className="text-sm font-bold text-slate-900">
                            {invoice.amount.toLocaleString('no-NO')} <span className="text-slate-500 font-medium">NOK</span>
                          </div>
                        </Td>

                        <Td>
                          <div className="text-sm font-medium text-slate-900">
                            {new Date(invoice.due_date).toLocaleDateString('no-NO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(invoice.status)}
                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${getStatusBadgeColor(invoice.status)}`}>
                              {getStatusText(invoice.status)}
                            </span>
                          </div>
                        </Td>

                        <Td>
                          <span className="text-sm text-slate-600 font-medium">
                            {new Date(invoice.created_at).toLocaleDateString('no-NO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <select
                              value={invoice.status}
                              onChange={(e) => updateInvoiceStatus(invoice.id, e.target.value as any)}
                              disabled={updating === invoice.id}
                              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent disabled:opacity-50"
                            >
                              <option value="pending">Avventer</option>
                              <option value="paid">Betalt</option>
                              <option value="overdue">Forfalt</option>
                            </select>

                            {updating === invoice.id && (
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

        {/* Create Invoice Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                <Receipt size={24} />
                Opprett ny faktura
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Kunde (e-post)</label>
                  <input
                    type="email"
                    value={newInvoice.user_email}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, user_email: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                    placeholder="kunde@bedrift.no"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Beløp (NOK)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newInvoice.amount}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                    placeholder="1000.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Forfallsdato</label>
                  <input
                    type="date"
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                  onClick={createInvoice}
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Oppretter…
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Opprett faktura
                    </>
                  )}
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
  subtitle,
  color = 'default' 
}: { 
  icon: React.ReactNode
  label: string
  value: number
  subtitle?: string
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
          {subtitle && <p className="text-xs text-slate-600 mt-1 font-medium">{subtitle}</p>}
        </div>
        <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
          {icon}
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