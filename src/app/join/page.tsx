'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ShieldCheck } from 'lucide-react'

function JoinInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [noToken, setNoToken] = useState(false)

  useEffect(() => {
    if (!token) setNoToken(true)
  }, [token])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!token) { setError('Missing invitation token.'); return }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)

    // 1. Create the auth user for the invitee
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (authError || !authData.user) {
      if (authError?.message?.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists. Sign in first, then open the invite link again.')
      } else {
        setError(authError?.message ?? 'Sign up failed.')
      }
      setLoading(false)
      return
    }

    // 2. If there is no active session yet (email confirmation ON), we cannot
    //    call accept_invitation as this user. Tell them to confirm first.
    if (!authData.session) {
      setLoading(false)
      setError('Check your email to confirm your account, then open this invite link again to finish joining.')
      return
    }

    // 3. Attach this user to the inviting business via the secure RPC
    const { error: acceptError } = await supabase.rpc('accept_invitation', {
      p_token: token,
      p_full_name: fullName,
    })

    setLoading(false)
    if (acceptError) { setError(acceptError.message); return }

    router.push('/dashboard')
  }

  if (noToken) {
    return (
      <main className="min-h-screen bg-[#f8faf8] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invalid invite link</h1>
          <p className="text-sm text-gray-500 mb-6">
            This link is missing its invitation token. Ask whoever invited you to send the link again.
          </p>
          <Link href="/login" className="text-green-600 hover:underline text-sm font-medium">
            Go to sign in
          </Link>
        </div>
      </main>
    )
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
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Join your team</h1>
          <p className="text-sm text-gray-400 mb-6">
            You&apos;ve been invited to a Huve workspace. Set up your account to join.
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Work Email
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
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Joining...' : 'Join Workspace'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#f8faf8] flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading invitation...</p>
      </main>
    }>
      <JoinInner />
    </Suspense>
  )
}