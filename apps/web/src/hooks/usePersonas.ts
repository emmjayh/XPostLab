'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { demoPersonas } from '@/data/demoPersonas'
import { Persona } from '@/types/persona'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'dev-user'

interface UsePersonasOptions {
  /**
   * When true (default), fall back to demo personas if the request fails.
   */
  allowFallback?: boolean
}

export function usePersonas(options: UsePersonasOptions = {}) {
  const { allowFallback = true } = options
  const { user, token, isLoading: authLoading } = useAuth()
  const [personas, setPersonas] = useState<Persona[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.id || DEMO_USER_ID

  const fetchPersonas = useCallback(async () => {
    if (!userId) {
      if (allowFallback) {
        setPersonas(demoPersonas)
        setIsLoading(false)
      }
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const url = new URL('/api/personas', API_BASE)
      url.searchParams.set('userId', userId)

      const response = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (!response.ok) {
        throw new Error(`Persona request failed with status ${response.status}`)
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error('Unexpected persona response format')
      }

      setPersonas(data as Persona[])
    } catch (err) {
      console.error('Failed to load personas', err)
      setError(err instanceof Error ? err.message : 'Failed to load personas')
      if (allowFallback) {
        setPersonas(demoPersonas)
      } else {
        setPersonas([])
      }
    } finally {
      setIsLoading(false)
    }
  }, [allowFallback, token, userId])

  useEffect(() => {
    if (authLoading) return
    fetchPersonas()
  }, [authLoading, fetchPersonas])

  const defaultPersonaId = useMemo(() => {
    return personas.find((persona) => persona.isDefault)?.id ?? personas[0]?.id ?? null
  }, [personas])

  return {
    personas,
    isLoading,
    error,
    refresh: fetchPersonas,
    defaultPersonaId,
    userId,
    setPersonas,
  }
}
