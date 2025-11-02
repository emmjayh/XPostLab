'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

export function Navigation() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <h1 className="text-xl font-semibold text-gray-900 cursor-pointer">
                AI Content Coach
              </h1>
            </Link>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              MVP Demo
            </span>
          </div>
          <nav className="flex items-center space-x-6">
            {user ? (
              <>
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  Composer
                </Link>
                <Link href="/personas" className="text-gray-600 hover:text-gray-900">
                  Personas
                </Link>
                <Link href="/uploads" className="text-gray-600 hover:text-gray-900">
                  Uploads
                </Link>
                <div className="flex items-center space-x-4 ml-4 pl-4 border-l">
                  <span className="text-sm text-gray-600">
                    {user.name || user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="btn-primary"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
