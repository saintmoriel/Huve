'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const authPages = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isAuthPage = authPages.includes(pathname)

  useEffect(() => {
    function handleToggle(e: CustomEvent) {
      setCollapsed(e.detail.collapsed)
    }
    window.addEventListener('sidebar-toggle', handleToggle as EventListener)
    return () => window.removeEventListener('sidebar-toggle', handleToggle as EventListener)
  }, [])

  if (isAuthPage) return <>{children}</>

  return (
    <div
      style={{
        marginLeft: collapsed ? '64px' : '220px',
        minHeight: '100vh',
        backgroundColor: '#f8faf8',
        transition: 'margin-left 0.3s ease-in-out',
      }}
    >
      {children}
    </div>
  )
}