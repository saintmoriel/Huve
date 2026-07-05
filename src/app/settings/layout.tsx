'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { Sliders, Users, ShieldAlert } from 'lucide-react'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const tabs = [
    { name: 'General Profile', href: '/settings', icon: Sliders },
    { name: 'Team Operators', href: '/settings/team', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-[#f8faf8]">
      <TopBar
        title="Workspace Configuration"
        subtitle="Manage structural tenant definitions, access controls, and administrative settings."
        breadcrumb={['Workspace', 'Settings']}
      />

      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Settings Sub-Sidebar Tab Group */}
          <aside className="w-full md:w-64 shrink-0 space-y-1">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                    isActive
                      ? 'bg-[#0a1510] text-white'
                      : 'text-gray-500 hover:text-[#0a1510] hover:bg-gray-100'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.name}
                </Link>
              )
            })}
          </aside>

          {/* Primary Settings Workspace Layer */}
          <main className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm p-6 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}