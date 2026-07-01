'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import RightPanel from '@/components/RightPanel'
import { FileText, Plus, X } from 'lucide-react'

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

const statusConfig: Record<string, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-500' },
  sent: { label: 'Sent', classes: 'bg-blue-100 text-blue-600' },
  accepted: { label: 'Accepted', classes: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-600' },
}

export default function QuotationsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [clientId, setClientId] = useState('')
  const [engagementId, setEngagementId] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0 }])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: clientsData } = await supabase.from('clients').select('id, name').order('name')
    setClients(clientsData ?? [])

    const { data: engagementsData } = await supabase.from('engagements').select('id, title, client_id').order('title')
    setEngagements(engagementsData ?? [])

    const { data: quotationsData, error: qError } = await supabase
      .from('quotations')
      .select('id, status, total, created_at, clients(name)')
      .order('created_at', { ascending: false })

    if (qError) setError(qError.message)
    else setQuotations((quotationsData as unknown as Quotation[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) => {
      const next = [...prev]
      if (field === 'description') next[index] = { ...next[index], description: value }
      else next[index] = { ...next[index], [field]: parseFloat(value) || 0 }
      return next
    })
  }

  const computedTotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user!.id).single()

    const { data: quotation, error: qError } = await supabase
      .from('quotations')
      .insert({
        business_id: profile!.business_id,
        client_id: clientId,
        engagement_id: engagementId || null,
        status: 'draft',
        total: computedTotal,
      })
      .select().single()

    if (qError || !quotation) { setError(qError?.message ?? 'Failed'); setSubmitting(false); return }

    const itemsToInsert = lineItems
      .filter((i) => i.description.trim())
      .map((i) => ({ quotation_id: quotation.id, description: i.description, quantity: i.quantity, unit_price: i.unit_price }))

    if (itemsToInsert.length > 0) {
      const { error: iError } = await supabase.from('quotation_line_items').insert(itemsToInsert)
      if (iError) { setError(iError.message); setSubmitting(false); return }
    }

    setSubmitting(false)
    setClientId(''); setEngagementId('')
    setLineItems([{ description: '', quantity: 1, unit_price: 0 }])
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    loadData()
  }

  const filteredEngagements = clientId ? engagements.filter((e) => e.client_id === clientId) : engagements

  return (
    <div>
      <TopBar
        title="Quotations"
        subtitle="Create and manage service quotations for your clients."
        breadcrumb={['Workspace', 'Finance', 'Quotations']}
      />

      <div className="px-6 py-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
        )}

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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => {
                  const statusInfo = statusConfig[q.status] ?? statusConfig.draft
                  return (
                    <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <FileText size={14} className="text-gray-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-800">{q.clients?.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">₦{Number(q.total).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo.classes}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-400">
                        {new Date(q.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-16 text-gray-400 text-sm">
                      No quotations yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RightPanel title="New Quotation" subtitle="Issue a quotation for a client engagement.">
        <form onSubmit={handleCreate} className="space-y-4">
          {success && (
            <div className="px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
              Quotation created.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Client</label>
            <select
              value={clientId}
              onChange={(e) => { setClientId(e.target.value); setEngagementId('') }}
              required
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 bg-white"
            >
              <option value="">Select client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Engagement (optional)</label>
            <select
              value={engagementId}
              onChange={(e) => setEngagementId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 bg-white"
            >
              <option value="">No engagement</option>
              {filteredEngagements.map((eng) => <option key={eng.id} value={eng.id}>{eng.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Line Items</label>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="space-y-1.5 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                    className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded outline-none focus:border-green-500 bg-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                      className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded outline-none focus:border-green-500 bg-white"
                      min={0}
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(i, 'unit_price', e.target.value)}
                      className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded outline-none focus:border-green-500 bg-white"
                      min={0}
                    />
                  </div>
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLineItems((prev) => prev.filter((_, idx) => idx !== i))}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
                    >
                      <X size={12} /> Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLineItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0 }])}
                className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium"
              >
                <Plus size={13} /> Add line item
              </button>
            </div>
          </div>
          <div className="px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</span>
            <span className="text-base font-bold text-gray-900">₦{computedTotal.toLocaleString()}</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Quotation'}
          </button>
        </form>
      </RightPanel>
    </div>
  )
}