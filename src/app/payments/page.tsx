'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { logAction } from '@/lib/audit'
import TopBar from '@/components/TopBar'
import { CreditCard, CheckCircle, Plus } from 'lucide-react'

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
    if (!user) { router.push('/login'); return }

    const { data: invoicesData, error: invError } = await supabase
      .from('invoices').select('id, status, total, clients(name)').order('created_at', { ascending: false })
    if (invError) setError(invError.message)
    else setInvoices((invoicesData as unknown as Invoice[]) ?? [])

    const { data: paymentsData } = await supabase
      .from('payments').select('id, amount, method, paid_at, invoice_id').order('paid_at', { ascending: false })
    setPayments(paymentsData ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function totalPaidFor(invoiceId: string) {
    return payments.filter((p) => p.invoice_id === invoiceId).reduce((sum, p) => sum + Number(p.amount), 0)
  }

  async function handleRecordPayment(invoice: Invoice) {
    setSubmitting(true)
    setError(null)

    const paymentAmount = parseFloat(amount)
    if (!paymentAmount || paymentAmount <= 0) { setError('Enter a valid amount.'); setSubmitting(false); return }

    const { error: paymentError } = await supabase.from('payments').insert({ invoice_id: invoice.id, amount: paymentAmount, method })
    if (paymentError) { setError(paymentError.message); setSubmitting(false); return }

    const alreadyPaid = totalPaidFor(invoice.id)
    const newTotalPaid = alreadyPaid + paymentAmount
    const newStatus = newTotalPaid >= Number(invoice.total) ? 'paid' : 'partially_paid'

    await supabase.from('invoices').update({ status: newStatus }).eq('id', invoice.id)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user!.id).single()
    if (profile) await logAction({ businessId: profile.business_id, action: 'payment_recorded', tableName: 'payments', recordId: invoice.id })

    setSubmitting(false)
    setRecordingFor(null)
    setAmount('')
    setMethod('bank_transfer')
    loadData()
  }

  return (
    <div>
      <TopBar
        title="Payments"
        subtitle="Track and record payments against outstanding invoices."
        breadcrumb={['Workspace', 'Finance', 'Payments']}
      />

      <div className="px-6 py-6">
        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>}

        {loading ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <CreditCard size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">No payments to record</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Payments are recorded against invoices. Create an invoice first, then record payments as they come in.
            </p>
            <button
              onClick={() => router.push('/invoices')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={15} />
              Go to Invoices
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Paid</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Remaining</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const paid = totalPaidFor(inv.id)
                  const remaining = Number(inv.total) - paid
                  const isPaid = inv.status === 'paid'

                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
                              <CreditCard size={14} className="text-gray-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-800">{inv.clients?.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-gray-900">₦{Number(inv.total).toLocaleString()}</td>
                        <td className="px-5 py-4 text-sm text-green-600 font-medium">₦{paid.toLocaleString()}</td>
                        <td className="px-5 py-4 text-sm text-red-500 font-medium">₦{remaining.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          {isPaid ? (
                            <span className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                              <CheckCircle size={13} /> Paid
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">
                              {inv.status === 'partially_paid' ? 'Partial' : 'Unpaid'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {!isPaid && (
                            <button
                              onClick={() => setRecordingFor(recordingFor === inv.id ? null : inv.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-[#0a1510] hover:bg-[#1a3a24] text-white rounded-lg transition-colors"
                            >
                              Record Payment
                            </button>
                          )}
                        </td>
                      </tr>
                      {recordingFor === inv.id && (
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <input
                                type="number"
                                placeholder="Amount (₦)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 w-40"
                              />
                              <select
                                value={method}
                                onChange={(e) => setMethod(e.target.value)}
                                className="px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 bg-white"
                              >
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="card">Card</option>
                                <option value="cash">Cash</option>
                              </select>
                              <button
                                onClick={() => handleRecordPayment(inv)}
                                disabled={submitting}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                {submitting ? 'Saving...' : 'Save Payment'}
                              </button>
                              <button
                                onClick={() => setRecordingFor(null)}
                                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}