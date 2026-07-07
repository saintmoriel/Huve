'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import {
  Building2,
  Mail,
  Phone,
  FileText,
  Globe,
  MapPin,
  User,
  X,
  Plus,
} from 'lucide-react'
import { getSessionUser } from '@/lib/getSessionUser'

type Client = {
  id: string
  name: string
  email: string | null
  phone: string | null
  notes: string | null
  contact_person: string | null
  industry: string | null
  website: string | null
  address: string | null
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // form state
  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [industry, setIndustry] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function loadClients() {
    const user = await getSessionUser()
    if (!user) { router.push('/login'); return }

    const { data, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, email, phone, notes, contact_person, industry, website, address')
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
      contact_person: contactPerson || null,
      industry: industry || null,
      email: email || null,
      phone: phone || null,
      website: website || null,
      address: address || null,
      notes: notes || null,
    })

    setSubmitting(false)
    if (insertError) { setError(insertError.message); return }

    resetForm()
    setSuccess(true)
    setShowModal(false)
    setTimeout(() => setSuccess(false), 3000)
    loadClients()
  }

  function resetForm() {
    setName(''); setContactPerson(''); setIndustry('')
    setEmail(''); setPhone(''); setWebsite('')
    setAddress(''); setNotes('')
    setError(null)
  }

  function openModal() {
    resetForm()
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    resetForm()
  }

  const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
  const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"

  return (
    <div>
      <TopBar
        title="Clients"
        subtitle="Manage your client roster and contact information."
        breadcrumb={['Workspace', 'Clients']}
        action={clients.length > 0 ? { label: 'Add Client', onClick: openModal } : undefined}
      />

      <div className="px-8 py-6">
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
            Client added successfully.
          </div>
        )}
        {error && !showModal && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Building2 size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">No clients yet</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Add your first client to start managing engagements, quotations, and invoices.
            </p>
            <button
              onClick={openModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={15} />
              Add your first client
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-green-200 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#f0faf4] border border-green-100 flex items-center justify-center">
                      <Building2 size={18} className="text-green-700" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                        {client.industry ?? 'Client'}
                      </p>
                      <p className="text-base font-semibold text-gray-900">{client.name}</p>
                    </div>
                  </div>
                  {client.industry && (
                    <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full">
                      {client.industry}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3">
                  {client.contact_person && (
                    <div className="flex items-center gap-2">
                      <User size={13} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600">{client.contact_person}</span>
                    </div>
                  )}
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
                  {client.website && (
                    <div className="flex items-center gap-2">
                      <Globe size={13} className="text-gray-400 shrink-0" />
                      <a href={client.website} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-green-600 hover:underline truncate">
                        {client.website.replace('https://', '').replace('http://', '')}
                      </a>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{client.address}</span>
                    </div>
                  )}
                  {client.notes && (
                    <div className="flex items-center gap-2 col-span-2">
                      <FileText size={13} className="text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-500 truncate">{client.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Add New Client</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fill in the client details below</p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {error && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Company Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. PayFlux Technologies"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Contact Person</label>
                  <input
                    type="text"
                    placeholder="Full name"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Industry / Sector</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select industry...</option>
                    <option value="Fintech">Fintech</option>
                    <option value="Banking">Banking</option>
                    <option value="Government">Government</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="Cybersecurity">Cybersecurity</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Legal">Legal</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    placeholder="contact@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input
                    type="text"
                    placeholder="+234..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Website</label>
                  <input
                    type="text"
                    placeholder="https://company.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Address</label>
                  <input
                    type="text"
                    placeholder="Street, City, State"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Notes</label>
                  <textarea
                    placeholder="Service context, relationship notes, key contacts..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}