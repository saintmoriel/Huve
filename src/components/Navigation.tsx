'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Receipt,
  CreditCard,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
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
  const [collapsed, setCollapsed] = useState(false)
  const [businessName, setBusinessName] = useState<string | null>(null)

  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password']
  if (authPages.includes(pathname)) return null

  useEffect(() => {
    async function loadBusiness() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', profile.business_id)
        .single()

      if (business) setBusinessName(business.name)
    }
    loadBusiness()
  }, [])

  function handleToggle() {
    const next = !collapsed
    setCollapsed(next)
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 h-screen bg-[#0a1510] flex flex-col z-50 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[64px]' : 'w-[220px]'
        }`}
      >
        {/* Brand */}
        <div className={`flex items-center border-b border-[#1a3a24] transition-all duration-300 ${
          collapsed ? 'px-4 py-5 justify-center' : 'px-5 py-5'
        }`}>
          <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm tracking-tight">H</span>
          </div>
          {!collapsed && (
            <div className="ml-2.5 overflow-hidden">
              <span className="text-white text-base font-bold tracking-tight block leading-none">Huve</span>
              {businessName && (
                <span className="text-green-400 text-[9px] font-medium tracking-widest uppercase mt-0.5 block truncate">
                  {businessName}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Nav items */}
        <div className="flex-1 flex flex-col gap-0.5 px-2 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-[#1a3a24] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/50'
                }`}
              >
                <Icon
                  size={16}
                  className={isActive ? 'text-green-400 shrink-0' : 'text-gray-500 shrink-0'}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </div>

        {/* Logout */}
        <div className="px-2 py-4 border-t border-[#1a3a24]">
          <button
            onClick={handleLogout}
            title={collapsed ? 'Log out' : undefined}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[#1a3a24]/50 transition-all ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </nav>

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-50 w-5 h-10 bg-[#1a3a24] hover:bg-green-700 text-white rounded-r-lg flex items-center justify-center transition-all duration-300 ${
          collapsed ? 'left-[64px]' : 'left-[220px]'
        }`}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </>
  )
}