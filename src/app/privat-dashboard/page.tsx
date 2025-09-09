'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import supabase from '@/lib/supabase/client'
import { format } from 'date-fns'
import ChangePasswordModal from '@/components/ChangePasswordModal'
import { Lock } from 'lucide-react'

type JobItem = {
  id: string
  title: string
  created_at: string
  status?: 'pending' | 'approved' | 'rejected' | 'archived'
  rejected_reason?: string | null
  job_id?: string
}

export default function PrivatDashboard() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [memberSince, setMemberSince] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  useEffect(() => {
    let ignore = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    ;(async () => {
      const sb = supabase
      const { data: { session } } = await sb.auth.getSession()

      if (!session) {
        if (!ignore) {
          setIsAuthenticated(false)
          setLoading(false)
          router.push('/')
        }
        return
      }

      const { data: profile, error: profErr } = await sb
        .from('profiles')
        .select('role')
        .eq('user_id', session.user.id)
        .single()

      if (!profile || profErr || profile.role !== 'private_user') {
        if (!ignore) {
          setIsAuthenticated(false)
          setLoading(false)
          router.push('/')
        }
        return
      }

      const { data } = await sb
        .from('jobs')
        .select('id,title,created_at,status,rejected_reason,job_id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })

      if (!ignore) {
        setJobs((data || []) as JobItem[])
        setIsAuthenticated(true)
        setLoading(false)

        if (data && data.length > 0) {
          setMemberSince(format(new Date(data[0].created_at), 'dd.MM.yyyy'))
        } else {
          setMemberSince(format(new Date((session.user as any).created_at || Date.now()), 'dd.MM.yyyy'))
        }
      }

      channel = sb
        .channel(`jobs-private-${session.user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'jobs', filter: `user_id=eq.${session.user.id}` },
          (payload: any) => {
            setJobs(prev => {
              const next = new Map(prev.map(j => [j.id, j]))
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const row = payload.new as JobItem
                next.set(row.id, {
                  id: row.id,
                  title: (row as any).title,
                  created_at: (row as any).created_at,
                  status: (row as any).status,
                  rejected_reason: (row as any).rejected_reason ?? null,
                  job_id: (row as any).job_id,
                })
              } else if (payload.eventType === 'DELETE') {
                next.delete((payload.old as any).id)
              }
              return Array.from(next.values()).sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )
            })
          }
        )
        .subscribe()
    })()

    return () => {
      ignore = true
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [router])

  const sorted = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [jobs]
  )

  if (isAuthenticated === null || loading) {
    return <p className="p-6 text-center text-gray-600">Laster privat-dashbord…</p>
  }

  if (!isAuthenticated) {
    return null
  }

  const enterDeleteMode = () => setDeleteMode(true)
  const exitDeleteMode = () => {
    setDeleteMode(false)
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0) {
      return alert('Velg minst én jobb å slette.')
    }
    if (!confirm('Er du sikker? Dette sletter jobber permanent.')) return

    const sb = supabase

    for (const id of Array.from(selectedIds)) {
      await sb.from('messages').delete().eq('job_id', id)
      await sb.from('jobs').delete().eq('id', id)
    }

    setJobs(prev => prev.filter((j) => !selectedIds.has(j.id)))
    setSelectedIds(new Set())
    setDeleteMode(false)
    alert('Valgte jobber er slettet.')
  }

  const StatusBadge = ({ status, rejected_reason }: { status?: JobItem['status']; rejected_reason?: string | null }) => {
    if (status === 'approved') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Godkjent</span>
    }
    if (status === 'rejected') {
      return (
        <span
          title={rejected_reason || undefined}
          className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"
        >
          Avslått
        </span>
      )
    }
    if (status === 'archived') {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">Arkivert</span>
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full" style={{ backgroundColor: '#faf6f5', color: '#0009e2' }}>Venter på godkjenning</span>
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Min side</h1>
        {memberSince && (
          <p className="text-gray-600 text-sm md:text-base">
            Medlem siden: <span className="font-semibold">{memberSince}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {!deleteMode ? (
          <>
            <Link
              href="/privat-dashboard/new-job"
              className="bg-[#0009e2] hover:bg-[#0007b8] text-white px-5 py-2 rounded-md text-sm font-semibold transition shadow"
            >
              Legg ut ny jobb
            </Link>
            <Link
              href="/privat-dashboard/meldinger"
              className="bg-[#0009e2] hover:bg-[#0007b8] text-white px-5 py-2 rounded-md text-sm font-semibold transition shadow"
            >
              Meldinger
            </Link>
            <button
              onClick={() => setShowPasswordModal(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-5 py-2 rounded-md text-sm font-semibold transition shadow flex items-center gap-2"
            >
              <Lock size={16} /> Bytt passord
            </button>
            <button
              onClick={enterDeleteMode}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-md text-sm font-semibold transition shadow"
            >
              Slett jobber
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleConfirmDelete}
              className="bg-red-700 hover:bg-red-800 text-white px-5 py-2 rounded-md text-sm font-semibold transition shadow"
            >
              Bekreft sletting
            </button>
            <button
              onClick={exitDeleteMode}
              className="bg-gray-400 hover:bg-gray-500 text-white px-5 py-2 rounded-md text-sm font-semibold transition shadow"
            >
              Avbryt
            </button>
          </>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-center text-gray-600">Ingen jobber funnet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((job) => (
            <div
              key={job.id}
              className={`flex items-start border rounded-lg p-5 shadow-sm transition hover:shadow-lg hover:border-[#0009e2] cursor-pointer bg-white ${
                deleteMode ? 'opacity-90' : 'opacity-100'
              }`}
            >
              {deleteMode && (
                <input
                  type="checkbox"
                  checked={selectedIds.has(job.id)}
                  onChange={() => toggleSelect(job.id)}
                  className="mr-4 mt-1"
                />
              )}
              <Link 
                href={job.job_id ? `/privat-dashboard/${job.job_id}` : `/privat-dashboard/${job.id}`} // CHANGED: Use job_id if available
                className="flex-1 text-left"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-lg text-gray-900">{job.title}</h3>
                  <StatusBadge status={job.status} rejected_reason={job.rejected_reason} />
                </div>
                {job.job_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {job.job_id}
                  </p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  Opprettet: {new Date(job.created_at).toLocaleDateString('no-NB')}
                </p>
                {job.status === 'rejected' && job.rejected_reason && (
                  <p className="mt-2 text-xs text-red-600">Begrunnelse: {job.rejected_reason}</p>
                )}
              </Link>
            </div>
          ))}
        </div>
      )}

      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
    </div>
  )
}