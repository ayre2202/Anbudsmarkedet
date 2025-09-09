'use client'

import { useState, useEffect, useMemo } from 'react'
import supabase from '@/lib/supabase/client'
import {
  Shield,
  User,
  Building,
  CheckCircle,
  XCircle,
  Plus,
  Search,
  RotateCw,
  Ban as BanIcon,
  Lock,
  Unlock,
  Info,
  AlertTriangle,
  Users,
  TrendingUp,
  Scissors,
  Edit,
  Minus,
} from 'lucide-react'
import AdminGuard from '@/components/AdminGuard'

type EffRole = 'private_user' | 'business_user' | 'admin'
type ApiRole = 'private' | 'business' | 'admin'

type UserRow = {
  id: string
  email: string
  name: string | null
  role: EffRole
  created_at: string
  banned?: boolean
  business_access_revoked?: boolean
  clips?: {
    remaining: number
    total: number
    nextReset: string
  }
}

// Convert between frontend and API role formats
const roleToApi = (role: EffRole): ApiRole => {
  switch (role) {
    case 'private_user': return 'private'
    case 'business_user': return 'business'
    case 'admin': return 'admin'
  }
}

const roleFromApi = (role: string): EffRole => {
  switch (role) {
    case 'private': return 'private_user'
    case 'business': return 'business_user'
    case 'admin': return 'admin'
    default: return 'private_user'
  }
}

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

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 250)

  const [showAdd, setShowAdd] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addName, setAddName] = useState('')
  const [addRole, setAddRole] = useState<EffRole>('private_user')
  const [addPassword, setAddPassword] = useState('')
  const [adding, setAdding] = useState(false)

  const [banModal, setBanModal] = useState<{
    open: boolean
    user: UserRow | null
    reason: string
    isUnban: boolean
  }>({ open: false, user: null, reason: '', isUnban: false })

  const [revokeModal, setRevokeModal] = useState<{
    open: boolean
    user: UserRow | null
    reason: string
    isRestore: boolean
  }>({ open: false, user: null, reason: '', isRestore: false })

  const [clipsModal, setClipsModal] = useState<{
    open: boolean
    user: UserRow | null
    newAmount: string
    reason: string
  }>({ open: false, user: null, newAmount: '', reason: '' })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const token = await getAccessTokenOrWait()
      if (!token) {
        setUsers([])
        return
      }

      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Kunne ikke hente brukere')

      const usersData = (json.users || []).map((u: any) => ({
        ...u,
        role: roleFromApi(u.role)
      }))

      // Fetch clips data EXACTLY like bedrift-dashboard does
      const businessUsers = usersData.filter((u: UserRow) => u.role === 'business_user')
      const businessUserIds = businessUsers.map((u: UserRow) => u.id)

      if (businessUserIds.length > 0) {
        const { data: clipsData, error: clipsError } = await supabase
          .from('business_clips')
          .select('user_id, remaining_clips, total_monthly_clips, next_reset_date')
          .in('user_id', businessUserIds)

        if (!clipsError && clipsData) {
          // Merge clips data with users
          const usersWithClips = usersData.map((user: UserRow) => {
            if (user.role === 'business_user') {
              const userClips = clipsData.find(c => c.user_id === user.id)
              if (userClips) {
                return {
                  ...user,
                  clips: {
                    remaining: userClips.remaining_clips,
                    total: userClips.total_monthly_clips,
                    nextReset: userClips.next_reset_date
                  }
                }
              }
            }
            return user
          })
          setUsers(usersWithClips)
        } else {
          setUsers(usersData)
        }
      } else {
        setUsers(usersData)
      }

      setMessage(null)
    } catch (e: any) {
      console.error('Feil ved henting av brukere:', e)
      showMessage('error', e?.message || 'Kunne ikke hente brukere')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchUsers()
    setRefreshing(false)
  }

  const updateUserRole = async (userId: string, newRole: EffRole) => {
    setUpdating(userId)
    try {
      const token = await getAccessTokenOrWait()
      if (!token) {
        showMessage('error', 'Ikke autoriserad')
        return
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, role: roleToApi(newRole) }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Kunne ikke oppdatere')

      const updatedUser = { ...json.user, role: roleFromApi(json.user.role) }
      
      // If changing TO business_user, ensure clips are initialized
      if (newRole === 'business_user') {
        const { error: clipsError } = await supabase
          .from('business_clips')
          .upsert({ 
            user_id: userId,
            remaining_clips: 30,
            total_monthly_clips: 30,
            next_reset_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
        
        if (clipsError) {
          console.log('Feil ved initialisering av klipp:', clipsError)
        }
      }

      setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)))
      showMessage('success', 'Brukerrolle oppdatert')
      
      // Refresh to get updated clips data
      await fetchUsers()
    } catch (e: any) {
      showMessage('error', 'Feil ved oppdatering: ' + (e?.message || 'ukjent'))
    } finally {
      setUpdating(null)
    }
  }

  const adjustClips = async (user: UserRow, amount: number) => {
    if (!user.clips) return
    
    const newAmount = Math.max(0, user.clips.remaining + amount)
    setUpdating(user.id)
    
    try {
      const { error } = await supabase
        .from('business_clips')
        .update({ 
          remaining_clips: newAmount,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) throw error

      // Update local state
      setUsers((prev) => prev.map((u) => 
        u.id === user.id && u.clips
          ? { ...u, clips: { ...u.clips, remaining: newAmount } }
          : u
      ))

      showMessage('success', `${Math.abs(amount)} klipp ${amount > 0 ? 'lagt til' : 'fjernet'} for ${user.email}`)
    } catch (e: any) {
      showMessage('error', 'Feil ved justering av klipp: ' + (e?.message || 'ukjent'))
    } finally {
      setUpdating(null)
    }
  }

  const updateClips = async () => {
    if (!clipsModal.user) return
    
    const newAmount = parseInt(clipsModal.newAmount)
    if (isNaN(newAmount) || newAmount < 0) {
      showMessage('error', 'Ugyldig antall klipp')
      return
    }

    setUpdating(clipsModal.user.id)
    try {
      const token = await getAccessTokenOrWait()
      if (!token) {
        showMessage('error', 'Ikke autoriserad')
        return
      }

      // Use admin API for consistent access
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: clipsModal.user.id,
          update_clips: newAmount 
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Kunne ikke oppdatere klipp')

      // Refresh to get updated data
      await fetchUsers()
      showMessage('success', `Klipp oppdatert til ${newAmount} for ${clipsModal.user.email}`)
      setClipsModal({ open: false, user: null, newAmount: '', reason: '' })
    } catch (e: any) {
      showMessage('error', 'Feil ved oppdatering av klipp: ' + (e?.message || 'ukjent'))
    } finally {
      setUpdating(null)
    }
  }

  const addUser = async () => {
    if (!addEmail.trim()) {
      showMessage('error', 'E-post er påkrevd')
      return
    }

    if (!addPassword.trim() || addPassword.trim().length < 4) {
      showMessage('error', 'Passord må være minst 4 tegn')
      return
    }

    setAdding(true)
    try {
      const token = await getAccessTokenOrWait()
      if (!token) {
        showMessage('error', 'Ikke autoriserad')
        return
      }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: addEmail.trim(),
          role: roleToApi(addRole),
          password: addPassword.trim(),
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Kunne ikke legge til bruker')

      const created = { ...json.user, role: roleFromApi(json.user.role) }
      const nameFinal = addName.trim() || created.name || created.email.split('@')[0]
      setUsers((prev) => {
        const exists = prev.some((u) => u.id === created.id)
        const merged = { ...created, name: nameFinal }
        return exists ? prev.map((u) => (u.id === created.id ? merged : u)) : [merged, ...prev]
      })

      setAddEmail('')
      setAddName('')
      setAddRole('private_user')
      setAddPassword('')
      setShowAdd(false)

      showMessage('success', 'Bruker lagt til / oppdatert')
      
      // If new user is business, refresh to get clips data
      if (addRole === 'business_user') {
        await fetchUsers()
      }
    } catch (e: any) {
      showMessage('error', e?.message || 'Ukjent feil ved opprettelse')
    } finally {
      setAdding(false)
    }
  }

  const openBanModal = (user: UserRow, isUnban = false) => {
    setBanModal({ open: true, user, reason: '', isUnban })
  }

  const submitBanChange = async () => {
    if (!banModal.user) return
    const { user, reason, isUnban } = banModal
    setUpdating(user.id)
    try {
      const token = await getAccessTokenOrWait()
      if (!token) {
        showMessage('error', 'Ikke autoriserad')
        return
      }

      const payload = isUnban
        ? { user_id: user.id, unban: true }
        : { user_id: user.id, ban: true, reason: reason?.trim() || undefined }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Kunne ikke oppdatere ban-status')

      const updatedUser = { ...json.user, role: roleFromApi(json.user.role) }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)))
      showMessage('success', isUnban ? 'Bruker er fjernet fra ban' : 'Bruker er bannet')
      setBanModal({ open: false, user: null, reason: '', isUnban: false })
    } catch (e: any) {
      showMessage('error', e?.message || 'Feil ved endring av ban-status')
    } finally {
      setUpdating(null)
    }
  }

  const openRevokeModal = (user: UserRow, isRestore = false) => {
    setRevokeModal({ open: true, user, reason: '', isRestore })
  }

  const submitRevokeChange = async () => {
    if (!revokeModal.user) return
    const { user, reason, isRestore } = revokeModal
    setUpdating(user.id)
    try {
      const token = await getAccessTokenOrWait()
      if (!token) {
        showMessage('error', 'Ikke autoriserad')
        return
      }

      const payload = isRestore
        ? { user_id: user.id, restore_business_access: true }
        : { user_id: user.id, revoke_business_access: true, reason: reason?.trim() || undefined }

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Kunne ikke endre bedriftstilgang')

      const updatedUser = { ...json.user, role: roleFromApi(json.user.role) }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updatedUser : u)))
      showMessage(
        'success',
        isRestore ? 'Bedriftstilgang åpnet igjen' : 'Bedriftstilgang stengt for bruker'
      )
      setRevokeModal({ open: false, user: null, reason: '', isRestore: false })
    } catch (e: any) {
      showMessage('error', e?.message || 'Feil ved endring av bedriftstilgang')
    } finally {
      setUpdating(null)
    }
  }

  const openClipsModal = (user: UserRow) => {
    setClipsModal({ 
      open: true, 
      user, 
      newAmount: user.clips?.remaining.toString() || '30',
      reason: ''
    })
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const getRoleIcon = (role: EffRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="text-red-600" size={20} />
      case 'business_user':
        return <Building className="text-blue-600" size={20} />
      default:
        return <User className="text-slate-500" size={20} />
    }
  }

  const getRoleText = (role: EffRole) => {
    switch (role) {
      case 'admin':
        return 'Administrator'
      case 'business_user':
        return 'Bedrift'
      default:
        return 'Privatperson'
    }
  }

  const getRoleBadgeColor = (role: EffRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'business_user':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getClipStatusColor = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100
    if (percentage > 50) return 'text-green-600'
    if (percentage > 20) return 'text-yellow-600'
    if (percentage > 0) return 'text-orange-600'
    return 'text-red-600'
  }

  const stats = useMemo(() => {
    const privateUsers = users.filter((u) => u.role === 'private_user').length
    const businessUsers = users.filter((u) => u.role === 'business_user').length
    const adminUsers = users.filter((u) => u.role === 'admin').length
    const bannedUsers = users.filter((u) => u.banned).length
    const revokedAccess = users.filter((u) => u.business_access_revoked).length
    
    const today = new Date().toDateString()
    const todayCount = users.filter(u => new Date(u.created_at).toDateString() === today).length

    return { privateUsers, businessUsers, adminUsers, bannedUsers, revokedAccess, todayCount, total: users.length }
  }, [users])

  const filteredUsers = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      return name.includes(q) || email.includes(q)
    })
  }, [users, debouncedSearch])

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
            <p className="text-slate-600 font-medium text-center">Laster brukere…</p>
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
                <h1 className="text-2xl font-bold text-slate-800">Brukerhåndtering</h1>
                <p className="text-slate-600 font-medium mt-2">Administrer brukere, roller, tilgang og klipp til systemet</p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowAdd(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  title="Legg til ny bruker"
                >
                  <Plus size={18} />
                  Ny bruker
                </button>
                <button
                  onClick={onRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0009e2] hover:bg-blue-600 text-white text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  title="Oppdater alle brukere"
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
              {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
              <span className="font-semibold">{message.text}</span>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
            <StatsCard
              icon={<Users />}
              label="Totalt"
              value={stats.total}
              color="default"
            />
            <StatsCard
              icon={<User />}
              label="Privatpersoner"
              value={stats.privateUsers}
              color="info"
            />
            <StatsCard
              icon={<Building />}
              label="Bedrifter"
              value={stats.businessUsers}
              color="success"
            />
            <StatsCard
              icon={<Shield />}
              label="Administratorer"
              value={stats.adminUsers}
              color="danger"
            />
            <StatsCard
              icon={<BanIcon />}
              label="Bannede"
              value={stats.bannedUsers}
              color="warning"
            />
            <StatsCard
              icon={<TrendingUp />}
              label="I dag"
              value={stats.todayCount}
              color="info"
            />
          </div>

          {/* Search and Controls */}
          <div className="mb-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søk etter e-post eller navn…"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent font-medium"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
                <Info size={16} />
                <span className="font-medium">Banning sperrer all innlogging • Bedriftstilgang påvirker kun bedriftsportalen • Klipp styrer kontakttilgang</span>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    {debouncedSearch ? `Søkeresultater (${filteredUsers.length})` : `Alle brukere (${users.length})`}
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

            {filteredUsers.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <User className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-800 mb-2">Ingen brukere funnet</h3>
                <p className="text-slate-600 font-medium">
                  {debouncedSearch ? 'Prøv å justere søkekriteriene.' : 'Legg til brukere for å komme i gang.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-50/80">
                    <tr className="border-b border-slate-200">
                      <Th>Bruker</Th>
                      <Th>Status</Th>
                      <Th>Rolle</Th>
                      <Th>Klipp</Th>
                      <Th>Opprettet</Th>
                      <Th>Handlinger</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <Td>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {user.name || <span className="italic text-slate-500">Ukjent navn</span>}
                            </div>
                            <div className="text-sm text-slate-600 font-medium">{user.email}</div>
                          </div>
                        </Td>

                        <Td>
                          <div className="flex flex-wrap items-center gap-2">
                            {user.banned ? (
                              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
                                <BanIcon size={14} /> Bannet
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle size={14} /> Aktiv
                              </span>
                            )}
                            {user.role === 'business_user' && (
                              user.business_access_revoked ? (
                                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                  <Lock size={14} /> Tilgang stengt
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                                  <Unlock size={14} /> Tilgang åpen
                                </span>
                              )
                            )}
                          </div>
                        </Td>

                        <Td>
                          <div className="flex items-center gap-3">
                            {getRoleIcon(user.role)}
                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full border ${getRoleBadgeColor(user.role)}`}>
                              {getRoleText(user.role)}
                            </span>
                          </div>
                        </Td>

                        <Td>
                          {user.role === 'business_user' && user.clips ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-semibold ${getClipStatusColor(user.clips.remaining, user.clips.total)}`}>
                                {user.clips.remaining}/{user.clips.total}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => adjustClips(user, -1)}
                                  disabled={updating === user.id || user.clips.remaining === 0}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-red-100 hover:bg-red-200 text-red-700 border border-red-200 transition-all duration-200 disabled:opacity-50"
                                  title="Fjern 1 klipp"
                                >
                                  <Minus size={12} />
                                </button>
                                <button
                                  onClick={() => adjustClips(user, 1)}
                                  disabled={updating === user.id}
                                  className="inline-flex items-center justify-center w-6 h-6 rounded bg-green-100 hover:bg-green-200 text-green-700 border border-green-200 transition-all duration-200 disabled:opacity-50"
                                  title="Legg til 1 klipp"
                                >
                                  <Plus size={12} />
                                </button>
                                <button
                                  onClick={() => openClipsModal(user)}
                                  disabled={updating === user.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium transition-all duration-200 disabled:opacity-50"
                                  title="Rediger klipp"
                                >
                                  <Edit size={12} />
                                </button>
                              </div>
                            </div>
                          ) : user.role === 'business_user' ? (
                            <span className="text-xs text-slate-500 italic">Ikke initialisert</span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </Td>

                        <Td>
                          <span className="text-sm text-slate-600 font-medium">
                            {new Date(user.created_at).toLocaleDateString('no-NO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </Td>

                        <Td>
                          <div className="flex items-center gap-2">
                            <select
                              value={user.role}
                              onChange={(e) => updateUserRole(user.id, e.target.value as EffRole)}
                              disabled={updating === user.id}
                              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent disabled:opacity-50"
                            >
                              <option value="private_user">Privatperson</option>
                              <option value="business_user">Bedrift</option>
                              <option value="admin">Administrator</option>
                            </select>

                            {user.banned ? (
                              <button
                                onClick={() => openBanModal(user, true)}
                                disabled={updating === user.id}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold transition-all duration-200 disabled:opacity-50"
                                title="Fjern ban"
                              >
                                <Unlock size={16} />
                                Unban
                              </button>
                            ) : (
                              <button
                                onClick={() => openBanModal(user, false)}
                                disabled={updating === user.id}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                                title="Ban bruker"
                              >
                                <BanIcon size={16} />
                                Ban
                              </button>
                            )}

                            {user.role === 'business_user' && (
                              user.business_access_revoked ? (
                                <button
                                  onClick={() => openRevokeModal(user, true)}
                                  disabled={updating === user.id}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-[#0009e2] hover:bg-blue-600 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                                  title="Åpne bedriftstilgang"
                                >
                                  <Unlock size={16} />
                                  Åpne tilgang
                                </button>
                              ) : (
                                <button
                                  onClick={() => openRevokeModal(user, false)}
                                  disabled={updating === user.id}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                                  title="Steng bedriftstilgang"
                                >
                                  <Lock size={16} />
                                  Steng bedrift
                                </button>
                              )
                            )}

                            {updating === user.id && (
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

        {/* Add User Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Legg til ny bruker</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">E-post</label>
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                    placeholder="bruker@domene.no"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Brukeren opprettes eller oppdateres hvis e-posten allerede finnes. Nytt passord vil overskrive eksisterende.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Navn (valgfritt)</label>
                  <input
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                    placeholder="Fornavn Etternavn"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Passord</label>
                  <input
                    type="password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                    placeholder="Minimum 4 tegn"
                    required
                    minLength={4}
                  />
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Brukeren kan logge inn umiddelbart med dette passordet.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Rolle</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value as EffRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                  >
                    <option value="private_user">Privatperson</option>
                    <option value="business_user">Bedrift</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                  onClick={() => setShowAdd(false)}
                  disabled={adding}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl text-white bg-[#0009e2] hover:bg-blue-600 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                  onClick={addUser}
                  disabled={adding}
                >
                  {adding ? 'Lagrer…' : 'Lagre bruker'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clips Modal */}
        {clipsModal.open && clipsModal.user && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-200">
              <h3 className="text-xl font-bold text-slate-800 mb-3">Rediger klipp</h3>
              <p className="text-sm text-slate-600 font-medium mb-6">
                Endre antall klipp for {clipsModal.user.email}
              </p>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Nytt antall klipp</label>
                  <input
                    type="number"
                    value={clipsModal.newAmount}
                    onChange={(e) => setClipsModal(s => ({ ...s, newAmount: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                    placeholder="30"
                    min="0"
                    max="999"
                  />
                  <p className="text-xs text-slate-500 mt-2 font-medium">
                    Nåværende: {clipsModal.user.clips?.remaining || 0} / {clipsModal.user.clips?.total || 0}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Begrunnelse (valgfritt)</label>
                  <textarea
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
                    rows={3}
                    placeholder="F.eks. manglende betaling, bonus, osv."
                    value={clipsModal.reason}
                    onChange={(e) => setClipsModal(s => ({ ...s, reason: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                  onClick={() => setClipsModal({ open: false, user: null, newAmount: '', reason: '' })}
                  disabled={updating === clipsModal.user?.id}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  className="px-6 py-3 rounded-xl text-white bg-[#0009e2] hover:bg-blue-600 disabled:opacity-50 font-semibold transition-all duration-200 shadow-lg"
                  onClick={updateClips}
                  disabled={updating === clipsModal.user?.id}
                >
                  {updating === clipsModal.user?.id ? 'Oppdaterer…' : 'Oppdater klipp'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Ban Modal */}
        {banModal.open && banModal.user && (
          <ConfirmModal
            title={banModal.isUnban ? 'Fjern ban' : 'Ban bruker'}
            description={
              banModal.isUnban
                ? `Er du sikker på at du vil fjerne ban for ${banModal.user.email}?`
                : `Er du sikker på at du vil banne ${banModal.user.email}? Brukeren vil ikke kunne logge inn.`
            }
            reasonLabel={banModal.isUnban ? undefined : 'Årsak (valgfritt)'}
            reason={banModal.reason}
            onReasonChange={(v) => setBanModal((s) => ({ ...s, reason: v }))}
            confirmLabel={banModal.isUnban ? 'Fjern ban' : 'Ban bruker'}
            confirmVariant={banModal.isUnban ? 'primary' : 'danger'}
            onCancel={() => setBanModal({ open: false, user: null, reason: '', isUnban: false })}
            onConfirm={submitBanChange}
          />
        )}

        {/* Revoke Modal */}
        {revokeModal.open && revokeModal.user && (
          <ConfirmModal
            title={revokeModal.isRestore ? 'Åpne bedriftstilgang' : 'Steng bedriftstilgang'}
            description={
              revokeModal.isRestore
                ? `Åpne bedriftstilgang for ${revokeModal.user.email}?`
                : `Stenge bedriftstilgang for ${revokeModal.user.email}? Brukeren vil ikke ha tilgang til bedriftsportalen før tilgangen åpnes igjen.`
            }
            reasonLabel={revokeModal.isRestore ? undefined : 'Årsak (f.eks. manglende betaling)'}
            reason={revokeModal.reason}
            onReasonChange={(v) => setRevokeModal((s) => ({ ...s, reason: v }))}
            confirmLabel={revokeModal.isRestore ? 'Åpne tilgang' : 'Steng tilgang'}
            confirmVariant={revokeModal.isRestore ? 'primary' : 'warning'}
            onCancel={() => setRevokeModal({ open: false, user: null, reason: '', isRestore: false })}
            onConfirm={submitRevokeChange}
          />
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
        <div className={`p-3 rounded-xl border ${colorClasses[color]} flex-shrink-0`}>
          <div className="w-6 h-6">
            {icon}
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

function ConfirmModal(props: {
  title: string
  description: string
  reasonLabel?: string
  reason?: string
  onReasonChange?: (v: string) => void
  confirmLabel: string
  confirmVariant?: 'primary' | 'danger' | 'warning'
  onCancel: () => void
  onConfirm: () => void
}) {
  const {
    title,
    description,
    reasonLabel,
    reason,
    onReasonChange,
    confirmLabel,
    confirmVariant = 'primary',
    onCancel,
    onConfirm,
  } = props

  const confirmClasses =
    confirmVariant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg'
      : confirmVariant === 'warning'
        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg'
        : 'bg-[#0009e2] hover:bg-blue-600 text-white shadow-lg'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
        <p className="text-sm text-slate-600 font-medium mb-6">{description}</p>

        {reasonLabel && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-600 mb-2">{reasonLabel}</label>
            <textarea
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0009e2] focus:border-transparent"
              rows={3}
              placeholder="Skriv en kort begrunnelse (vises i logg/varsler)…"
              value={reason}
              onChange={(e) => onReasonChange && onReasonChange(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="px-6 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors"
            onClick={onCancel}
          >
            Avbryt
          </button>
          <button
            type="button"
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${confirmClasses}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}