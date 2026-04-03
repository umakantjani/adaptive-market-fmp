'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

interface Props { children: React.ReactNode }

export default function AppShell({ children }: Props) {
  const pathname = usePathname()
  const symbol = pathname.match(/\/ticker\/([^/]+)/)?.[1]?.toUpperCase()

  // Don't show sidebar on auth pages
  const isAuthPage = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')

  return (
    <>
      {!isAuthPage && <Sidebar symbol={symbol} />}
      <div className={isAuthPage ? '' : 'has-sidebar'}>
        {children}
      </div>
    </>
  )
}
