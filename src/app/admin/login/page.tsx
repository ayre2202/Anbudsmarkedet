'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '@/lib/supabase/client'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const search = useSearchParams()
  const next = search.get('next') || '/admin'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // 1) Logg inn (få access + refresh token her!)
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signErr) throw new Error(signErr.message)
      const session = data.session
      if (!session?.access_token || !session?.refresh_token) {
        throw new Error('Mangler session tokens')
      }

      // 2) Sync til server-cookies (så middleware ser sesjonen)
      const r = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j?.error || 'Kunne ikke sette server-session')
      }

      // 3) (valgfritt) rolle-sjekk i DB via client – UI-guard, backend håndhever uansett
      const { data: me } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()
      if (!me || me.role !== 'admin') {
        // rydde opp hvis ikke admin
        await fetch('/api/auth/signout', { method: 'POST', cache: 'no-store' }).catch(() => {})
        await supabase.auth.signOut()
        throw new Error('Denne kontoen har ikke admin-tilgang')
      }

      // 4) Inn i admin (til ev. next)
      router.replace(next)
    } catch (err: any) {
      setError(err?.message || 'Uventet feil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#faf6f5' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8">
        <div className="flex items-center justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/anbuds_logo.png" alt="Anbudsmarkedet" className="h-16" />
        </div>
        <h1 className="text-xl font-semibold text-center mb-6">Admin innlogging</h1>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">E-post</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2"
              style={{ borderColor: '#e5e7eb' }}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Passord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2 outline-none focus:ring-2"
              style={{ borderColor: '#e5e7eb' }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md px-4 py-2 text-white font-semibold"
            style={{ backgroundColor: '#0009e2' }}
          >
            {loading ? 'Logger inn…' : 'Logg inn'}
          </button>
        </form>
      </div>
    </div>
  )
}
