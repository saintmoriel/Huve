'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { ShieldCheck, Lock, Download } from 'lucide-react'
import { getSessionUser } from '@/lib/getSessionUser'

type AuditLog = {
  id: string
  action: string
  table_name: string
  record_id: string | null
  created_at: string
  user_id: string | null
}

const actionConfig: Record<string, { label: string; classes: string }> = {
  created: { label: 'CREATED', classes: 'bg-green-100 text-green-700' },
  payment_recorded: { label: 'PAYMENT', classes: 'bg-blue-100 text-blue-600' },
  updated: { label: 'UPDATED', classes: 'bg-yellow-100 text-yellow-600' },
  deleted: { label: 'DELETED', classes: 'bg-red-100 text-red-600' },
}

// Human-readable names for the tables we log against
const resourceLabels: Record<string, string> = {
  clients: 'Client',
  engagements: 'Engagement',
  quotations: 'Quotation',
  invoices: 'Invoice',
  payments: 'Payment',
  profiles: 'Team member',
  businesses: 'Workspace',
}

function actionSummary(action: string, table: string): string {
  const resource = resourceLabels[table] ?? table
  switch (action) {
    case 'created': return `${resource} created`
    case 'updated': return `${resource} updated`
    case 'deleted': return `${resource} deleted`
    case 'payment_recorded': return `Payment recorded`
    default: return `${action.replace(/_/g, ' ')} · ${resource}`
  }
}

export default function AuditPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [userNames, setUserNames] = useState<Map<string, string>>(new Map())
  const [userRole, setUserRole] = useState<string>('staff')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canView = userRole === 'owner' || userRole === 'admin'

  useEffect(() => {
    async function loadLogs() {
      const user = await getSessionUser()
      if (!user) { router.push('/login'); return }

      // Get this user's role for the access guard
      const { data: me } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      const role = me?.role ?? 'staff'
      setUserRole(role)

      if (role !== 'owner' && role !== 'admin') {
        setLoading(false)
        return
      }

      // Fetch team once, to map user_id -> name
      const { data: members } = await supabase
        .from('profiles').select('id, full_name')
      const nameMap = new Map<string, string>()
      ;(members ?? []).forEach((m: { id: string; full_name: string | null }) => {
        nameMap.set(m.id, m.full_name ?? 'Unknown')
      })
      setUserNames(nameMap)

      const { data, error: logsError } = await supabase
        .from('audit_logs')
        .select('id, action, table_name, record_id, created_at, user_id')
        .order('created_at', { ascending: false })

      if (logsError) setError(logsError.message)
      else setLogs(data ?? [])
      setLoading(false)
    }
    loadLogs()
  }, [router])

  function exportCsv() {
    const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Record ID']
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`
    const rows = logs.map((log) => {
      const who = log.user_id ? (userNames.get(log.user_id) ?? 'Unknown') : 'System'
      const when = new Date(log.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })
      return [
        esc(when),
        esc(who),
        esc(actionSummary(log.action, log.table_name)),
        esc(resourceLabels[log.table_name] ?? log.table_name),
        esc(log.record_id ?? ''),
      ].join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `huve-audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <TopBar
        title="Audit Log"
        subtitle="Every sensitive action is recorded, timestamped, and scoped to your business only."
        breadcrumb={['Workspace', 'Security', 'Audit Log']}
      />

      <div className="px-6 py-6">
        {loading ? (
          <p className="text-gray-400 text-sm">Loading audit log...</p>
        ) : !canView ? (
          // RBAC guard
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Lock size={24} className="text-gray-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-700 mb-1">Restricted area</h2>
            <p className="text-sm text-gray-400 max-w-xs">
              The audit log is available to owners and admins only. Contact your workspace owner if you need access.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-3 px-4 py-3 bg-[#f0faf4] border border-green-100 rounded-xl flex-1">
                <ShieldCheck size={16} className="text-green-600 mt-0.5 shrink-0" />
                <p className="text-sm text-green-800">
                  This log is tamper-evident and scoped to your business. No other tenant can access or view these records.
                </p>
              </div>
              {logs.length > 0 && (
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors shrink-0"
                >
                  <Download size={14} />
                  Export CSV
                </button>
              )}
            </div>

            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>}

            {logs.length === 0 ? (
              <div className="text-center py-20">
                <Lock size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">No actions logged yet.</p>
                <p className="text-xs text-gray-300 mt-1">Actions will appear here as your team uses the platform.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Activity</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const actionInfo = actionConfig[log.action] ?? { label: log.action.toUpperCase(), classes: 'bg-gray-100 text-gray-500' }
                      const who = log.user_id ? (userNames.get(log.user_id) ?? 'Unknown') : 'System'
                      return (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded tracking-wider ${actionInfo.classes}`}>
                              {actionInfo.label}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm font-medium text-gray-700">
                            {actionSummary(log.action, log.table_name)}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">{who}</td>
                          <td className="px-5 py-4 text-sm text-gray-400">
                            {new Date(log.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}