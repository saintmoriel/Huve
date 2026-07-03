'use client'

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
    <div className="bg-white border-b border-gray-100 px-8 py-5">
      <div className="flex items-start justify-between">
        <div>
          {breadcrumb && (
            <div className="flex items-center gap-1.5 mb-2">
              {breadcrumb.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <span className={`text-xs font-medium tracking-wider uppercase ${
                    i === breadcrumb.length - 1 ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {crumb}
                  </span>
                  {i < breadcrumb.length - 1 && (
                    <span className="text-gray-300 text-xs">›</span>
                  )}
                </span>
              ))}
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1 max-w-xl">{subtitle}</p>}
        </div>
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            <span>+</span>
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}