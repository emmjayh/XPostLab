import './globals.css'
import { Inter } from 'next/font/google'
import { ClientLayout } from '@/components/ClientLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'X Post Lab - Turn one idea into a month of momentum',
  description:
    'X Post Lab transforms a single spark into a month of strategic, on-brand content with AI personas that match your voice.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
