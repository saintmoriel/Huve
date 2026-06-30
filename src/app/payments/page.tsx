'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logAction } from '@/lib/audit'

type Invoice = {
  id: string
  status: string
  total: number
  clients: { name: string } | null
}

type Payment = {
  id: string
  amount: number
  method: string | null
  paid_at: string
  invoice_id: string
}

export default function PaymentsPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recordingFor, setRecordingFor] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bank_transfer')
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: invoicesData, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, status, total, clients(name)')
      .order('created_at', { ascending: false })

    if (invoicesError) {
      setError(invoicesError.message)
    } else {
      setInvoices((invoicesData as unknown as Invoice[]) ?? [])
    }

    const { data: paymentsData } = await supabase
      .from('payments')
      .select('id, amount, method, paid_at, invoice_id')
      .order('paid_at', { ascending: false })

    setPayments(paymentsData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  function totalPaidFor(invoiceId: string) {
    return payments
      .filter((p) => p.invoice_id === invoiceId)
      .reduce((sum, p) => sum + Number(p.amount), 0)
  }

  async function handleRecordPayment(invoice: Invoice) {
    setSubmitting(true)
    setError(null)

    const paymentAmount = parseFloat(amount)
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Enter a valid payment amount.')
      setSubmitting(false)
      return
    }

    const { error: paymentError } = await supabase.from('payments').insert({
      invoice_id: invoice.id,
      amount: paymentAmount,
      method,
    })

    if (paymentError) {
      setError(paymentError.message)
      setSubmitting(false)
      return
    }

    const alreadyPaid = totalPaidFor(invoice.id)
    const newTotalPaid = alreadyPaid + paymentAmount
    const newStatus =
      newTotalPaid >= Number(invoice.total) ? 'paid' : newTotalPaid > 0 ? 'partially_paid' : 'unpaid'

    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', invoice.id)

    if (updateError) {
      setError(updateError.message)
    }

    // Log the payment action
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user!.id)
      .single()

    if (profile) {
      await logAction({
        businessId: profile.business_id,
        action: 'payment_recorded',
        tableName: 'payments',
        recordId: invoice.id,
      })
    }

    setSubmitting(false)
    setRecordingFor(null)
    setAmount('')
    setMethod('bank_transfer')
    loadData()
  }

  if (loading) {
    return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading...</main>
  }

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Payments</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <h2 style={{ marginBottom: '1rem' }}>Invoices</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {invoices.map((inv) => {
          const paid = totalPaidFor(inv.id)
          const remaining = Number(inv.total) - paid

          return (
            <div key={inv.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem' }}>
              <p style={{ fontWeight: 'bold' }}>
                {inv.clients?.name} — ₦{Number(inv.total).toLocaleString()}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#666' }}>
                Status: {inv.status} · Paid: ₦{paid.toLocaleString()} · Remaining: ₦{remaining.toLocaleString()}
              </p>

              {inv.status !== 'paid' && (
                <div style={{ marginTop: '0.75rem' }}>
                  {recordingFor === inv.id ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="number"
                        placeholder="Amount (₦)"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{ padding: '0.4rem', width: '140px' }}
                      />
                      <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ padding: '0.4rem' }}>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="card">Card</option>
                        <option value="cash">Cash</option>
                      </select>
                      <button
                        onClick={() => handleRecordPayment(inv)}
                        disabled={submitting}
                        style={{ padding: '0.4rem 0.8rem', background: '#111', color: '#fff', border: 'none', borderRadius: '4px' }}
                      >
                        {submitting ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setRecordingFor(null)} style={{ padding: '0.4rem 0.8rem' }}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRecordingFor(inv.id)}
                      style={{ padding: '0.4rem 0.8rem', background: '#eee', border: 'none', borderRadius: '4px' }}
                    >
                      Record Payment
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {invoices.length === 0 && <p>No invoices yet.</p>}
      </div>
    </main>
  )
}