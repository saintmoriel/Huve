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
import { TrendingUp, TrendingDown, Users, Briefcase, FileText, CreditCard, Receipt, } from 'lucide-react'

const cashflowData = [
  { month: 'Jan', invoiced: 850000, paid: 620000 },
  { month: 'Feb', invoiced: 1200000, paid: 980000 },
  { month: 'Mar', invoiced: 950000, paid: 750000 },
  { month: 'Apr', invoiced: 1400000, paid: 1100000 },
  { month: 'May', invoiced: 1100000, paid: 900000 },
  { month: 'Jun', invoiced: 1650000, paid: 1250000 },
]

const revenueData = [
  { month: 'Jan', revenue: 620000 },
  { month: 'Feb', revenue: 980000 },
  { month: 'Mar', revenue: 750000 },
  { month: 'Apr', revenue: 1100000 },
  { month: 'May', revenue: 900000 },
  { month: 'Jun', revenue: 1250000 },
]

const invoiceStatusData = [
  { name: 'Paid', value: 68, color: '#16a34a' },
  { name: 'Unpaid', value: 22, color: '#dc2626' },
  { name: 'Partial', value: 10, color: '#ea580c' },
]

const recentActivity = [
  { action: 'Invoice generated', client: 'PayFlux Technologies', amount: '₦400,000', time: '2 hours ago', type: 'invoice' },
  { action: 'Payment recorded', client: 'Northbridge Microfinance', amount: '₦650,000', time: '5 hours ago', type: 'payment' },
  { action: 'Quotation sent', client: 'Lagos State Ministry of Trade', amount: '₦1,200,000', time: 'Yesterday', type: 'quotation' },
  { action: 'New engagement', client: 'Marketplace Naija', amount: '—', time: 'Yesterday', type: 'engagement' },
  { action: 'Payment recorded', client: 'Veritas University SU', amount: '₦150,000', time: '2 days ago', type: 'payment' },
]

const activityTypeConfig: Record<string, { color: string; bg: string }> = {
  invoice: { color: 'text-blue-600', bg: 'bg-blue-50' },
  payment: { color: 'text-green-600', bg: 'bg-green-50' },
  quotation: { color: 'text-purple-600', bg: 'bg-purple-50' },
  engagement: { color: 'text-orange-600', bg: 'bg-orange-50' },
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

  return (
    <div>
      <TopBar
        title={businessName}
        subtitle="Overview — June 2025"
        breadcrumb={['Workspace', 'Dashboard']}
      />

      <div className="px-8 py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                <CreditCard size={17} className="text-green-600" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <TrendingUp size={12} /> +12%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">₦6.6M</p>
            <p className="text-xs text-gray-500 mt-1">Total Revenue (YTD)</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <FileText size={17} className="text-red-500" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-red-500">
                <TrendingDown size={12} /> 3 overdue
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">₦1.25M</p>
            <p className="text-xs text-gray-500 mt-1">Outstanding Invoices</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users size={17} className="text-blue-600" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <TrendingUp size={12} /> +2 this month
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">5</p>
            <p className="text-xs text-gray-500 mt-1">Active Clients</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                <Briefcase size={17} className="text-purple-600" />
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <TrendingUp size={12} /> 84% on track
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">3</p>
            <p className="text-xs text-gray-500 mt-1">Active Engagements</p>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-3 gap-4">
          {/* Cashflow chart */}
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
          </div>

          {/* Invoice status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">Invoice Status</h2>
            <p className="text-xs text-gray-400 mb-4">Breakdown by collection status</p>
            <div className="flex justify-center mb-4">
              <PieChart width={140} height={140}>
                <Pie
                  data={invoiceStatusData}
                  cx={65}
                  cy={65}
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {invoiceStatusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="space-y-2">
              {invoiceStatusData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-800">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue trend + Recent activity */}
        <div className="grid grid-cols-3 gap-4">
          {/* Revenue trend */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Revenue Trend</h2>
                <p className="text-xs text-gray-400 mt-0.5">Monthly collected revenue</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                <TrendingUp size={11} /> +38% vs last period
              </span>
            </div>
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
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentActivity.map((item, i) => {
                const config = activityTypeConfig[item.type]
                return (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <span className={`text-[10px] font-bold ${config.color}`}>
                        {item.type[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{item.action}</p>
                      <p className="text-xs text-gray-400 truncate">{item.client}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {item.amount !== '—' && (
                        <p className="text-xs font-semibold text-gray-700">{item.amount}</p>
                      )}
                      <p className="text-[10px] text-gray-400">{item.time}</p>
                    </div>
                  </div>
                )
              })}
            </div>
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
                <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}