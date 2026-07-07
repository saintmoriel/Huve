'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import RightPanel from '@/components/RightPanel'
import { Briefcase, Shield, ClipboardCheck, RotateCcw, Globe, MoreHorizontal, Plus } from 'lucide-react'
import { getSessionUser } from '@/lib/getSessionUser'

type Client = { id: string; name: string }
type Engagement = {
  id: string
  title: string
  type: string | null
  status: string
  start_date: string | null
  end_date: string | null
  client_id: string
  clients: { name: string } | null
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode }> = {
  pentest: { label: 'Pen-Test', icon: <Shield size={13} /> },
  audit: { label: 'Audit', icon: <ClipboardCheck size={13} /> },
  retainer: { label: 'Retainer', icon: <RotateCcw size={13} /> },
  web_build: { label: 'Development', icon: <Globe size={13} /> },
  other: { label: 'Other', icon: <Briefcase size={13} /> },
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: 'ACTIVE', classes: 'bg-green-100 text-green-700' },
  completed: { label: 'COMPLETED', classes: 'bg-gray-100 text-gray-500' },
  on_hold: { label: 'ON HOLD', classes: 'bg-yellow-100 text-yellow-700' },
  cancelled: { label: 'ARCHIVED', classes: 'bg-gray-100 text-gray-400' },
}

export default function EngagementsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [clientId, setClientId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function loadData() {
    const user = await getSessionUser()
    if (!user) { router.push('/login'); return }

    const { data: clientsData } = await supabase.from('clients').select('id, name').order('name')
    setClients(clientsData ?? [])

    const { data: engagementsData, error: engError } = await supabase
      .from('engagements')
      .select('id, title, type, status, start_date, end_date, client_id, clients(name)')
      .order('created_at', { ascending: false })

    if (engError) setError(engError.message)
    else setEngagements((engagementsData as unknown as Engagement[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function resetForm() {
    setTitle(''); setType(''); setClientId(''); setStartDate(''); setEndDate('')
  }

  function openPanel() {
    setError(null)
    setPanelOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles').select('business_id').eq('id', user!.id).single()

    const { error: insertError } = await supabase.from('engagements').insert({
      business_id: profile!.business_id,
      client_id: clientId,
      title,
      type: type || null,
      status: 'active',
      start_date: startDate || null,
      end_date: endDate || null,
    })

    setSubmitting(false)
    if (insertError) { setError(insertError.message); return }

    resetForm()
    setPanelOpen(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
    loadData()
  }

  const hasClients = clients.length > 0

  return (
    <div>
      <TopBar
        title="Engagements"
        subtitle="Central dashboard for monitoring active security assessments and project lifecycles."
        breadcrumb={['Workspace', 'Operations', 'Engagements']}
        action={engagements.length > 0 ? { label: 'New Engagement', onClick: openPanel } : undefined}
      />

      <div className="px-6 py-6">
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-100 rounded-lg text-sm text-green-700">
            Engagement created.
          </div>
        )}
        {error && !panelOpen && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : engagements.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Briefcase size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-700 mb-1">No engagements yet</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {hasClients
                ? 'Provision your first engagement to start tracking assessments and project timelines.'
                : 'Add a client first, then provision an engagement to track assessments and timelines.'}
            </p>
            {hasClients ? (
              <button
                onClick={openPanel}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={15} />
                New Engagement
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
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {engagements.map((eng) => {
              const typeInfo = typeConfig[eng.type ?? 'other'] ?? typeConfig.other
              const statusInfo = statusConfig[eng.status] ?? statusConfig.active
              return (
                <div
                  key={eng.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-green-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {eng.clients?.name}
                      </p>
                      <p className="text-base font-semibold text-gray-900">{eng.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded tracking-wider ${statusInfo.classes}`}>
                        {statusInfo.label}
                      </span>
                      <button className="text-gray-300 hover:text-gray-500 transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        Service Type
                      </p>
                      <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                        <span className="text-gray-400">{typeInfo.icon}</span>
                        {typeInfo.label}
                      </div>
                    </div>
                    {(eng.start_date || eng.end_date) && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                          Timeline
                        </p>
                        <p className="text-sm text-gray-600">
                          {eng.start_date ? new Date(eng.start_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : '—'}
                          {' — '}
                          {eng.end_date ? new Date(eng.end_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : 'Ongoing'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <RightPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="New Engagement"
        subtitle="Initialize a new engagement protocol."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Target Client</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors bg-white"
            >
              <option value="">Select from roster...</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Engagement Label</label>
            <input
              type="text"
              placeholder="e.g. Q4 Network Audit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Service Protocol</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors bg-white"
            >
              <option value="">Select engagement type...</option>
              <option value="pentest">Penetration Test</option>
              <option value="audit">Security Audit</option>
              <option value="retainer">Retainer</option>
              <option value="web_build">Web Build</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? 'Creating...' : 'Provision Engagement'}
          </button>
          <p className="text-xs text-gray-400 text-center">Client success managers will be notified immediately.</p>
        </form>
      </RightPanel>
    </div>
  )
}