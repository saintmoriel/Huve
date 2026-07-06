'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import HuveLogo from '@/components/HuveLogo'
import { useEffect, useState, useRef } from 'react'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Receipt,
  CreditCard,
  ShieldCheck,
  Bell,
  Settings,
  ChevronDown,
  LogOut,
  Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

const primaryNav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Engagements', href: '/engagements', icon: Briefcase },
]

const financeNav = [
  { label: 'Quotations', href: '/quotations', icon: FileText },
  { label: 'Invoices', href: '/invoices', icon: Receipt },
  { label: 'Payments', href: '/payments', icon: CreditCard },
]

const securityNav = [
  { label: 'Audit Log', href: '/audit', icon: ShieldCheck },
]

type UserInfo = {
  fullName: string
  businessName: string
  initials: string
}

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [financeOpen, setFinanceOpen] = useState(false)
  const [securityOpen, setSecurityOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const financeRef = useRef<HTMLDivElement>(null)
  const securityRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password']
  if (authPages.includes(pathname)) return null

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, business_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const { data: business } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', profile.business_id)
        .single()

      const fullName = profile.full_name ?? 'User'
      const businessName = business?.name ?? 'My Business'
      const initials = fullName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

      setUserInfo({ fullName, businessName, initials })
    }
    loadUser()
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (financeRef.current && !financeRef.current.contains(e.target as Node)) setFinanceOpen(false)
      if (securityRef.current && !securityRef.current.contains(e.target as Node)) setSecurityOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isFinanceActive = financeNav.some(item => pathname === item.href)
  const isSecurityActive = securityNav.some(item => pathname === item.href)

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0a1510] z-50 flex items-center px-6 border-b border-[#1a3a24]">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 mr-4">
        <HuveLogo size={32} />
        <span className="text-white text-base font-bold tracking-tight">Huve</span>
      </Link>

      {/* Primary nav */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {primaryNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#1a3a24] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/50'
              }`}
            >
              <item.icon size={15} className={isActive ? 'text-green-400' : 'text-gray-500'} />
              {item.label}
            </Link>
          )
        })}

        {/* Finance dropdown */}
        <div ref={financeRef} className="relative">
          <button
            onClick={() => { setFinanceOpen(!financeOpen); setSecurityOpen(false); setProfileOpen(false) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isFinanceActive
                ? 'bg-[#1a3a24] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/50'
            }`}
          >
            <Receipt size={15} className={isFinanceActive ? 'text-green-400' : 'text-gray-500'} />
            Finance
            <ChevronDown size={13} className={`transition-transform ${financeOpen ? 'rotate-180' : ''}`} />
          </button>

          {financeOpen && (
            <div className="absolute top-11 left-0 w-48 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden z-50">
              {financeNav.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setFinanceOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={15} className={isActive ? 'text-green-600' : 'text-gray-400'} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Security dropdown */}
        <div ref={securityRef} className="relative">
          <button
            onClick={() => { setSecurityOpen(!securityOpen); setFinanceOpen(false); setProfileOpen(false) }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isSecurityActive
                ? 'bg-[#1a3a24] text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#1a3a24]/50'
            }`}
          >
            <ShieldCheck size={15} className={isSecurityActive ? 'text-green-400' : 'text-gray-500'} />
            Security
            <ChevronDown size={13} className={`transition-transform ${securityOpen ? 'rotate-180' : ''}`} />
          </button>

          {securityOpen && (
            <div className="absolute top-11 left-0 w-48 bg-white rounded-xl border border-gray-100 shadow-lg overflow-hidden z-50">
              {securityNav.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSecurityOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon size={15} className={isActive ? 'text-green-600' : 'text-gray-400'} />
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <div className="flex items-center gap-2 bg-[#1a3a24]/50 border border-[#1a3a24] rounded-lg px-3 py-2 w-56">
          <Search size={14} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-gray-300 outline-none w-full placeholder-gray-500"
          />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false) }}
            className="p-2 rounded-lg hover:bg-[#1a3a24] text-gray-400 hover:text-white transition-colors relative"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
          </button>

          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 top-11 w-72 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">Notifications</p>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <p className="text-sm text-gray-700 font-medium">Welcome to Huve</p>
                    <p className="text-xs text-gray-400 mt-0.5">Your workspace is ready. Start by adding a client.</p>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    <p className="text-sm text-gray-700 font-medium">Security reminder</p>
                    <p className="text-xs text-gray-400 mt-0.5">All data is encrypted and isolated to your business.</p>
                  </div>
                </div>
                <div className="px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 text-center">More notifications coming soon</p>
                </div>
              </div>
            </>
          )}
        </div>

        <Link
          href="/settings"
          className={`p-2 rounded-lg transition-colors ${
            pathname.startsWith('/settings')
              ? 'bg-[#1a3a24] text-white'
              : 'hover:bg-[#1a3a24] text-gray-400 hover:text-white'
          }`}
          title="Workspace settings"
        >
          <Settings size={18} />
        </Link>

        <div className="w-px h-6 bg-[#1a3a24]" />

        {/* Profile dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotificationsOpen(false) }}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#1a3a24] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
              {userInfo?.initials ?? '??'}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white leading-none">
                {userInfo?.fullName ?? 'Loading...'}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {userInfo?.businessName ?? ''}
              </p>
            </div>
            <ChevronDown size={13} className="text-gray-400" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 top-11 w-52 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">{userInfo?.fullName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{userInfo?.businessName}</p>
                </div>
                <div className="p-1">
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Settings size={15} />
                    Workspace profile
                  </Link>
                  <Link
                    href="/settings/team"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Users size={15} />
                    Team operators
                  </Link>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}