'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logAction } from '@/lib/audit'
import TopBar from '@/components/TopBar'
import RightPanel from '@/components/RightPanel'
import { generateInvoicePdf } from '@/lib/invoicePdf'
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
  const [panelOpen, setPanelOpen] = useState(false)
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

    // 1. Pull the quotation's line items (used for both the invoice and the PDF)
    const { data: qLineItems, error: qliError } = await supabase
      .from('quotation_line_items').select('description, quantity, unit_price').eq('quotation_id', quotation.id)
    if (qliError) { setError(qliError.message); setGenerating(null); return }

    // 2. Create the invoice (the DB trigger assigns invoice_number automatically)
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({ business_id: businessId, client_id: quotation.client_id, quotation_id: quotation.id, status: 'unpaid', total: quotation.total })
      .select('id, invoice_number, created_at, due_date, total')
      .single()
    if (invError || !invoice) { setError(invError?.message ?? 'Failed'); setGenerating(null); return }

    // 3. Copy line items onto the invoice
    const items = (qLineItems ?? []) as LineItem[]
    if (items.length > 0) {
      const { error: iliError } = await supabase.from('invoice_line_items').insert(
        items.map((item: LineItem) => ({ invoice_id: invoice.id, description: item.description, quantity: item.quantity, unit_price: item.unit_price }))
      )
      if (iliError) { setError(iliError.message); setGenerating(null); return }
    }

    await logAction({ businessId, action: 'created', tableName: 'invoices', recordId: invoice.id })

    // 4. Fetch business + client details for the PDF
    const { data: business } = await supabase
      .from('businesses').select('name, address, phone, email').eq('id', businessId).single()
    const { data: clientRecord } = await supabase
      .from('clients').select('name, phone').eq('id', quotation.client_id).single()

    const invoiceLabel = `INV-${String(invoice.invoice_number ?? 0).padStart(4, '0')}`

    // 5. Generate the PDF, upload it, get a public URL
    let pdfUrl: string | null = null
    try {
      const pdfBytes = await generateInvoicePdf({
        invoiceLabel,
        createdAt: invoice.created_at,
        dueDate: invoice.due_date,
        total: Number(invoice.total),
        business: {
          name: business?.name ?? '',
          address: business?.address ?? null,
          phone: business?.phone ?? null,
          email: business?.email ?? null,
        },
        clientName: clientRecord?.name ?? 'Client',
        lineItems: items,
      })

      // --- DIAGNOSTIC: who does the upload think we are? ---
      const { data: authCheck } = await supabase.auth.getUser()
      console.log('Upload will run as user:', authCheck.user?.id ?? 'NOT AUTHENTICATED')
      // ----------------------------------------------------

      const path = `${businessId}/${invoice.id}.pdf`
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(path, new Blob([pdfBytes], { type: 'application/pdf' }), { upsert: true, contentType: 'application/pdf' })

      if (uploadError) {
        console.error('Invoice PDF upload error:', uploadError)
      } else {
        const { data: pub } = supabase.storage.from('invoices').getPublicUrl(path)
        pdfUrl = pub.publicUrl
      }
    } catch (e) {
      console.error('PDF/upload failed:', e)
      pdfUrl = null
    }

    // 6. Send WhatsApp with the PDF attached (if we have a client phone)
    if (clientRecord?.phone) {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: clientRecord.phone,
          message: `Hi ${clientRecord.name}, your invoice ${invoiceLabel} for ₦${Number(quotation.total).toLocaleString()} has been generated. We'll follow up shortly with payment details. Thank you for your business!`,
          mediaUrl: pdfUrl,
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
  const hasClients = clients.length > 0

  function resetForm() {
    setClientId(''); setDueDate('')
    setLineItems([{ description: '', quantity: 1, unit_price: 0 }])
  }

  function openPanel() {
    setError(null)
    setPanelOpen(true)
  }

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
    resetForm()
    setPanelOpen(false)
    loadData()
  }

  // Show the empty state only when there is genuinely nothing to act on:
  // no invoices AND no quotations available to generate from.
  const showEmptyState = !loading && invoices.length === 0 && availableQuotations.length === 0

  return (
    <div>
      <TopBar
        title="Invoices"
        subtitle="Generate, track, and manage client invoices across all engagements."
        breadcrumb={['Workspace', 'Finance', 'Invoices']}
        action={invoices.length > 0 ? { label: 'New Invoice', onClick: openPanel } : undefined}
      />

      <div className="px-6 py-6 space-y-6">
        {error && !panelOpen && (
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

        {/* Invoices table / states */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : showEmptyState ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Receipt size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">No invoices yet</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {hasClients
                ? 'Create a standalone invoice, or generate one from an accepted quotation.'
                : 'Add a client first, then create an invoice or generate one from a quotation.'}
            </p>
            {hasClients ? (
              <button
                onClick={openPanel}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={15} />
                New Invoice
              </button>
            ) : (
              <button
                onClick={() => router.push('/clients')}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={15} />
                Add a client
              </button>
            )}
          </div>
        ) : invoices.length > 0 ? (
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
              </tbody>
            </table>
          </div>
        ) : null}
      </div>

      <RightPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="New Invoice"
        subtitle="Create a standalone invoice for a client."
      >
        <form onSubmit={handleCreateStandalone} className="space-y-4">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} required className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 bg-white">
              <option value="">Select client...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Due Date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Line Items</label>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Penetration testing — Q4"
                      value={item.description}
                      onChange={(e) => updateLineItem(i, 'description', e.target.value)}
                      className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded outline-none focus:border-green-500 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Quantity</label>
                      <input
                        type="number"
                        placeholder="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(i, 'quantity', e.target.value)}
                        className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded outline-none focus:border-green-500 bg-white"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">Price per unit (₦)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(i, 'unit_price', e.target.value)}
                        className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded outline-none focus:border-green-500 bg-white"
                        min={0}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-gray-400">
                      Line total: <span className="font-semibold text-gray-600">₦{(item.quantity * item.unit_price).toLocaleString()}</span>
                    </span>
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => setLineItems((prev) => prev.filter((_, idx) => idx !== i))} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600">
                        <X size={12} /> Remove
                      </button>
                    )}
                  </div>
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