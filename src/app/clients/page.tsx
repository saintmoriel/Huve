'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import RightPanel from '@/components/RightPanel'
import { Building2, Mail, Phone, FileText } from 'lucide-react'

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
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function loadClients() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, phone, notes')
      .order('created_at', { ascending: true })

    if (clientsError) setError(clientsError.message)
    else setClients(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)

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
    if (insertError) { setError(insertError.message); return }

    setName(''); setEmail(''); setPhone(''); setNotes('')
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    loadClients()
  }

  return (
    <div>
      <TopBar
        title="Clients"
        subtitle="Manage your client roster and contact information."
        breadcrumb={['Workspace', 'Clients']}
      />

      <div className="px-6 py-6">
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading clients...</p>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-green-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#f0faf4] border border-green-100 flex items-center justify-center">
                      <Building2 size={18} className="text-green-700" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">Client</p>
                      <p className="text-base font-semibold text-gray-900">{client.name}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600">{client.phone}</span>
                    </div>
                  )}
                  {client.notes && (
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-500 truncate">{client.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {clients.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <Building2 size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm">No clients yet. Add your first client.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <RightPanel title="Add Client" subtitle="Register a new client to your roster.">
        <form onSubmit={handleCreate} className="space-y-4">
          {success && (
            <div className="px-3 py-2 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
              Client added successfully.
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Client Name
            </label>
            <input
              type="text"
              placeholder="e.g. PayFlux Technologies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              placeholder="contact@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Phone
            </label>
            <input
              type="text"
              placeholder="+234..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <textarea
              placeholder="Service type, context, relationship notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Client'}
          </button>
        </form>
      </RightPanel>
    </div>
  )
}