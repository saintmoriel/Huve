import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Huve',
  description: 'The secure operating platform for professional service businesses.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif', backgroundColor: '#f8faf8' }}>
        <Navigation />
        <div style={{ paddingTop: '64px', minHeight: '100vh' }}>
          {children}
        </div>
      </body>
    </html>
  )
}