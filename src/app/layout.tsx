import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'Adaptive Market - TA Analyzer',
  description: 'Institutional Technical Analysis powered by Claude AI',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AdaptiveTA',
  },
}

export const viewport: Viewport = {
  themeColor: '#0F0F13',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        </head>
        <body style={{ background: '#0F0F13' }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
