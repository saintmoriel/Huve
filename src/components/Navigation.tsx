'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Receipt,
  CreditCard,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Engagements', href: '/engagements', icon: Briefcase },
  { label: 'Quotations', href: '/quotations', icon: FileText },
  { label: 'Invoices', href: '/invoices', icon: Receipt },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Audit Log', href: '/audit', icon: ShieldCheck },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()

  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password']
if (authPages.includes(pathname)) return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="fixed top-0 left-0 h-screen w-[220px] bg-[#0a1510] flex flex-col z-50">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[#1a3a24]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <div>
            <span className="text-white text-base font-bold tracking-tight block leading-none">Huve</span>
            <span className="text-green-400 text-[9px] font-medium tracking-widest uppercase mt-0.5 block">
              Primers Group
            </span>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex-1 flex flex-col gap-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#1a3a24] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-green-400' : 'text-gray-500'} />
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#1a3a24]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1a3a24]/50 transition-all"
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </nav>
  )
}
