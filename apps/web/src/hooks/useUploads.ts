'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UploadDetails, UploadSummary } from '@/types/uploads'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface UseUploadsReturn {
  uploads: UploadSummary[]
  uploadDetails: Record<string, UploadDetails>
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  fetchDetails: (uploadId: string, options?: { force?: boolean }) => Promise<UploadDetails | null>
  isFetchingDetails: Record<string, boolean>
}

export function useUploads(): UseUploadsReturn {
  const { token, isLoading: authLoading } = useAuth()
  const [uploads, setUploads] = useState<UploadSummary[]>([])
  const [uploadDetails, setUploadDetails] = useState<Record<string, UploadDetails>>({})
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isFetchingDetails, setIsFetchingDetails] = useState<Record<string, boolean>>({})

  const fetchUploads = useCallback(async () => {
    if (!token) {
      setUploads([])
      setUploadDetails({})
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${API_BASE}/api/uploads`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to load uploads (${response.status})`)
      }

      const data = (await response.json()) as UploadSummary[]
      setUploads(data)
    } catch (err) {
      console.error('Failed to fetch uploads', err)
      setError(err instanceof Error ? err.message : 'Failed to load uploads')
      setUploads([])
    } finally {
      setIsLoading(false)
    }
  }, [token])

  const fetchDetails = useCallback(
    async (uploadId: string, options?: { force?: boolean }) => {
      if (!token) {
        setError('You need to be logged in to view upload details.')
        return null
      }

      const shouldForce = options?.force ?? false
      if (!shouldForce && uploadDetails[uploadId]) {
        return uploadDetails[uploadId]
      }

      try {
        setIsFetchingDetails((prev) => ({ ...prev, [uploadId]: true }))
        setError(null)

        const response = await fetch(`${API_BASE}/api/uploads/${uploadId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to load upload details (${response.status})`)
        }

        const data = (await response.json()) as UploadDetails
        setUploadDetails((prev) => ({ ...prev, [uploadId]: data }))
        return data
      } catch (err) {
        console.error('Failed to fetch upload details', err)
        setError(err instanceof Error ? err.message : 'Failed to load upload details')
        return null
      } finally {
        setIsFetchingDetails((prev) => {
          const { [uploadId]: _, ...rest } = prev
          return rest
        })
      }
    },
    [token, uploadDetails]
  )

  useEffect(() => {
    if (authLoading) return
    fetchUploads()
  }, [authLoading, fetchUploads])

  return useMemo(
    () => ({
      uploads,
      uploadDetails,
      isLoading,
      error,
      refresh: fetchUploads,
      fetchDetails,
      isFetchingDetails,
    }),
    [uploads, uploadDetails, isLoading, error, fetchUploads, fetchDetails, isFetchingDetails]
  )
}
