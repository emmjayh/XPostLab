import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'AI Content Coach',
  description: 'Your AI-powered content creation companion',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-semibold text-gray-900">
                    AI Content Coach
                  </h1>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    MVP Demo
                  </span>
                </div>
                <nav className="flex space-x-6">
                  <a href="/" className="text-gray-600 hover:text-gray-900">Composer</a>
                  <a href="/personas" className="text-gray-600 hover:text-gray-900">Personas</a>
                  <a href="/jobs" className="text-gray-600 hover:text-gray-900">Jobs</a>
                </nav>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}