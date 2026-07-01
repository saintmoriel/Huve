'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'

type Stats = {
  businessName: string
  totalClients: number
  activeEngagements: number
  unpaidTotal: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setError('Could not load profile.')
        setLoading(false)
        return
      }

      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', profile.business_id)
        .single()

      const { data: clients } = await supabase
        .from('clients')
        .select('id')

      const { data: engagements } = await supabase
        .from('engagements')
        .select('id')
        .eq('status', 'active')

      const { data: unpaidInvoices } = await supabase
        .from('invoices')
        .select('total')
        .in('status', ['unpaid', 'partially_paid'])

      const unpaidTotal = (unpaidInvoices ?? []).reduce(
        (sum, inv) => sum + Number(inv.total), 0
      )

      setStats({
        businessName: business?.name ?? 'Your Business',
        totalClients: clients?.length ?? 0,
        activeEngagements: engagements?.length ?? 0,
        unpaidTotal,
      })

      setLoading(false)
    }

    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div>
        <TopBar
          title="Dashboard"
          subtitle="Central hub for operations, finance, and client management."
          breadcrumb={['Workspace', 'Dashboard']}
        />
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-gray-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <TopBar
          title="Dashboard"
          subtitle="Central hub for operations, finance, and client management."
          breadcrumb={['Workspace', 'Dashboard']}
        />
        <div className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  const quickActions = [
    { label: 'Add a client', href: '/clients' },
    { label: 'Create an engagement', href: '/engagements' },
    { label: 'Issue a quotation', href: '/quotations' },
    { label: 'Generate an invoice', href: '/invoices' },
  ]

  return (
    <div>
      <TopBar
        title={stats?.businessName ?? 'Dashboard'}
        subtitle="Central hub for operations, finance, and client management."
        breadcrumb={['Workspace', 'Dashboard']}
      />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-[#1a3a24]">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Total Clients</p>
            <p className="text-4xl font-bold text-[#0a1510]">{stats?.totalClients}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-[#1a3a24]">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Active Engagements</p>
            <p className="text-4xl font-bold text-[#0a1510]">{stats?.activeEngagements}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 border-l-4 border-l-[#dc2626]">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Outstanding Invoices</p>
            <p className="text-4xl font-bold text-[#dc2626]">
              ₦{stats?.unpaidTotal.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 hover:border-[#1a3a24] hover:bg-[#f0faf0] transition-colors text-sm text-gray-700 hover:text-[#0a1510] font-medium group"
              >
                {action.label}
                <span className="text-gray-300 group-hover:text-green-600 transition-colors">→</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Active metrics */}
        <div className="bg-[#f0faf4] border border-green-100 rounded-xl p-5">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wider mb-4">Active Metrics</p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-3xl font-bold text-green-700">{stats?.totalClients}</p>
              <p className="text-xs text-green-600 uppercase tracking-wider mt-1">Total Clients</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-700">{stats?.activeEngagements}</p>
              <p className="text-xs text-green-600 uppercase tracking-wider mt-1">Active Engagements</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}