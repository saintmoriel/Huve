'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function loadClients() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, phone, notes')
      .order('created_at', { ascending: true })

    if (clientsError) {
      setError(clientsError.message)
    } else {
      setClients(data ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadClients()
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

    const { error: insertError } = await supabase.from('clients').insert({
      business_id: profile!.business_id,
      name,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    })

    setSubmitting(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setName('')
    setEmail('')
    setPhone('')
    setNotes('')
    loadClients()
  }

  if (loading) {
    return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading...</main>
  }

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Clients</h1>

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
        <h2 style={{ fontSize: '1rem' }}>Add Client</h2>
        <input
          type="text"
          placeholder="Client name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '0.5rem' }}
        />
        <input
          type="text"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: '0.5rem' }}
        />
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ padding: '0.5rem', resize: 'vertical' }}
          rows={2}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '0.6rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {submitting ? 'Adding...' : 'Add Client'}
        </button>
      </form>

      <h2 style={{ marginBottom: '1rem' }}>All Clients</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {clients.map((client) => (
          <div key={client.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
            <p style={{ fontWeight: 'bold' }}>{client.name}</p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              {client.email} {client.phone ? `· ${client.phone}` : ''}
            </p>
            {client.notes && <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>{client.notes}</p>}
          </div>
        ))}
        {clients.length === 0 && <p>No clients yet.</p>}
      </div>
    </main>
  )
}
