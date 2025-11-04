'use client'

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuth } from '@/contexts/AuthContext'
import { usePersonas } from '@/hooks/usePersonas'
import { useUploads } from '@/hooks/useUploads'
import { Persona, PersonaCadence, PersonaCTAStyle, PersonaPlatformConfig } from '@/types/persona'
import { PersonaSuggestion } from '@/types/uploads'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const cadenceOptions: PersonaCadence[] = ['concise', 'detailed', 'conversational']
const ctaOptions: PersonaCTAStyle[] = ['direct', 'soft', 'question-based']

const uploadStatusStyles: Record<string, string> = {
  ANALYZED: 'border-green-200 bg-green-50 text-green-700',
  PROCESSING: 'border-amber-200 bg-amber-50 text-amber-700',
  FAILED: 'border-red-200 bg-red-50 text-red-700',
}

function formatUploadDate(value: string) {
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  } catch {
    return value
  }
}

interface PersonaFormState {
  name: string
  description: string
  tone: string
  cadence: PersonaCadence
  donts: string
  hookPatterns: string
  ctaStyle: PersonaCTAStyle
}

const initialFormState: PersonaFormState = {
  name: '',
  description: '',
  tone: 'analytical, data-backed',
  cadence: 'detailed',
  donts: 'avoid fluff, no vague claims',
  hookPatterns: 'Data reveals..., After testing..., Unpopular opinion:',
  ctaStyle: 'direct',
}

