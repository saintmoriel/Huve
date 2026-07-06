interface HuveLogoProps {
  size?: number
  className?: string
}

// Deep-green filled hexagon with a white H and a bright-green accent crossbar.
export default function HuveLogo({ size = 32, className = '' }: HuveLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Huve logo"
    >
      {/* Hexagon */}
      <path d="M40 2 L74 21 L74 59 L40 78 L6 59 L6 21 Z" fill="#0a1510" />
      {/* H legs (white) */}
      <rect x="26" y="24" width="7" height="32" rx="3.5" fill="#ffffff" />
      <rect x="47" y="24" width="7" height="32" rx="3.5" fill="#ffffff" />
      {/* Crossbar (bright green accent) */}
      <rect x="26" y="36.5" width="28" height="7" rx="3.5" fill="#16a34a" />
    </svg>
  )
}