'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = { id: string; name: string }
type Engagement = { id: string; title: string; client_id: string }
type LineItem = { description: string; quantity: number; unit_price: number }
type Quotation = {
  id: string
  status: string
  total: number
  created_at: string
  clients: { name: string } | null
}

export default function QuotationsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // form state
  const [clientId, setClientId] = useState('')
  const [engagementId, setEngagementId] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: clientsData } = await supabase.from('clients').select('id, name').order('name')
    setClients(clientsData ?? [])

    const { data: engagementsData } = await supabase
      .from('engagements')
      .select('id, title, client_id')
      .order('title')
    setEngagements(engagementsData ?? [])

    const { data: quotationsData, error: quotationsError } = await supabase
      .from('quotations')
      .select('id, status, total, created_at, clients(name)')
      .order('created_at', { ascending: false })

    if (quotationsError) {
      setError(quotationsError.message)
    } else {
      setQuotations((quotationsData as unknown as Quotation[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) => {
      const next = [...prev]
      if (field === 'description') {
        next[index] = { ...next[index], description: value }
      } else {
        next[index] = { ...next[index], [field]: parseFloat(value) || 0 }
      }
      return next
    })
  }

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  const computedTotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

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

    // 1. Insert the quotation
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .insert({
        business_id: profile!.business_id,
        client_id: clientId,
        engagement_id: engagementId || null,
        status: 'draft',
        total: computedTotal,
      })
      .select()
      .single()

    if (quotationError || !quotation) {
      setError(quotationError?.message ?? 'Failed to create quotation')
      setSubmitting(false)
      return
    }

    // 2. Insert line items referencing the new quotation
    const itemsToInsert = lineItems
      .filter((item) => item.description.trim() !== '')
      .map((item) => ({
        quotation_id: quotation.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from('quotation_line_items').insert(itemsToInsert)
      if (itemsError) {
        setError(itemsError.message)
        setSubmitting(false)
        return
      }
    }

    setSubmitting(false)
    setClientId('')
    setEngagementId('')
    setLineItems([{ description: '', quantity: 1, unit_price: 0 }])
    loadData()
  }

  if (loading) {
    return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading...</main>
  }

  const filteredEngagements = clientId
    ? engagements.filter((e) => e.client_id === clientId)
    : engagements

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Quotations</h1>

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
        <h2 style={{ fontSize: '1rem' }}>New Quotation</h2>

        <select
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value)
            setEngagementId('')
          }}
          required
          style={{ padding: '0.5rem' }}
        >
          <option value="">Select client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select value={engagementId} onChange={(e) => setEngagementId(e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">No engagement (optional)</option>
          {filteredEngagements.map((eng) => (
            <option key={eng.id} value={eng.id}>{eng.title}</option>
          ))}
        </select>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Line Items</p>
          {lineItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                style={{ padding: '0.4rem', flex: 3 }}
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                style={{ padding: '0.4rem', flex: 1 }}
                min={0}
              />
              <input
                type="number"
                placeholder="Unit Price (₦)"
                value={item.unit_price}
                onChange={(e) => updateLineItem(i, 'unit_price', e.target.value)}
                style={{ padding: '0.4rem', flex: 1 }}
                min={0}
              />
              {lineItems.length > 1 && (
                <button type="button" onClick={() => removeLineItem(i)} style={{ padding: '0.4rem' }}>
                  ✕
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addLineItem} style={{ padding: '0.4rem', alignSelf: 'flex-start' }}>
            + Add line item
          </button>
        </div>

        <p style={{ fontWeight: 'bold' }}>Total: ₦{computedTotal.toLocaleString()}</p>

        <button
          type="submit"
          disabled={submitting}
          style={{ padding: '0.6rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          {submitting ? 'Creating...' : 'Create Quotation'}
        </button>
      </form>

      <h2 style={{ marginBottom: '1rem' }}>All Quotations</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {quotations.map((q) => (
          <div key={q.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
            <p style={{ fontWeight: 'bold' }}>{q.clients?.name} — ₦{Number(q.total).toLocaleString()}</p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>Status: {q.status}</p>
          </div>
        ))}
        {quotations.length === 0 && <p>No quotations yet.</p>}
      </div>
    </main>
  )
}