export default function PersonasPage() {
  const { user, isLoading: authLoading } = useRequireAuth()
  const { token } = useAuth()
  const { personas, isLoading: personasLoading, error, setPersonas, defaultPersonaId, userId } = usePersonas()
  const {
    uploads,
    uploadDetails,
    isLoading: uploadsLoading,
    error: uploadsError,
    fetchDetails: loadUploadDetails,
    refresh: refreshUploads,
    isFetchingDetails,
  } = useUploads()

  const [activePersonaId, setActivePersonaId] = useState<string | null>(null)
  const [formState, setFormState] = useState<PersonaFormState>(initialFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expandedUploadId, setExpandedUploadId] = useState<string | null>(null)
  const [suggestionMessage, setSuggestionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [creatingSuggestionKey, setCreatingSuggestionKey] = useState<string | null>(null)
  const [createdSuggestionMap, setCreatedSuggestionMap] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPlatform, setUploadPlatform] = useState<string>('twitter')
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragActive, setIsDragActive] = useState(false)

  useEffect(() => {
    if (!activePersonaId && personas.length > 0) {
      setActivePersonaId(personas.find((persona) => persona.isDefault)?.id ?? personas[0].id)
    }
  }, [activePersonaId, personas])

  useEffect(() => {
    if (!expandedUploadId) {
      setSuggestionMessage(null)
      setCreatingSuggestionKey(null)
    }
  }, [expandedUploadId])

  const activePersona = useMemo(
    () => personas.find((persona) => persona.id === activePersonaId) ?? null,
    [activePersonaId, personas]
  )

  const handleCardClick = (personaId: string) => {
    setActivePersonaId(personaId)
  }

  const handleFormChange = (field: keyof PersonaFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const processSelectedFile = (file: File) => {
    const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setUploadFile(null)
      setUploadMessage({
        type: 'error',
        text: 'Please upload a CSV file exported from X or LinkedIn.',
      })
      return
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      setUploadFile(null)
      setUploadMessage({
        type: 'error',
        text: 'That file is larger than 10MB. Trim it down and try again.',
      })
      return
    }

    setUploadFile(file)
    setUploadMessage(null)
  }

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragActive(false)

    const file = event.dataTransfer.files?.[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragActive(true)
  }

  const handleDragLeave = () => {
    setIsDragActive(false)
  }

  const handleRemoveUploadFile = () => {
    setUploadFile(null)
    setUploadMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadPlatformChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setUploadPlatform(event.target.value)
  }

  const handleUploadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!token) {
      setUploadMessage({
        type: 'error',
        text: 'Sign in to upload your posts for analysis.',
      })
      return
    }

    if (!uploadFile) {
      setUploadMessage({
        type: 'error',
        text: 'Choose a CSV file before uploading.',
      })
      return
    }

    try {
      setIsUploading(true)
      setUploadMessage(null)

      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('platform', uploadPlatform)

      const response = await fetch(`${API_BASE}/api/uploads/csv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await response.json()

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to upload CSV right now.')
      }

      setUploadMessage({
        type: 'success',
        text: 'Upload received. We will analyze it and refresh the suggestions shortly.',
      })
      setUploadFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      await refreshUploads()
    } catch (err) {
      console.error('Upload failed', err)
      setUploadMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Upload failed. Please try again.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const getSuggestionKey = (uploadId: string, suggestionId: string) => `${uploadId}:${suggestionId}`

  const handleToggleUpload = (uploadId: string) => {
    if (expandedUploadId === uploadId) {
      setExpandedUploadId(null)
      setSuggestionMessage(null)
      setCreatingSuggestionKey(null)
      return
    }

    setExpandedUploadId(uploadId)
    setSuggestionMessage(null)

    loadUploadDetails(uploadId).then((details) => {
      if (!details) {
        setSuggestionMessage({
          type: 'error',
          text: 'Unable to load analysis for this upload. Please try again.',
        })
      }
    })
  }

  const handleCreateSuggestion = async (uploadId: string, suggestion: PersonaSuggestion) => {
    if (!token || !userId) {
      setSuggestionMessage({
        type: 'error',
        text: 'You need to be logged in to add personas from suggestions.',
      })
      return
    }

    const suggestionKey = getSuggestionKey(uploadId, suggestion.id)
    setSuggestionMessage(null)
    setCreatingSuggestionKey(suggestionKey)

    const parseJSON = <T,>(value: unknown, fallback: T): T => {
      if (value == null) return fallback
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T
        } catch {
          return fallback
        }
      }
      return value as T
    }

    try {
      const response = await fetch(`${API_BASE}/api/uploads/${uploadId}/create-persona`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          name: suggestion.name,
          description: suggestion.description,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data?.success || !data?.persona) {
        throw new Error(data?.error || 'Unable to create persona from this suggestion.')
      }

      const personaPayload = data.persona as Record<string, unknown>

      const createdPersona: Persona = {
        id: String(personaPayload.id),
        userId: typeof personaPayload.userId === 'string' ? personaPayload.userId : undefined,
        name: String(personaPayload.name),
        description: typeof personaPayload.description === 'string' ? personaPayload.description : undefined,
        isDefault: Boolean(personaPayload.isDefault),
        tone: parseJSON<string[]>(personaPayload.tone, []),
        cadence: String(personaPayload.cadence),
        donts: parseJSON<string[]>(personaPayload.donts, []),
        hookPatterns: parseJSON<string[]>(personaPayload.hookPatterns, []),
        ctaStyle: String(personaPayload.ctaStyle),
        platforms: parseJSON<Record<string, PersonaPlatformConfig>>(personaPayload.platforms, {}),
        createdAt: typeof personaPayload.createdAt === 'string' ? personaPayload.createdAt : undefined,
        updatedAt: typeof personaPayload.updatedAt === 'string' ? personaPayload.updatedAt : undefined,
      }

      setPersonas((prev) => [createdPersona, ...prev])
      setActivePersonaId(createdPersona.id)
      setCreatedSuggestionMap((prev) => ({ ...prev, [suggestionKey]: true }))
      setSuggestionMessage({
        type: 'success',
        text: `Added ${createdPersona.name} to your persona library.`,
      })

      await refreshUploads()
    } catch (err) {
      console.error('Failed to create persona from suggestion', err)
      setSuggestionMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to create persona from this suggestion.',
      })
    } finally {
      setCreatingSuggestionKey(null)
    }
  }

  const handlePersonaCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!userId) {
      setFormMessage({ type: 'error', text: 'You need to be logged in to create personas.' })
      return
    }

    setIsSaving(true)
    setFormMessage(null)

    try {
      const payload = {
        userId,
        name: formState.name.trim(),
        description: formState.description.trim(),
        tone: formState.tone.split(',').map((item) => item.trim()).filter(Boolean),
        cadence: formState.cadence,
        donts: formState.donts.split(',').map((item) => item.trim()).filter(Boolean),
        hookPatterns: formState.hookPatterns.split(',').map((item) => item.trim()).filter(Boolean),
        ctaStyle: formState.ctaStyle,
      }

      if (!payload.name) {
        setFormMessage({ type: 'error', text: 'Give your persona a name before saving.' })
        setIsSaving(false)
        return
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE}/api/personas`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to create persona')
      }

      const newPersona: Persona = {
        id: data.id,
        userId,
        name: data.name,
        description: data.description,
        isDefault: false,
        tone: data.tone,
        cadence: data.cadence,
        donts: data.donts,
        hookPatterns: data.hookPatterns,
        ctaStyle: data.ctaStyle,
        platforms: data.platforms,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }

      setPersonas((prev) => [newPersona, ...prev])
      setActivePersonaId(newPersona.id)
      setFormState(initialFormState)
      setFormMessage({ type: 'success', text: 'Persona drafted successfully.' })
    } catch (err) {
      console.error('Failed to create persona', err)
      setFormMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to create persona. Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || !user) {
    return (
      <div className="py-24 text-center text-sm text-gray-500">
        Preparing your persona workspace...
      </div>
    )
  }

  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <span className="inline-flex items-center rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          Persona Engine
        </span>
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr] lg:items-start">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold text-gray-900">Teach X Post Lab how you sound.</h1>
            <p className="text-lg text-gray-600">
              Personas store your tone, cadence, and CTA style so every generated thread, hook, and reply matches your voice.
              Start with the defaults or draft new ones for product launches, campaigns, and cross-channel experiments.
            </p>
          </div>
          <div className="card space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Tip</h2>
            <p className="text-sm text-gray-600">
              Keep persona tone lists to 3-5 descriptors. Align cadence with the platform you post on the most, and capture &quot;don&apos;ts&quot; so the model knows what to avoid.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">Upload history & AI suggestions</h2>
            <p className="text-sm text-gray-600">
              Analyze past posts to generate personas grounded in your real voice and performance.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshUploads}
            className="btn-secondary w-full justify-center px-4 py-2 text-sm lg:w-auto"
            disabled={uploadsLoading}
          >
            {uploadsLoading ? 'Refreshing...' : 'Refresh uploads'}
          </button>
        </div>

        <form className="card space-y-5" onSubmit={handleUploadSubmit}>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">Upload a CSV of your posts</h3>
            <p className="text-sm text-gray-600">
              Drag in exports from X or LinkedIn and we will surface tone analysis with ready-to-save persona suggestions.
            </p>
          </div>

          <label
            htmlFor="upload-csv"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
              isDragActive
                ? 'border-indigo-300 bg-indigo-50'
                : 'border-gray-200 bg-gray-50 hover:border-indigo-200 hover:bg-white'
            }`}
          >
            <input
              id="upload-csv"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={isUploading}
            />
            {uploadFile ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">{uploadFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(uploadFile.size / 1024).toFixed(1)} KB • Ready to upload
                </p>
                <button
                  type="button"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleRemoveUploadFile()
                  }}
                  disabled={isUploading}
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="h-6 w-6"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 12-3-3m3 3 3-3m-9 7h12" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-gray-900">Drop CSV here or click to browse</p>
                <p className="text-xs text-gray-500">We accept exports up to 10MB from X or LinkedIn.</p>
              </div>
            )}
          </label>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),auto] lg:items-end">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500" htmlFor="upload-platform">
                Platform
              </label>
              <select
                id="upload-platform"
                value={uploadPlatform}
                onChange={handleUploadPlatformChange}
                className="input"
                disabled={isUploading}
              >
                <option value="twitter">X (Twitter)</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
              <span className="text-xs text-gray-500">CSV limit 10MB • We keep only the text content.</span>
              <button
                type="submit"
                className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isUploading || !uploadFile}
              >
                {isUploading ? 'Uploading...' : 'Upload CSV'}
              </button>
            </div>
          </div>

          {uploadMessage && (
            <div
              className={`rounded-lg border px-4 py-2 text-sm ${
                uploadMessage.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {uploadMessage.text}
            </div>
          )}
        </form>

        {uploadsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {uploadsError}
          </div>
        )}

        <div className="space-y-4">
          {uploadsLoading && uploads.length === 0 ? (
            [...Array(2)].map((_, index) => (
              <div key={index} className="card space-y-3">
                <div className="h-5 w-44 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
              </div>
            ))
          ) : uploads.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No uploads analyzed yet. Drop a CSV of your posts on the Uploads tool to unlock AI persona suggestions.
            </div>
          ) : (
            uploads.map((upload) => {
              const details = uploadDetails[upload.id]
              const statusClass =
                uploadStatusStyles[upload.status as keyof typeof uploadStatusStyles] ??
                'border-gray-200 bg-gray-100 text-gray-600'
              const isExpanded = expandedUploadId === upload.id
              const suggestionCount = details?.analysis?.personaSuggestions?.length ?? 0

              return (
                <div key={upload.id} className="card space-y-4">
                  <button type="button" onClick={() => handleToggleUpload(upload.id)} className="w-full text-left">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-gray-900">
                          {upload.originalName || upload.filename}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className="capitalize">{upload.platform}</span>
                          <span>• {formatUploadDate(upload.createdAt)}</span>
                          <span>• {upload.totalPosts} posts</span>
                          {upload.status === 'ANALYZED' && suggestionCount > 0 && (
                            <span>• {suggestionCount} suggestion{suggestionCount === 1 ? '' : 's'}</span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass}`}
                      >
                        {upload.status.toLowerCase()}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-600">
                      {upload.status === 'ANALYZED'
                        ? 'Tap to review AI persona suggestions and top-performing posts.'
                        : upload.status === 'PROCESSING'
                        ? 'We are still processing this upload. Refresh in a bit to see suggestions.'
                        : upload.error
                        ? upload.error
                        : 'This upload failed to analyze. Try uploading a fresh CSV.'}
                    </p>
                  </button>

                  {isExpanded && (
                    <div className="space-y-5 border-t border-gray-200 pt-4">
                      {suggestionMessage && (
                        <div
                          className={`rounded-lg border px-4 py-2 text-sm ${
                            suggestionMessage.type === 'success'
                              ? 'border-green-200 bg-green-50 text-green-700'
                              : 'border-red-200 bg-red-50 text-red-700'
                          }`}
                        >
                          {suggestionMessage.text}
                        </div>
                      )}

                      {isFetchingDetails[upload.id] ? (
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-indigo-400" />
                          Loading analysis...
                        </div>
                      ) : upload.status !== 'ANALYZED' ? (
                        <p className="text-sm text-gray-500">
                          {upload.status === 'PROCESSING'
                            ? 'We are still crunching the numbers. Check back shortly for persona suggestions.'
                            : 'This upload did not complete successfully, so suggestions are unavailable.'}
                        </p>
                      ) : !details ? (
                        <p className="text-sm text-gray-500">
                          We could not load the analysis for this upload. Try refreshing the uploads list.
                        </p>
                      ) : (
                        <>
                          {details.analysis && (
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Average length</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">
                                  {details.analysis.avgLength
                                    ? `${Math.round(details.analysis.avgLength)} characters`
                                    : '—'}
                                </p>
                              </div>
                              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sentiment score</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900">
                                  {details.analysis.sentimentScore != null
                                    ? details.analysis.sentimentScore.toFixed(2)
                                    : '—'}
                                </p>
                              </div>
                              <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Cadence</p>
                                <p className="mt-1 text-sm font-semibold capitalize text-gray-900">
                                  {details.analysis.cadence || 'Not detected'}
                                </p>
                              </div>
                            </div>
                          )}

                          {details.analysis?.toneKeywords?.length ? (
                            <div className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Tone keywords
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {details.analysis.toneKeywords.map((keyword) => (
                                  <span
                                    key={keyword}
                                    className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-gray-900">Persona suggestions</h4>
                              {suggestionCount > 0 && (
                                <span className="text-xs text-gray-400">
                                  {suggestionCount} option{suggestionCount === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                            {details.analysis?.personaSuggestions?.length ? (
                              details.analysis.personaSuggestions.map((suggestion) => {
                                const suggestionKey = getSuggestionKey(upload.id, suggestion.id)
                                const isCreating = creatingSuggestionKey === suggestionKey
                                const hasCreated = createdSuggestionMap[suggestionKey]
                                const matchScore =
                                  suggestion.matchScore != null
                                    ? Math.round(suggestion.matchScore * 100)
                                    : null
                                return (
                                  <div key={suggestion.id} className="rounded-lg border border-gray-200 px-4 py-4 shadow-sm">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                      <div className="space-y-2">
                                        <p className="text-base font-semibold text-gray-900">{suggestion.name}</p>
                                        <p className="text-sm text-gray-600">{suggestion.description}</p>
                                        <div className="flex flex-wrap gap-2">
                                          {suggestion.tone.map((tone) => (
                                            <span
                                              key={tone}
                                              className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600"
                                            >
                                              {tone}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                      {matchScore != null && (
                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                                          {matchScore}% match
                                        </span>
                                      )}
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                                      <span className="capitalize">Cadence: {suggestion.cadence}</span>
                                      <span>CTA: {suggestion.ctaStyle}</span>
                                      {suggestion.hookPatterns?.length ? (
                                        <span>Hooks: {suggestion.hookPatterns.slice(0, 2).join(', ')}</span>
                                      ) : null}
                                    </div>
                                    {suggestion.samplePosts?.length ? (
                                      <div className="mt-3 space-y-2">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                          Example posts
                                        </span>
                                        <div className="space-y-2">
                                          {suggestion.samplePosts.slice(0, 2).map((sample, index) => (
                                            <blockquote
                                              key={`${suggestion.id}-sample-${index}`}
                                              className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600"
                                            >
                                              {sample}
                                            </blockquote>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                      <button
                                        type="button"
                                        onClick={() => handleCreateSuggestion(upload.id, suggestion)}
                                        className="btn-primary text-sm"
                                        disabled={isCreating || hasCreated}
                                      >
                                        {hasCreated ? 'Added to library' : isCreating ? 'Adding...' : 'Add to personas'}
                                      </button>
                                      {hasCreated && (
                                        <span className="text-sm font-medium text-emerald-600">
                                          Ready in your persona library.
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })
                            ) : (
                              <p className="text-sm text-gray-500">
                                We did not find enough signal to recommend personas yet. Try uploading a different set of
                                posts.
                              </p>
                            )}
                          </div>

                          {details.analyzedPosts?.length ? (
                            <div className="space-y-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                Top performing posts
                              </span>
                              <div className="grid gap-3 md:grid-cols-2">
                                {details.analyzedPosts.slice(0, 4).map((post) => (
                                  <div key={post.id} className="rounded-lg border border-gray-100 bg-white px-4 py-3">
                                    <p className="line-clamp-4 text-sm text-gray-600">{post.content}</p>
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                      {typeof post.engagementScore === 'number' && (
                                        <span>Score: {post.engagementScore.toFixed(1)}</span>
                                      )}
                                      {post.originalDate && <span>{formatUploadDate(post.originalDate)}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Persona library</h2>
            {defaultPersonaId && (
              <span className="text-xs uppercase tracking-wide text-gray-400">Default: {defaultPersonaId}</span>
            )}
          </div>

          {personasLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : personas.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
              No personas yet. Draft one using the form on the right.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {personas.map((persona) => {
                const isActive = persona.id === activePersonaId
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => handleCardClick(persona.id)}
                    className={`rounded-xl border px-4 py-4 text-left transition ${
                      isActive ? 'border-indigo-300 bg-indigo-50 shadow-sm' : 'border-gray-200 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-base font-semibold text-gray-900">{persona.name}</p>
                      {persona.isDefault && (
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-indigo-600">Default</span>
                      )}
                    </div>
                    {persona.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">{persona.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {persona.tone.slice(0, 3).map((tone) => (
                        <span key={tone} className="rounded-full bg-white/60 px-2 py-1 text-xs font-medium text-gray-500">
                          {tone}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Persona details</h3>
            {activePersona ? (
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="mt-1 leading-6">{activePersona.description || 'No description provided yet.'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tone:</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activePersona.tone.map((tone) => (
                      <span key={tone} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
                        {tone}
                      </span>
                    ))}
                  </div>
                </div>
                {activePersona.donts && activePersona.donts.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Avoid:</span>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                      {activePersona.donts.map((item, index) => (
                        <li key={`${activePersona.id}-dont-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {activePersona.hookPatterns && activePersona.hookPatterns.length > 0 && (
                  <div>
                    <span className="font-medium text-gray-700">Hook patterns:</span>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {activePersona.hookPatterns.map((hook) => (
                        <span key={hook} className="rounded-lg bg-gray-100 px-2 py-1">
                          {hook}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
                  <div>
                    <span className="font-medium text-gray-700">Cadence:</span>{' '}
                    <span className="capitalize">{activePersona.cadence}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">CTA style:</span>{' '}
                    <span className="capitalize">{activePersona.ctaStyle.replace('-', ' ')}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a persona on the left to view details.</p>
            )}
          </div>

          <div className="card space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Draft a new persona</h3>
            <p className="text-sm text-gray-600">
              Capture a new voice for upcoming launches, community initiatives, or cross-channel experiments.
            </p>

            <form className="space-y-4" onSubmit={handlePersonaCreate}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="persona-name">
                  Persona name
                </label>
                <input
                  id="persona-name"
                  value={formState.name}
                  onChange={(event) => handleFormChange('name', event.target.value)}
                  className="input"
                  placeholder="e.g. Product Launch Strategist"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="persona-description">
                  Description
                </label>
                <textarea
                  id="persona-description"
                  value={formState.description}
                  onChange={(event) => handleFormChange('description', event.target.value)}
                  className="textarea h-24"
                  placeholder="How should this persona show up?"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="persona-tone">
                  Tone descriptors (comma separated)
                </label>
                <input
                  id="persona-tone"
                  value={formState.tone}
                  onChange={(event) => handleFormChange('tone', event.target.value)}
                  className="input"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="persona-cadence">
                    Cadence
                  </label>
                  <select
                    id="persona-cadence"
                    value={formState.cadence}
                    onChange={(event) => handleFormChange('cadence', event.target.value)}
                    className="input"
                  >
                    {cadenceOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700" htmlFor="persona-cta">
                    CTA style
                  </label>
                  <select
                    id="persona-cta"
                    value={formState.ctaStyle}
                    onChange={(event) => handleFormChange('ctaStyle', event.target.value)}
                    className="input"
                  >
                    {ctaOptions.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="persona-donts">
                  Off-limits phrases or angles (comma separated)
                </label>
                <input
                  id="persona-donts"
                  value={formState.donts}
                  onChange={(event) => handleFormChange('donts', event.target.value)}
                  className="input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700" htmlFor="persona-hooks">
                  Hook patterns (comma separated)
                </label>
                <input
                  id="persona-hooks"
                  value={formState.hookPatterns}
                  onChange={(event) => handleFormChange('hookPatterns', event.target.value)}
                  className="input"
                />
              </div>

              {formMessage && (
                <div
                  className={`rounded-lg border px-4 py-2 text-sm ${
                    formMessage.type === 'success'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {formMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save persona draft'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}


