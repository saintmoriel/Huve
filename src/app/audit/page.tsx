'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type AuditLog = {
  id: string
  action: string
  table_name: string
  record_id: string | null
  created_at: string
  user_id: string | null
}

export default function AuditPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadLogs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error: logsError } = await supabase
        .from('audit_logs')
        .select('id, action, table_name, record_id, created_at, user_id')
        .order('created_at', { ascending: false })

      if (logsError) {
        setError(logsError.message)
      } else {
        setLogs(data ?? [])
      }

      setLoading(false)
    }

    loadLogs()
  }, [router])

  function formatDate(ts: string) {
    return new Date(ts).toLocaleString('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function actionColor(action: string) {
    if (action === 'created') return '#166534'
    if (action === 'payment_recorded') return '#1e40af'
    if (action === 'deleted') return '#991b1b'
    return '#374151'
  }

  if (loading) {
    return <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>Loading audit log...</main>
  }

  return (
    <main style={{ maxWidth: '800px', margin: '2rem auto', fontFamily: 'sans-serif', padding: '0 1rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Audit Log</h1>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Every sensitive action taken in your account is recorded here. This log is tamper-evident and scoped to your business only.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {logs.length === 0 && !error && (
        <p>No actions logged yet. Create an invoice or record a payment to see entries here.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {logs.map((log) => (
          <div
            key={log.id}
            style={{
              border: '1px solid #eee',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  color: actionColor(log.action),
                  background: `${actionColor(log.action)}18`,
                  marginRight: '0.5rem',
                }}
              >
                {log.action.replace('_', ' ').toUpperCase()}
              </span>
              <span style={{ fontSize: '0.9rem' }}>
                {log.table_name}
                {log.record_id && (
                  <span style={{ color: '#999', fontSize: '0.8rem' }}> · {log.record_id.slice(0, 8)}...</span>
                )}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#999', whiteSpace: 'nowrap' }}>
              {formatDate(log.created_at)}
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
