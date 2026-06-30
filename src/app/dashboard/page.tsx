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

export default function DashboardPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get the user's profile to find their business
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) {
        setError('Could not load profile.')
        setLoading(false)
        return
      }

      // Get the business name
      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', profile.business_id)
        .single()

      setBusinessName(business?.name ?? 'Unknown business')

      // Get clients — RLS should automatically scope this to the business
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email, phone, notes')
        .order('created_at', { ascending: true })

      if (clientsError) {
        setError(clientsError.message)
      } else {
        setClients(clientsData ?? [])
      }

      setLoading(false)
    }

    loadDashboard()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading dashboard...</main>
  }

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>{businessName} — Dashboard</h1>
        <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
          Log out
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <section style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', flex: 1 }}>
          <p style={{ fontSize: '0.85rem', color: '#666' }}>Total Clients</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{clients.length}</p>
        </div>
      </section>

      <h2 style={{ marginBottom: '1rem' }}>Clients</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {clients.map((client) => (
          <div key={client.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
            <p style={{ fontWeight: 'bold' }}>{client.name}</p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>{client.email} · {client.phone}</p>
            {client.notes && <p style={{ fontSize: '0.85rem', marginTop: '0.4rem' }}>{client.notes}</p>}
          </div>
        ))}
        {clients.length === 0 && !error && <p>No clients yet.</p>}
      </div>
    </main>
  )
}
