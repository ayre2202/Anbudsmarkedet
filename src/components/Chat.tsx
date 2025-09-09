'use client'
import { useState, useEffect, useRef } from 'react'
import supabase from '@/lib/supabase/client'

export default function Chat({
  jobId,
  role,
}: {
  jobId: string
  role: 'private_user' | 'business_user'
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMsg, setNewMsg] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const [channel, setChannel] = useState<any>(null)

  useEffect(() => {
    let _channel: any
    const init = async () => {
      // Hent gamle meldinger
      const { data } = await supabase
        .from('messages')
        .select('sender_role, content')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true })
      setMessages(data || [])

      // Abonner på nye
      _channel = supabase
        .channel(`messages_job_${jobId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `job_id=eq.${jobId}` },
          (payload: any) => setMessages((prev: any[]) => [...prev, payload.new])
        )
        .subscribe()

      setChannel(_channel)
    }
    init()
    return () => {
      if (_channel) supabase.removeChannel(_channel)
    }
  }, [jobId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!newMsg.trim()) return
    await supabase.from('messages').insert({ job_id: jobId, sender_role: role, content: newMsg })
    setNewMsg('')
  }

  return (
    <div className="border p-4 space-y-2">
      <div className="h-48 overflow-y-auto bg-gray-50 p-2">
        {messages.map((m, i) => (
          <div key={i} className={m.sender_role === role ? 'text-right' : 'text-left'}>
            <span className="inline-block bg-blue-100 p-1 rounded">{m.content}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border p-2 rounded"
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          placeholder="Skriv melding…"
        />
        <button onClick={send} className="bg-blue-600 text-white px-4 rounded">Send</button>
      </div>
    </div>
  )
}
