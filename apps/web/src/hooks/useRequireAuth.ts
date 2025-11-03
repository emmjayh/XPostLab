'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export function useRequireAuth() {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      const redirect = encodeURIComponent(pathname || '/')
      router.replace(`/login?redirect=${redirect}`)
    }
  }, [isLoading, user, router, pathname])

  return { user, token, isLoading }
}
