'use client'
import { useEffect } from 'react'
import supabase from '@/lib/supabase/client'

export default function Debug() {
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      console.log("ALL DATA:", data)
      console.log("ALL ERROR:", error)
    })()
  }, [])

  return <div>Se konsoll for data</div>
}
