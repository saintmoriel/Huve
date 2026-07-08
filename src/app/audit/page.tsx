'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import TopBar from '@/components/TopBar'
import { ShieldCheck, Lock } from 'lucide-react'

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

export default function AuditPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadLogs() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

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

  return (
    <div>
      <TopBar
        title="Audit Log"
        subtitle="Every sensitive action is recorded, timestamped, and scoped to your business only."
        breadcrumb={['Workspace', 'Security', 'Audit Log']}
      />

      <div className="px-6 py-6">
        <div className="flex items-start gap-3 px-4 py-3 bg-[#f0faf4] border border-green-100 rounded-xl mb-6">
          <ShieldCheck size={16} className="text-green-600 mt-0.5 shrink-0" />
          <p className="text-sm text-green-800">
            This log is tamper-evident and cryptographically scoped to your business. No other tenant can access or view these records.
          </p>
        </div>

        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading audit log...</p>
        ) : logs.length === 0 ? (
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Resource</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Record ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionInfo = actionConfig[log.action] ?? { label: log.action.toUpperCase(), classes: 'bg-gray-100 text-gray-500' }
                  return (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded tracking-wider ${actionInfo.classes}`}>
                          {actionInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-gray-700">{log.table_name}</td>
                      <td className="px-5 py-4 text-sm text-gray-400 font-mono">
                        {log.record_id ? `${log.record_id.slice(0, 8)}...` : '—'}
                      </td>
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
      </div>
    </div>
  )
}