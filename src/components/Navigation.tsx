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

  const isAuthPage = pathname === '/login'
  if (isAuthPage) return null

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '220px',
        height: '100vh',
        background: '#0f1a14',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0',
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '0 1.5rem 1.5rem',
          borderBottom: '1px solid #1e3a28',
          marginBottom: '1rem',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: '1.4rem',
            fontWeight: '700',
            letterSpacing: '-0.5px',
          }}
        >
          Huve
        </span>
        <span
          style={{
            display: 'block',
            color: '#4ade80',
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: '2px',
          }}
        >
          Primers Group
        </span>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 0.75rem' }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                padding: '0.6rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.9rem',
                textDecoration: 'none',
                color: isActive ? '#fff' : '#9ca3af',
                background: isActive ? '#1e3a28' : 'transparent',
                fontWeight: isActive ? '600' : '400',
                transition: 'all 0.15s',
              }}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Logout */}
      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1e3a28' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'transparent',
            border: '1px solid #1e3a28',
            borderRadius: '6px',
            color: '#9ca3af',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
      </div>
    </nav>
  )
}
