'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = { id: string; name: string }
type Engagement = {
  id: string
  title: string
  type: string | null
  status: string
  client_id: string
  clients: { name: string } | null
}

export default function EngagementsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // form state
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [clientId, setClientId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .order('name')

    setClients(clientsData ?? [])

    const { data: engagementsData, error: engagementsError } = await supabase
      .from('engagements')
      .select('id, title, type, status, client_id, clients(name)')
      .order('created_at', { ascending: false })

    if (engagementsError) {
      setError(engagementsError.message)
    } else {
      setEngagements((engagementsData as unknown as Engagement[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user!.id)
      .single()

    const { error: insertError } = await supabase.from('engagements').insert({
      business_id: profile!.business_id,
      client_id: clientId,
      title,
      type,
      status: 'active',
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setTitle('')
    setType('')
    setClientId('')
    loadData()
  }

  if (loading) {
    return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading...</main>
  }

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Engagements</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <form
        onSubmit={handleCreate}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          marginBottom: '2rem',
          border: '1px solid #eee',
          padding: '1rem',
          borderRadius: '8px',
        }}
      >
        <h2 style={{ fontSize: '1rem' }}>New Engagement</h2>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        >
          <option value="">Select client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Title (e.g. Q3 Penetration Test)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">Select type...</option>
          <option value="pentest">Penetration Test</option>
          <option value="audit">Security Audit</option>
          <option value="retainer">Retainer</option>
          <option value="web_build">Web Build</option>
          <option value="other">Other</option>
        </select>
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '0.6rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {submitting ? 'Creating...' : 'Create Engagement'}
        </button>
      </form>

      <h2 style={{ marginBottom: '1rem' }}>All Engagements</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {engagements.map((eng) => (
          <div key={eng.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
            <p style={{ fontWeight: 'bold' }}>{eng.title}</p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              {eng.clients?.name} · {eng.type ?? 'No type'} · {eng.status}
            </p>
          </div>
        ))}
        {engagements.length === 0 && <p>No engagements yet.</p>}
      </div>
    </main>
  )
}
