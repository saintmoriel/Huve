'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSessionUser } from '@/lib/getSessionUser'
import HuveLogo from '@/components/HuveLogo'

export default function Home() {
  const router = useRouter()
  const [message, setMessage] = useState('Loading Huve...')

  useEffect(() => {
    let cancelled = false
    async function route() {
      try {
        const user = await getSessionUser()
        if (cancelled) return
        router.replace(user ? '/dashboard' : '/login')
      } catch {
        if (cancelled) return
        setMessage('Almost there...')
        router.replace('/login')
      }
    }
    route()
    return () => { cancelled = true }
  }, [router])

  return (
    <main className="min-h-screen bg-[#f8faf8] flex flex-col items-center justify-center gap-4">
      <HuveLogo size={48} />
      <p className="text-sm text-gray-400 animate-pulse">{message}</p>
    </main>
  )
}