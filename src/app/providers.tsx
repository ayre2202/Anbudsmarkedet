// src/app/providers.tsx
'use client'

import { createContext, useContext, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// Henter miljøvariabler kun én gang – ingen flere instanser!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Singleton pattern: Sørger for kun én instans per app
let singletonClient: ReturnType<typeof createClient> | null = null
function getSupabaseClient() {
  if (!singletonClient) {
    singletonClient = createClient(supabaseUrl, supabaseAnonKey)
  }
  return singletonClient
}

// Context
const SupabaseContext = createContext(getSupabaseClient())

export const useSupabase = () => useContext(SupabaseContext)

// Provider (kan brukes, eller ignoreres trygt!)
export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  // Sørger for at samme klient brukes i hele appen
  const clientRef = useRef(getSupabaseClient())
  return (
    <SupabaseContext.Provider value={clientRef.current}>
      {children}
    </SupabaseContext.Provider>
  )
}
