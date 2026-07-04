'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface RightPanelProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function RightPanel({ title, subtitle, children }: RightPanelProps) {
  const [open, setOpen] = useState(false)
  const [hasBeenClicked, setHasBeenClicked] = useState(false)
  const [bounce, setBounce] = useState(false)

  // Start bouncing after 1.5s on page load, stop after user clicks
  useEffect(() => {
    if (hasBeenClicked) return
    const timer = setTimeout(() => setBounce(true), 1500)
    return () => clearTimeout(timer)
  }, [hasBeenClicked])

  function handleToggle() {
    setOpen(!open)
    if (!hasBeenClicked) {
      setHasBeenClicked(true)
      setBounce(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes bounceTab {
          0%, 100% { transform: translateY(-50%) translateX(0px); }
          25% { transform: translateY(-50%) translateX(-6px); }
          50% { transform: translateY(-50%) translateX(-3px); }
          75% { transform: translateY(-50%) translateX(-5px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(22, 163, 74, 0); }
        }
        .bounce-tab {
          animation: bounceTab 1s ease-in-out infinite, pulseGlow 1.5s ease-in-out infinite;
        }
      `}</style>

      {/* Toggle tab */}
      <button
        onClick={handleToggle}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-[#0a1510] hover:bg-green-700 text-white px-1.5 py-5 rounded-l-xl shadow-lg transition-colors flex flex-col items-center gap-1 ${
          bounce && !open ? 'bounce-tab' : ''
        }`}
        title="Open panel"
      >
        {open ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        {!open && (
          <span
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              fontSize: '9px',
              fontWeight: '600',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#4ade80',
              marginTop: '4px',
            }}
          >
            Quick Add
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        className={`fixed top-16 right-0 h-[calc(100vh-64px)] w-80 bg-white border-l border-gray-100 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Panel header */}
          <div className="px-5 py-5 border-b border-gray-100 bg-[#f8faf8]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-xs font-bold">+</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 ml-8">{subtitle}</p>
            )}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {children}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}