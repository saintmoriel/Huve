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
  Trash2,
  Pencil,
  Hash,
} from 'lucide-react'
import { getSessionUser } from '@/lib/getSessionUser'

type Client = {
  id: string
  name: string
  trading_name: string | null
  client_type: string | null
  registration_number: string | null
  tax_id: string | null
  email: string | null
  phone: string | null
  notes: string | null
  contact_person: string | null
  industry: string | null
  website: string | null
  address: string | null
  street_1: string | null
  street_2: string | null
  city: string | null
  state_region: string | null
  country: string | null
  postal_code: string | null
  status: string | null
  compliance_flags: string | null
}

const CLIENT_TYPES = [
  { value: 'company', label: 'Company' },
  { value: 'individual', label: 'Individual' },
  { value: 'government', label: 'Government' },
  { value: 'ngo', label: 'NGO' },
]

const STATUSES = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const statusBadge: Record<string, string> = {
  prospect: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
}

const INDUSTRIES = [
  'Fintech', 'Banking', 'Government', 'Healthcare', 'Education',
  'E-commerce', 'Cybersecurity', 'Consulting', 'Legal', 'Real Estate', 'Other',
]

const EMPTY_FORM = {
  name: '',
  trading_name: '',
  client_type: 'company',
  registration_number: '',
  tax_id: '',
  contact_person: '',
  industry: '',
  email: '',
  phone: '',
  website: '',
  street_1: '',
  street_2: '',
  city: '',
  state_region: '',
  country: 'Nigeria',
  postal_code: '',
  status: 'active',
  compliance_flags: '',
  notes: '',
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [userRole, setUserRole] = useState<string>('staff')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const canManage = userRole === 'owner' || userRole === 'admin'
  const isEditing = editingId !== null

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function loadClients() {
    const user = await getSessionUser()
    if (!user) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile) setUserRole(profile.role)

    const { data, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, trading_name, client_type, registration_number, tax_id, email, phone, notes, contact_person, industry, website, address, street_1, street_2, city, state_region, country, postal_code, status, compliance_flags')
      .order('created_at', { ascending: true })

    if (clientsError) setError(clientsError.message)
    else setClients(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const fields = {
      name: form.name,
      trading_name: form.trading_name || null,
      client_type: form.client_type || 'company',
      registration_number: form.registration_number || null,
      tax_id: form.tax_id || null,
      contact_person: form.contact_person || null,
      industry: form.industry || null,
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      street_1: form.street_1 || null,
      street_2: form.street_2 || null,
      city: form.city || null,
      state_region: form.state_region || null,
      country: form.country || null,
      postal_code: form.postal_code || null,
      status: form.status || 'active',
      compliance_flags: form.compliance_flags || null,
      notes: form.notes || null,
    }

    if (isEditing) {
      const { error: updateError } = await supabase
        .from('clients').update(fields).eq('id', editingId)
      setSubmitting(false)
      if (updateError) { setError(updateError.message); return }
      closeModal()
      setSuccess('Client updated successfully.')
      setTimeout(() => setSuccess(null), 3000)
      loadClients()
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles').select('business_id').eq('id', user!.id).single()

    const { error: insertError } = await supabase
      .from('clients').insert({ business_id: profile!.business_id, ...fields })

    setSubmitting(false)
    if (insertError) { setError(insertError.message); return }

    closeModal()
    setSuccess('Client added successfully.')
    setTimeout(() => setSuccess(null), 3000)
    loadClients()
  }

  async function handleDelete(client: Client) {
    const confirmed = window.confirm(
      `Delete "${client.name}"? This cannot be undone. Contacts under this client will also be removed. Invoices and quotations are never deleted.`
    )
    if (!confirmed) return

    setDeletingId(client.id)
    setError(null)
    const { error: deleteError } = await supabase.from('clients').delete().eq('id', client.id)
    setDeletingId(null)

    if (deleteError) {
      setError(`Could not delete client: ${deleteError.message}`)
      return
    }
    setClients((prev) => prev.filter((c) => c.id !== client.id))
  }

  function openAddModal() {
    setForm({ ...EMPTY_FORM })
    setEditingId(null)
    setError(null)
    setShowModal(true)
  }

  function openEditModal(client: Client) {
    setForm({
      name: client.name ?? '',
      trading_name: client.trading_name ?? '',
      client_type: client.client_type ?? 'company',
      registration_number: client.registration_number ?? '',
      tax_id: client.tax_id ?? '',
      contact_person: client.contact_person ?? '',
      industry: client.industry ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      website: client.website ?? '',
      street_1: client.street_1 ?? '',
      street_2: client.street_2 ?? '',
      city: client.city ?? '',
      state_region: client.state_region ?? '',
      country: client.country ?? 'Nigeria',
      postal_code: client.postal_code ?? '',
      status: client.status ?? 'active',
      compliance_flags: client.compliance_flags ?? '',
      notes: client.notes ?? '',
    })
    setEditingId(client.id)
    setError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setError(null)
  }

  function addressLine(c: Client): string | null {
    const parts = [c.street_1, c.city, c.state_region, c.country].filter(Boolean)
    if (parts.length > 0) return parts.join(', ')
    return c.address
  }

  const inputClass = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
  const labelClass = "block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5"
  const sectionClass = "text-[11px] font-bold text-[#0a1510] uppercase tracking-wider pt-2"

  return (
    <div>
      <TopBar
        title="Clients"
        subtitle="Manage your client roster, registration details, and contact information."
        breadcrumb={['Workspace', 'Clients']}
        action={clients.length > 0 ? { label: 'Add Client', onClick: openAddModal } : undefined}
      />

      <div className="px-8 py-6">
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
            {success}
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
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Building2 size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">No clients yet</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              Add your first client to start managing engagements, quotations, and invoices.
            </p>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={15} />
              Add your first client
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => {
              const addr = addressLine(client)
              const status = client.status ?? 'active'
              return (
                <div
                  key={client.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-green-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#f0faf4] border border-green-100 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-green-700" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                          {client.industry ?? (CLIENT_TYPES.find((t) => t.value === client.client_type)?.label ?? 'Client')}
                        </p>
                        <p className="text-base font-semibold text-gray-900">
                          {client.name}
                          {client.trading_name && (
                            <span className="text-sm font-normal text-gray-400"> · {client.trading_name}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mr-1 ${statusBadge[status] ?? statusBadge.active}`}>
                        {status}
                      </span>
                      {canManage && (
                        <button
                          onClick={() => openEditModal(client)}
                          title="Edit client"
                          className="p-2 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {canManage && (
                        <button
                          onClick={() => handleDelete(client)}
                          disabled={deletingId === client.id}
                          title="Delete client"
                          className="p-2 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
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
                    {(client.registration_number || client.tax_id) && (
                      <div className="flex items-center gap-2">
                        <Hash size={13} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600 truncate">
                          {[client.registration_number, client.tax_id].filter(Boolean).join(' · ')}
                        </span>
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
                    {addr && (
                      <div className="flex items-center gap-2">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600 truncate">{addr}</span>
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
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{isEditing ? 'Edit Client' : 'Add New Client'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isEditing ? 'Update the client details below' : 'Registration, contact, and address details'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {error && (
                <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Identity */}
              <p className={sectionClass}>Identity</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Legal Name *</label>
                  <input type="text" required placeholder="e.g. Northbridge Microfinance Bank Ltd"
                    value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Trading Name</label>
                  <input type="text" placeholder="If different from legal name"
                    value={form.trading_name} onChange={(e) => set('trading_name', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Client Type</label>
                  <select value={form.client_type} onChange={(e) => set('client_type', e.target.value)} className={inputClass}>
                    {CLIENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Registration Number</label>
                  <input type="text" placeholder="RC number"
                    value={form.registration_number} onChange={(e) => set('registration_number', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Tax ID (TIN / VAT)</label>
                  <input type="text" placeholder="TIN"
                    value={form.tax_id} onChange={(e) => set('tax_id', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Industry / Sector</label>
                  <select value={form.industry} onChange={(e) => set('industry', e.target.value)} className={inputClass}>
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}>
                    {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Contact */}
              <p className={sectionClass}>Primary Contact</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Contact Person</label>
                  <input type="text" placeholder="Full name"
                    value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input type="text" placeholder="+234..."
                    value={form.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Email Address</label>
                  <input type="email" placeholder="contact@company.com"
                    value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Website</label>
                  <input type="text" placeholder="https://company.com"
                    value={form.website} onChange={(e) => set('website', e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Address */}
              <p className={sectionClass}>Address</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Street Address</label>
                  <input type="text" placeholder="Street line 1"
                    value={form.street_1} onChange={(e) => set('street_1', e.target.value)} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Street Line 2</label>
                  <input type="text" placeholder="Suite, floor, etc. (optional)"
                    value={form.street_2} onChange={(e) => set('street_2', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input type="text" placeholder="e.g. Abuja"
                    value={form.city} onChange={(e) => set('city', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State / Region</label>
                  <input type="text" placeholder="e.g. FCT"
                    value={form.state_region} onChange={(e) => set('state_region', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input type="text" placeholder="e.g. Nigeria"
                    value={form.country} onChange={(e) => set('country', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input type="text" placeholder="Optional"
                    value={form.postal_code} onChange={(e) => set('postal_code', e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Other */}
              <p className={sectionClass}>Other</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>Compliance Flags</label>
                  <input type="text" placeholder="e.g. Requires NDA, High sensitivity"
                    value={form.compliance_flags} onChange={(e) => set('compliance_flags', e.target.value)} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Notes</label>
                  <textarea placeholder="Service context, relationship notes..."
                    value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3}
                    className={`${inputClass} resize-none`} />
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
                  {submitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Client')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}