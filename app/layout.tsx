import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NBP DocSign',
  description: 'NetBounce Placement document generation and signing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
