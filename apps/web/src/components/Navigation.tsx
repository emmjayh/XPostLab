'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface NavItem {
  label: string
  href: string
}

const marketingNav: NavItem[] = [
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Try It', href: '/#composer' },
]

const memberNav: NavItem[] = [
  { label: 'Composer', href: '/composer' },
  { label: 'Persona Engine', href: '/personas' },
  { label: 'Insight Radar', href: '/insights' },
  { label: 'Reply Studio', href: '/replies' },
]

export function Navigation() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
    setIsMenuOpen(false)
  }

  const handleNavClick = () => {
    setIsMenuOpen(false)
  }

  const navItems = useMemo(() => (user ? memberNav : marketingNav), [user])

  const primaryAction = user
    ? { label: 'Open Composer', href: '/composer' }
    : { label: 'Sign In', href: '/login' }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg text-white text-lg font-semibold shadow-sm">
                X
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-lg font-semibold text-gray-900">X Post Lab</span>
                <span className="text-xs uppercase tracking-wide text-gray-400">AI Content Studio</span>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center space-x-10 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center space-x-4 md:flex">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">{user.name || user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign In
              </Link>
            )}
            <Link
              href={primaryAction.href}
              className="hidden sm:inline-flex btn-primary text-sm"
            >
              {primaryAction.label}
            </Link>
          </div>

          <button
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 transition hover:bg-gray-100 md:hidden"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <nav className="space-y-2 px-4 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                onClick={handleNavClick}
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
              {user ? (
                <>
                  <span className="block text-sm text-gray-500">{user.name || user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  onClick={handleNavClick}
                >
                  Sign In
                </Link>
              )}

              <Link
                href={primaryAction.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-white gradient-bg text-center shadow-md"
                onClick={handleNavClick}
              >
                {primaryAction.label}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
