'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Root route: send logged-in users to the dashboard, everyone else to login.
// Mirrors the auth check used across the rest of the app.
export default function Home() {
  const router = useRouter()

  useEffect(() => {
    async function route() {
      const { data: { user } } = await supabase.auth.getUser()
      router.replace(user ? '/dashboard' : '/login')
    }
    route()
  }, [router])

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8faf8]">
      <p className="text-sm text-gray-400">Loading Huve...</p>
    </main>
  )
}