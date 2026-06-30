'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/dashboard')
  }

  return (
    <main style={{ maxWidth: '360px', margin: '4rem auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ marginBottom: '1.5rem' }}>Huve — Sign In</h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.6rem', background: '#111', color: '#fff', borderRadius: '4px', border: 'none' }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        {error && <p style={{ color: 'red', fontSize: '0.9rem' }}>{error}</p>}
      </form>
    </main>
  )
}
