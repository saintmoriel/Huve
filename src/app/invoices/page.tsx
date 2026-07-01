'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logAction } from '@/lib/audit'
import TopBar from '@/components/TopBar'
import RightPanel from '@/components/RightPanel'
import { Receipt, Plus, X, Zap } from 'lucide-react'

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

const statusConfig: Record<string, { label: string; classes: string }> = {
  unpaid: { label: 'Unpaid', classes: 'bg-red-100 text-red-600' },
  partially_paid: { label: 'Partial', classes: 'bg-orange-100 text-orange-600' },
  paid: { label: 'Paid', classes: 'bg-green-100 text-green-700' },
  overdue: { label: 'Overdue', classes: 'bg-red-200 text-red-700' },
}

export default function InvoicesPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [clientId, setClientId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0 }])

  async function getBusinessId() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user!.id).single()
    return profile!.business_id
  }

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: clientsData } = await supabase.from('clients').select('id, name').order('name')
    setClients(clientsData ?? [])

    const { data: quotationsData } = await supabase
      .from('quotations')
      .select('id, status, total, client_id, clients(name)')
      .order('created_at', { ascending: false })
    setQuotations((quotationsData as unknown as Quotation[]) ?? [])

    const { data: invoicesData, error: invError } = await supabase
      .from('invoices')
      .select('id, status, total, due_date, created_at, quotation_id, clients(name)')
      .order('created_at', { ascending: false })

    if (invError) setError(invError.message)
    else setInvoices((invoicesData as unknown as Invoice[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleGenerateFromQuotation(quotation: Quotation) {
    setGenerating(quotation.id)
    setError(null)
    const businessId = await getBusinessId()

    const { data: qLineItems, error: qliError } = await supabase
      .from('quotation_line_items').select('description, quantity, unit_price').eq('quotation_id', quotation.id)
    if (qliError) { setError(qliError.message); setGenerating(null); return }

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({ business_id: businessId, client_id: quotation.client_id, quotation_id: quotation.id, status: 'unpaid', total: quotation.total })
      .select().single()
    if (invError || !invoice) { setError(invError?.message ?? 'Failed'); setGenerating(null); return }

    if (qLineItems && qLineItems.length > 0) {
      const { error: iliError } = await supabase.from('invoice_line_items').insert(
        qLineItems.map((item) => ({ invoice_id: invoice.id, description: item.description, quantity: item.quantity, unit_price: item.unit_price }))
      )
      if (iliError) { setError(iliError.message); setGenerating(null); return }
    }

    await logAction({ businessId, action: 'created', tableName: 'invoices', recordId: invoice.id })

    const { data: clientRecord } = await supabase.from('clients').select('name, phone').eq('id', quotation.client_id).single()
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
      if (field === 'description') next[index] = { ...next[index], description: value }
      else next[index] = { ...next[index], [field]: parseFloat(value) || 0 }
      return next
    })
  }

  const computedTotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const invoicedQuotationIds = new Set(invoices.map((inv) => inv.quotation_id).filter(Boolean))
  const availableQuotations = quotations.filter((q) => !invoicedQuotationIds.has(q.id))

  async function handleCreateStandalone(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const businessId = await getBusinessId()

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({ business_id: businessId, client_id: clientId, status: 'unpaid', total: computedTotal, due_date: dueDate || null })
      .select().single()
    if (invError || !invoice) { setError(invError?.message ?? 'Failed'); setSubmitting(false); return }

    const itemsToInsert = lineItems.filter((i) => i.description.trim()).map((i) => ({ invoice_id: invoice.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price }))
    if (itemsToInsert.length > 0) {
      const { error: iliError } = await supabase.from('invoice_line_items').insert(itemsToInsert)
      if (iliError) { setError(iliError.message); setSubmitting(false); return }
    }

    await logAction({ businessId, action: 'created', tableName: 'invoices', recordId: invoice.id })
    setSubmitting(false)
    setClientId(''); setDueDate('')
    setLineItems([{ description: '', quantity: 1, unit_price: 0 }])
    loadData()
  }

  return (
    <div>
      <TopBar
        title="Invoices"
        subtitle="Generate, track, and manage client invoices across all engagements."
        breadcrumb={['Workspace', 'Finance', 'Invoices']}
      />

      <div className="px-6 py-6 space-y-6">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
        )}

        {/* Generate from quotation */}
        {availableQuotations.length > 0 && (
          <div className="bg-[#f0faf4] border border-green-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={15} className="text-green-600" />
              <h2 className="text-sm font-semibold text-green-800">Generate from Quotation</h2>
            </div>
            <div className="space-y-2">
              {availableQuotations.map((q) => (
                <div key={q.id} className="flex items-center justify-between bg-white rounded-lg border border-green-100 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{q.clients?.name}</p>
                    <p className="text-xs text-gray-400">₦{Number(q.total).toLocaleString()} · {q.status}</p>
                  </div>
                  <button
                    onClick={() => handleGenerateFromQuotation(q)}
                    disabled={generating === q.id}
                    className="px-3 py-1.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generating === q.id ? 'Generating...' : 'Generate Invoice'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices table */}
        {loading ? (
          <p className="text-gray-400 text-sm">Loading...</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const statusInfo = statusConfig[inv.status] ?? statusConfig.unpaid
                  return (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <Receipt size={14} className="text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{inv.clients?.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">₦{Number(inv.total).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.classes}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  )
                })}
                {invoices.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-16 text-gray-400 text-sm">No invoices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RightPanel title="New Invoice" subtitle="Create a standalone invoice for a client.">
        <form onSubmit={handleCreateStandalone} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 bg-white">
              <option value="">Select client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Line Items</label>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="space-y-1.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <input type="text" placeholder="Description" value={item.description} onChange={(e) => updateLineItem(i, 'description', e.target.value)} className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded outline-none focus:border-green-500 bg-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateLineItem(i, 'quantity', e.target.value)} className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded outline-none focus:border-green-500 bg-white" min={0} />
                    <input type="number" placeholder="Unit Price" value={item.unit_price} onChange={(e) => updateLineItem(i, 'unit_price', e.target.value)} className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded outline-none focus:border-green-500 bg-white" min={0} />
                  </div>
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => setLineItems((prev) => prev.filter((_, idx) => idx !== i))} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setLineItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }])} className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium">
                <Plus size={13} /> Add line item
              </button>
            </div>
          </div>
          <div className="px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
            <span className="text-base font-bold text-gray-900">₦{computedTotal.toLocaleString()}</span>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {submitting ? 'Creating...' : 'Create Invoice'}
          </button>
        </form>
      </RightPanel>
    </div>
  )
}