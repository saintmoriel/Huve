'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  FileText,
  CreditCard,
  Receipt,
} from 'lucide-react'

const invoiceStatusColors: Record<string, string> = {
  Paid: '#16a34a',
  Unpaid: '#dc2626',
  Partial: '#ea580c',
}

const activityTypeConfig: Record<string, { color: string; bg: string; letter: string }> = {
  invoice: { color: 'text-blue-600', bg: 'bg-blue-50', letter: 'I' },
  payment: { color: 'text-green-600', bg: 'bg-green-50', letter: 'P' },
  quotation: { color: 'text-purple-600', bg: 'bg-purple-50', letter: 'Q' },
  engagement: { color: 'text-orange-600', bg: 'bg-orange-50', letter: 'E' },
}

type ActivityItem = {
  action: string
  client: string
  amount: string
  time: string
  type: string
  href: string
  ts: number
}

// Build the last 6 month buckets ending with the current month
function buildMonthBuckets(): { key: string; month: string; invoiced: number; paid: number }[] {
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString('en-NG', { month: 'short' }),
      invoiced: 0,
      paid: 0,
    })
  }
  return out
}

function monthKey(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${d.getMonth()}`
}

// Relative time like "2 hours ago" / "Yesterday" / "3 days ago"
function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

function formatNaira(value: number) {
  if (value >= 1000000) return `₦${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `₦${(value / 1000).toFixed(0)}K`
  return `₦${value}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {formatNaira(entry.value)}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const router = useRouter()
  const [businessName, setBusinessName] = useState('Your Business')
  const [loading, setLoading] = useState(true)

  // Real stats
  const [stats, setStats] = useState({
    revenue: 0,
    outstanding: 0,
    overdueCount: 0,
    clients: 0,
    engagements: 0,
  })
  const [pieData, setPieData] = useState<{ name: string; value: number; color: string }[]>([])
  const [invoiceTotal, setInvoiceTotal] = useState(0)
  const [cashflowData, setCashflowData] = useState<{ month: string; invoiced: number; paid: number }[]>([])
  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number }[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        const { data: business } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', profile.business_id)
          .single()
        if (business) setBusinessName(business.name)
      }

      // --- Real data queries (RLS scopes everything to this business) ---
      const [clientsRes, engagementsRes, invoicesRes, paymentsRes, recentInvoices, recentPayments, recentQuotes, recentEngagements] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('engagements').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('invoices').select('id, total, status, due_date, created_at'),
        supabase.from('payments').select('amount, paid_at'),
        supabase.from('invoices').select('total, created_at, clients(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('payments').select('amount, paid_at, invoices(clients(name))').order('paid_at', { ascending: false }).limit(5),
        supabase.from('quotations').select('total, created_at, clients(name)').order('created_at', { ascending: false }).limit(5),
        supabase.from('engagements').select('title, created_at, clients(name)').order('created_at', { ascending: false }).limit(5),
      ])

      const invoices = invoicesRes.data ?? []
      const payments = paymentsRes.data ?? []

      const totalInvoiced = invoices.reduce((s: number, i: { total: number }) => s + Number(i.total), 0)
      const totalCollected = payments.reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)
      const outstanding = Math.max(0, totalInvoiced - totalCollected)

      const today = new Date()
      const overdueCount = invoices.filter((i: { status: string; due_date: string | null }) =>
        i.status !== 'paid' && i.due_date && new Date(i.due_date) < today
      ).length

      // Pie: count invoices by collection status
      const paidCount = invoices.filter((i: { status: string }) => i.status === 'paid').length
      const partialCount = invoices.filter((i: { status: string }) => i.status === 'partially_paid').length
      const unpaidCount = invoices.filter((i: { status: string }) =>
        i.status === 'unpaid' || i.status === 'overdue'
      ).length

      const pie = [
        { name: 'Paid', value: paidCount, color: invoiceStatusColors.Paid },
        { name: 'Unpaid', value: unpaidCount, color: invoiceStatusColors.Unpaid },
        { name: 'Partial', value: partialCount, color: invoiceStatusColors.Partial },
      ].filter((s) => s.value > 0)

      // --- Charts: bucket invoices (by created_at) and payments (by paid_at) into last 6 months ---
      const buckets = buildMonthBuckets()
      const bucketMap = new Map(buckets.map((b) => [b.key, b]))
      invoices.forEach((i: { total: number; created_at: string }) => {
        const b = bucketMap.get(monthKey(i.created_at))
        if (b) b.invoiced += Number(i.total)
      })
      payments.forEach((p: { amount: number; paid_at: string }) => {
        const b = bucketMap.get(monthKey(p.paid_at))
        if (b) b.paid += Number(p.amount)
      })
      setCashflowData(buckets.map((b) => ({ month: b.month, invoiced: b.invoiced, paid: b.paid })))
      setRevenueData(buckets.map((b) => ({ month: b.month, revenue: b.paid })))

      // --- Recent activity: merge latest records across types, sort by time ---
      const acts: ActivityItem[] = []
      const clientName = (rel: any): string =>
        rel?.name ?? rel?.clients?.name ?? 'A client'

      ;(recentInvoices.data ?? []).forEach((r: any) => acts.push({
        action: 'Invoice generated', client: clientName(r.clients),
        amount: `₦${Number(r.total).toLocaleString()}`, type: 'invoice', href: '/invoices',
        ts: new Date(r.created_at).getTime(), time: relativeTime(new Date(r.created_at).getTime()),
      }))
      ;(recentPayments.data ?? []).forEach((r: any) => acts.push({
        action: 'Payment recorded', client: clientName(r.invoices?.clients),
        amount: `₦${Number(r.amount).toLocaleString()}`, type: 'payment', href: '/payments',
        ts: new Date(r.paid_at).getTime(), time: relativeTime(new Date(r.paid_at).getTime()),
      }))
      ;(recentQuotes.data ?? []).forEach((r: any) => acts.push({
        action: 'Quotation sent', client: clientName(r.clients),
        amount: `₦${Number(r.total).toLocaleString()}`, type: 'quotation', href: '/quotations',
        ts: new Date(r.created_at).getTime(), time: relativeTime(new Date(r.created_at).getTime()),
      }))
      ;(recentEngagements.data ?? []).forEach((r: any) => acts.push({
        action: 'New engagement', client: clientName(r.clients),
        amount: '—', type: 'engagement', href: '/engagements',
        ts: new Date(r.created_at).getTime(), time: relativeTime(new Date(r.created_at).getTime()),
      }))
      acts.sort((a, b) => b.ts - a.ts)
      setActivity(acts.slice(0, 5))

      setStats({
        revenue: totalCollected,
        outstanding,
        overdueCount,
        clients: clientsRes.count ?? 0,
        engagements: engagementsRes.count ?? 0,
      })
      setPieData(pie)
      setInvoiceTotal(invoices.length)

      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div>
        <TopBar title="Dashboard" breadcrumb={['Workspace', 'Dashboard']} />
        <div className="px-8 py-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-100 rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 h-64 bg-gray-100 rounded-xl" />
              <div className="h-64 bg-gray-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      key: 'revenue',
      href: '/payments',
      icon: CreditCard,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      trend: 'Collected',
      trendUp: true,
      value: formatNaira(stats.revenue),
      label: 'Total Revenue Collected',
    },
    {
      key: 'invoices',
      href: '/invoices',
      icon: FileText,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      trend: stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : 'On track',
      trendUp: stats.overdueCount === 0,
      value: formatNaira(stats.outstanding),
      label: 'Outstanding Invoices',
    },
    {
      key: 'clients',
      href: '/clients',
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: `${stats.clients} total`,
      trendUp: true,
      value: String(stats.clients),
      label: 'Active Clients',
    },
    {
      key: 'engagements',
      href: '/engagements',
      icon: Briefcase,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      trend: 'Active',
      trendUp: true,
      value: String(stats.engagements),
      label: 'Active Engagements',
    },
  ]

  return (
    <div>
      <TopBar
        title={businessName}
        subtitle="Operations overview"
        breadcrumb={['Workspace', 'Dashboard']}
      />

      <div className="px-8 py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left transition-all hover:shadow-md hover:border-green-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <card.icon size={17} className={card.iconColor} />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${
                  card.trendUp ? 'text-green-600' : 'text-red-500'
                }`}>
                  {card.trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {card.trend}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
              <p className="text-[10px] text-green-600 mt-1.5 font-medium">View all →</p>
            </Link>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Cashflow Overview</h2>
                <p className="text-xs text-gray-400 mt-0.5">Invoiced vs Collected — Last 6 months</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0a1510] inline-block" />
                  Invoiced
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  Collected
                </span>
              </div>
            </div>
            {cashflowData.every((d) => d.invoiced === 0 && d.paid === 0) ? (
              <div className="flex flex-col items-center justify-center" style={{ height: 200 }}>
                <p className="text-sm text-gray-400">No cashflow data yet</p>
                <p className="text-xs text-gray-300 mt-1">Charts populate as you invoice and collect payments.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cashflowData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatNaira} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="invoiced" name="Invoiced" fill="#0a1510" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="paid" name="Collected" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Invoice Status</h2>
            <p className="text-xs text-gray-400 mb-4">Breakdown by collection status</p>
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-gray-400">No invoices yet</p>
                <p className="text-xs text-gray-300 mt-1">Status breakdown appears once you issue invoices.</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-4">
                  <PieChart width={140} height={140}>
                    <Pie
                      data={pieData}
                      cx={65}
                      cy={65}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div className="space-y-2">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-gray-600">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-800">
                        {item.value} ({invoiceTotal > 0 ? Math.round((item.value / invoiceTotal) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Link href="/invoices" className="block mt-4 text-xs text-green-600 hover:underline font-medium">
              View all invoices →
            </Link>
          </div>
        </div>

        {/* Revenue trend + Recent activity */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Revenue Trend</h2>
                <p className="text-xs text-gray-400 mt-0.5">Monthly collected revenue</p>
              </div>
            </div>
            {revenueData.every((d) => d.revenue === 0) ? (
              <div className="flex flex-col items-center justify-center" style={{ height: 160 }}>
                <p className="text-sm text-gray-400">No revenue recorded yet</p>
                <p className="text-xs text-gray-300 mt-1">This chart fills in as payments are recorded.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatNaira} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#16a34a"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                    dot={{ fill: '#16a34a', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Recent Activity</h2>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-gray-400">No activity yet</p>
                <p className="text-xs text-gray-300 mt-1">Actions appear here as you use the workspace.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activity.map((item, i) => {
                  const config = activityTypeConfig[item.type]
                  return (
                    <Link
                      key={i}
                      href={item.href}
                      className="flex items-start gap-3 hover:bg-gray-50 rounded-lg p-1.5 -mx-1.5 transition-colors group"
                    >
                      <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <span className={`text-[10px] font-bold ${config.color}`}>
                          {config.letter}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate group-hover:text-green-700 transition-colors">
                          {item.action}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{item.client}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {item.amount !== '—' && (
                          <p className="text-xs font-semibold text-gray-700">{item.amount}</p>
                        )}
                        <p className="text-[10px] text-gray-400">{item.time}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
            <Link href="/payments" className="block mt-4 pt-3 border-t border-gray-100 text-xs text-green-600 hover:underline font-medium">
              View all activity →
            </Link>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Add a client', href: '/clients', icon: Users, color: 'bg-blue-50 text-blue-600' },
              { label: 'New engagement', href: '/engagements', icon: Briefcase, color: 'bg-purple-50 text-purple-600' },
              { label: 'Issue quotation', href: '/quotations', icon: FileText, color: 'bg-orange-50 text-orange-600' },
              { label: 'Generate invoice', href: '/invoices', icon: Receipt, color: 'bg-green-50 text-green-600' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-green-200 hover:bg-[#f0faf4] transition-all group"
              >
                <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center shrink-0`}>
                  <action.icon size={15} />
                </div>
                <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}