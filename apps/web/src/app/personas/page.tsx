'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { usePersonas } from '@/hooks/usePersonas'
import { Persona, PersonaCadence, PersonaCTAStyle } from '@/types/persona'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const cadenceOptions: PersonaCadence[] = ['concise', 'detailed', 'conversational']
const ctaOptions: PersonaCTAStyle[] = ['direct', 'soft', 'question-based']

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
  const { personas, isLoading, error, setPersonas, defaultPersonaId, userId } = usePersonas()

  const [activePersonaId, setActivePersonaId] = useState<string | null>(null)
  const [formState, setFormState] = useState<PersonaFormState>(initialFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!activePersonaId && personas.length > 0) {
      setActivePersonaId(personas.find((persona) => persona.isDefault)?.id ?? personas[0].id)
    }
  }, [activePersonaId, personas])

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

      const response = await fetch(`${API_BASE}/api/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
              Keep persona tone lists to 3-5 descriptors. Align cadence with the platform you post on the most, and capture “don’ts”
              so the model knows what to avoid.
            </p>
          </div>
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

          {isLoading ? (
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
