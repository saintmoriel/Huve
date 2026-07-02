'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ShieldCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    setSent(true)
  }

  return (
    <main className="min-h-screen bg-[#f8faf8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#0a1510] rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-green-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">Huve</p>
            <p className="text-xs text-gray-400 mt-0.5">Secure Operations Platform</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={22} className="text-green-600" />
              </div>
              <h1 className="text-lg font-semibold text-gray-900 mb-2">Reset link sent</h1>
              <p className="text-sm text-gray-500">
                Check <span className="font-medium text-gray-700">{email}</span> for a password reset link.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Reset password</h1>
              <p className="text-sm text-gray-400 mb-6">
                Enter your email and we'll send you a reset link.
              </p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
                  />
                </div>
                {error && (
                  <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          <Link href="/login" className="text-green-600 hover:underline font-medium">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
