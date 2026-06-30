'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Client = { id: string; name: string }
type Quotation = {
  id: string
  status: string
  total: number
  client_id: string
  clients: { name: string } | null
}
type LineItem = { description: string; quantity: number; unit_price: number }
type Invoice = {
  id: string
  status: string
  total: number
  due_date: string | null
  created_at: string
  quotation_id: string | null
  clients: { name: string } | null
}

export default function InvoicesPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  // standalone form state
  const [clientId, setClientId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0 },
  ])
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: clientsData } = await supabase.from('clients').select('id, name').order('name')
    setClients(clientsData ?? [])

    const { data: quotationsData } = await supabase
      .from('quotations')
      .select('id, status, total, client_id, clients(name)')
      .order('created_at', { ascending: false })
    setQuotations((quotationsData as unknown as Quotation[]) ?? [])

    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, status, total, due_date, created_at, quotation_id, clients(name)')
      .order('created_at', { ascending: false })

    if (invoicesError) {
      setError(invoicesError.message)
    } else {
      setInvoices((invoicesData as unknown as Invoice[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function getBusinessId() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user!.id)
      .single()
    return profile!.business_id
  }

  // Generate invoice from an existing quotation, copying its line items
  async function handleGenerateFromQuotation(quotation: Quotation) {
    setGenerating(quotation.id)
    setError(null)

    const businessId = await getBusinessId()

    // Pull the quotation's line items
    const { data: qLineItems, error: qLineItemsError } = await supabase
      .from('quotation_line_items')
      .select('description, quantity, unit_price')
      .eq('quotation_id', quotation.id)

    if (qLineItemsError) {
      setError(qLineItemsError.message)
      setGenerating(null)
      return
    }

    // Create the invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: businessId,
        client_id: quotation.client_id,
        quotation_id: quotation.id,
        status: 'unpaid',
        total: quotation.total,
      })
      .select()
      .single()

    if (invoiceError || !invoice) {
      setError(invoiceError?.message ?? 'Failed to create invoice')
      setGenerating(null)
      return
    }

    // Copy line items into invoice_line_items
    if (qLineItems && qLineItems.length > 0) {
      const itemsToInsert = qLineItems.map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))

      const { error: insertItemsError } = await supabase.from('invoice_line_items').insert(itemsToInsert)
      if (insertItemsError) {
        setError(insertItemsError.message)
        setGenerating(null)
        return
      }
    }

    // Notify the client via WhatsApp
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('name, phone')
      .eq('id', quotation.client_id)
      .single()

    if (clientRecord?.phone) {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientRecord.phone,
          message: `Hi ${clientRecord.name}, your invoice for ₦${Number(quotation.total).toLocaleString()} has been generated. Please find payment details attached. Thank you for your business!`,
        }),
      })
    }

    setGenerating(null)
    loadData()
  }

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

  async function handleCreateStandalone(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const businessId = await getBusinessId()

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: businessId,
        client_id: clientId,
        status: 'unpaid',
        total: computedTotal,
        due_date: dueDate || null,
      })
      .select()
      .single()

    if (invoiceError || !invoice) {
      setError(invoiceError?.message ?? 'Failed to create invoice')
      setSubmitting(false)
      return
    }

    const itemsToInsert = lineItems
      .filter((item) => item.description.trim() !== '')
      .map((item) => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from('invoice_line_items').insert(itemsToInsert)
      if (itemsError) {
        setError(itemsError.message)
        setSubmitting(false)
        return
      }
    }

    setSubmitting(false)
    setClientId('')
    setDueDate('')
    setLineItems([{ description: '', quantity: 1, unit_price: 0 }])
    loadData()
  }

  if (loading) {
    return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading...</main>
  }

  // Only show quotations that don't already have an invoice generated from them
  const invoicedQuotationIds = new Set(
    invoices.map((inv) => inv.quotation_id).filter(Boolean)
  )

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Invoices</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Generate from Quotation</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {quotations
            .filter((q) => !invoicedQuotationIds.has(q.id))
            .map((q) => (
              <div
                key={q.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {q.clients?.name} — ₦{Number(q.total).toLocaleString()} ({q.status})
                </span>
                <button
                  onClick={() => handleGenerateFromQuotation(q)}
                  disabled={generating === q.id}
                  style={{ padding: '0.4rem 0.8rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px' }}
                >
                  {generating === q.id ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            ))}
          {quotations.filter((q) => !invoicedQuotationIds.has(q.id)).length === 0 && (
            <p style={{ fontSize: '0.85rem', color: '#666' }}>No quotations available to convert.</p>
          )}
        </div>
      </section>

      <form
        onSubmit={handleCreateStandalone}
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
        <h2 style={{ fontSize: '1rem' }}>New Standalone Invoice</h2>

        <select value={clientId} onChange={(e) => setClientId(e.target.value)} required style={{ padding: '0.5rem' }}>
          <option value="">Select client...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{ padding: '0.5rem' }}
        />

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
          {submitting ? 'Creating...' : 'Create Invoice'}
        </button>
      </form>

      <h2 style={{ marginBottom: '1rem' }}>All Invoices</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {invoices.map((inv) => (
          <div key={inv.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
            <p style={{ fontWeight: 'bold' }}>{inv.clients?.name} — ₦{Number(inv.total).toLocaleString()}</p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              Status: {inv.status} {inv.due_date ? `· Due: ${inv.due_date}` : ''}
            </p>
          </div>
        ))}
        {invoices.length === 0 && <p>No invoices yet.</p>}
      </div>
    </main>
  )
}