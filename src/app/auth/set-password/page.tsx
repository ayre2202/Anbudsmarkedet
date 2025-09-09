'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '@/lib/supabase/client'

export default function SetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Current URL:', window.location.href)
        console.log('Search params:', Object.fromEntries(searchParams.entries()))

        const token = searchParams.get('token')
        const type = searchParams.get('type')

        if (token && type === 'invite') {
          console.log('Processing invite token...')

          // Verify invite token
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'invite'
          })

          console.log('Verify OTP result:', { data, error })

          if (error) {
            console.error('Token verification error:', error)
            setError('Ugyldig eller utløpt invitasjonslenke: ' + error.message)
            setInitializing(false)
            return
          }

          if (data.session) {
            console.log('Session established successfully')
            setInitializing(false)
            return
          }
        }

        // Fallback: sjekk om vi allerede har en session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        console.log('Session fallback check:', {
          hasSession: !!session,
          error: sessionError?.message
        })

        if (session) {
          console.log('Existing session found')
          setInitializing(false)
          return
        }

        setError('Ingen gyldig session funnet. Klikk på lenken i e-posten på nytt.')
        setInitializing(false)

      } catch (err) {
        console.error('Auth callback error:', err)
        setError('En feil oppstod: ' + (err as Error).message)
        setInitializing(false)
      }
    }

    handleAuthCallback()
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    console.log('Starting password update process...')

    if (password.length < 6) {
      setError('Passordet må være minst 6 tegn langt')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passordene stemmer ikke overens')
      setLoading(false)
      return
    }

    try {
      // Sjekk current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      console.log('Current session:', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        sessionError: sessionError?.message
      })

      if (!session) {
        console.error('No session found')
        setError('Ingen aktiv session. Prøv å klikke på lenken i e-posten på nytt.')
        setLoading(false)
        return
      }

      console.log('Attempting to update password...')

      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      console.log('Password update result:', {
        success: !!updateData?.user,
        userId: updateData?.user?.id,
        error: updateError?.message,
        errorCode: updateError?.status,
        fullError: updateError
      })

      if (updateError) {
        console.error('Password update failed:', updateError)

        if (updateError.message.includes('same as the old password')) {
          setError('Det nye passordet må være forskjellig fra det gamle')
        } else if (updateError.message.includes('Password should be')) {
          setError('Passordet oppfyller ikke kravene. Prøv et sterkere passord.')
        } else {
          setError('Kunne ikke oppdatere passord: ' + updateError.message)
        }
        setLoading(false)
        return
      }

      // ** Nytt tillegg: revalider/refresh session slik at frontend oppdateres **
      await supabase.auth.refreshSession()  // Viktig for å få ny session aktivert med nytt passord

      console.log('Password updated successfully!')

      // Opprett/oppdater profil - men ikke la dette stoppe prosessen
      try {
        console.log('Creating/updating profile...')

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: session.user.id,
            role: 'private_user',
            full_name: session.user.email?.split('@')[0] || '',
            address: '',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })

        if (profileError) {
          console.log('Profile error (non-critical):', profileError)
        } else {
          console.log('Profile created/updated successfully')
        }
      } catch (profileError) {
        console.log('Profile error (non-critical):', profileError)
      }

      console.log('Process completed successfully!')
      setSuccess(true)
      setLoading(false)

      // Redirect etter 2 sekunder
      setTimeout(() => {
        console.log('Redirecting to dashboard...')
        router.push('/privat-dashboard')
      }, 2000)

    } catch (err) {
      console.error('Unexpected error in handleSubmit:', err)

      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          setError('Nettverksfeil. Sjekk internettforbindelsen din og prøv igjen.')
        } else if (err.message.includes('timeout')) {
          setError('Operasjonen tok for lang tid. Prøv igjen.')
        } else {
          setError('En uventet feil oppstod: ' + err.message)
        }
      } else {
        setError('En ukjent feil oppstod. Prøv igjen.')
      }

      setLoading(false)
    }
  }

  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Behandler invitasjon...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="text-green-600 text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Passord opprettet!
              </h2>
              <p className="text-gray-600 mb-4">
                Ditt passord er nå satt. Du blir automatisk videresendt til ditt dashboard.
              </p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Velkommen til Anbudsmarkedet! 👋
          </h2>
          <p className="text-gray-600 mb-8">
            Sett ditt passord for å fullføre registreringen
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nytt passord
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Minst 6 tegn"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Bekreft passord
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Skriv passordet på nytt"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Oppretter passord...
                  </div>
                ) : (
                  'Opprett passord'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Ved å opprette passord godtar du våre{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-500">
                vilkår og betingelser
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
