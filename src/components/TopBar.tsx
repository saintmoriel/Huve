'use client'

import { Bell, Settings, Search } from 'lucide-react'

interface TopBarProps {
  title: string
  subtitle?: string
  breadcrumb?: string[]
  action?: {
    label: string
    onClick: () => void
  }
}

export default function TopBar({ title, subtitle, breadcrumb, action }: TopBarProps) {
  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-72">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search across Huve..."
            className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder-gray-400"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings size={18} />
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-[#0a1510] flex items-center justify-center text-white text-xs font-semibold">
              PG
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 leading-none">Primers Group</p>
              <p className="text-xs text-gray-400 mt-0.5">Security Lead</p>
            </div>
          </div>
        </div>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between px-6 py-4">
        <div>
          {breadcrumb && (
            <div className="flex items-center gap-1.5 mb-2">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium tracking-wider uppercase ${i === breadcrumb.length - 1 ? 'text-green-600' : 'text-gray-400'}`}>
                    {crumb}
                  </span>
                  {i < breadcrumb.length - 1 && <span className="text-gray-300 text-xs">›</span>}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span>+</span>
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
