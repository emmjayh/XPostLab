'use client'

import { AuthProvider } from '@/contexts/AuthContext'
import { Navigation } from './Navigation'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AuthProvider>
  )
}
