'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface RightPanelProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function RightPanel({ title, subtitle, children }: RightPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-[#0a1510] text-white px-1.5 py-4 rounded-l-lg shadow-lg hover:bg-[#1a3a24] transition-colors"
      >
        {open ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white border-l border-gray-100 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Panel header */}
          <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-green-100 rounded flex items-center justify-center">
                <span className="text-green-600 text-xs">⚡</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            {subtitle && <p className="text-xs text-gray-500 ml-7">{subtitle}</p>}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/10"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
