'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const navItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Clients', href: '/clients' },
  { label: 'Engagements', href: '/engagements' },
  { label: 'Quotations', href: '/quotations' },
  { label: 'Invoices', href: '/invoices' },
  { label: 'Payments', href: '/payments' },
  { label: 'Audit Log', href: '/audit' },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/login') return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="fixed top-0 left-0 h-screen w-[220px] bg-[#0a1510] flex flex-col z-50">

      {/* Brand */}
      <div className="px-6 py-6 border-b border-[#1a3a24]">
        <span className="text-white text-xl font-bold tracking-tight">Huve</span>
        <span className="block text-[#4ade80] text-[10px] font-medium tracking-widest uppercase mt-1">
          Primers Group
        </span>
      </div>

      {/* Nav items */}
      <div className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-[#1a3a24] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/50'
                }
              `}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-[#1a3a24]">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white border border-[#1a3a24] hover:border-[#2d5a3d] transition-colors"
        >
          Log out
        </button>
      </div>
    </nav>
  )
}