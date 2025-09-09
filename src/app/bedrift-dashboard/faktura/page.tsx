'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import supabase from '@/lib/supabase/client'
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertTriangle,
  CreditCard,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'

type Invoice = {
  id: string
  amount: number
  kid: string
  due_date: string
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
}

export default function FakturaPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadInvoices()
  }, [router])

  const loadInvoices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/role-login')
        return
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('id,amount,kid,due_date,status,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInvoices(data || [])
      setError(null)
    } catch (e: any) {
      console.error('Kunne ikke hente fakturer:', e)
      setError('Kunne ikke hente fakturer. Prøv igjen senere.')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadInvoices()
    setRefreshing(false)
  }

  const getStatusIcon = (status: 'pending' | 'paid' | 'overdue') => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="text-green-500" size={20} />
      case 'overdue':
        return <AlertTriangle className="text-red-500" size={20} />
      default:
        return <Clock className="text-amber-500" size={20} />
    }
  }

  const getStatusText = (status: 'pending' | 'paid' | 'overdue') => {
    switch (status) {
      case 'paid':
        return 'Betalt'
      case 'overdue':
        return 'Forfalt'
      default:
        return 'Avventer betaling'
    }
  }

  const getStatusColor = (status: 'pending' | 'paid' | 'overdue') => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50'
      case 'overdue':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-amber-600 bg-amber-50'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf6f5] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-gray-400 mx-auto mb-4 animate-spin" />
              <p className="text-gray-500">Laster fakturer…</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#faf6f5] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Kunne ikke laste fakturer</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0009e2] text-white rounded-md hover:brightness-110"
              >
                <RefreshCw size={16} />
                Prøv igjen
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf6f5] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dine fakturer</h1>
            <p className="text-gray-600 mt-2">Oversikt over betalinger og forfallsdatoer</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow hover:shadow-md text-sm"
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} size={16} />
              Oppdater
            </button>
            <Link
              href="/bedrift-dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 text-[#0009e2] hover:underline text-sm"
            >
              <ArrowLeft size={16} />
              Tilbake til dashbord
            </Link>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen fakturer funnet</h3>
            <p className="text-gray-600">Du har ingen fakturer enda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Faktura #{invoice.kid}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Opprettet {new Date(invoice.created_at).toLocaleDateString('no-NO', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <CreditCard className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500">Beløp</p>
                      <p className="font-semibold text-gray-900">{invoice.amount.toLocaleString('no-NO')} NOK</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Receipt className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500">KID-nummer</p>
                      <p className="font-semibold text-gray-900 font-mono">{invoice.kid}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="text-gray-400" size={16} />
                    <div>
                      <p className="text-sm text-gray-500">Forfallsdato</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(invoice.due_date).toLocaleDateString('no-NO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {invoice.status !== 'paid' && (
                  <div className="bg-gray-50 rounded-md p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Betalingsinformasjon</h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      <p><strong>Kontonummer:</strong> 1234.56.78910</p>
                      <p><strong>Merk betaling med KID:</strong> <span className="font-mono bg-white px-2 py-1 rounded">{invoice.kid}</span></p>
                      {invoice.status === 'overdue' && (
                        <p className="text-red-600 font-medium mt-2">
                          ⚠️ Denne fakturen er forfalt. Vennligst betal så snart som mulig.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}