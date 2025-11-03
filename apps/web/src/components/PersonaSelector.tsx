'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Persona {
  id: string
  name: string
  description?: string
  isDefault: boolean
  tone: string[]
  cadence: string
  ctaStyle: string
}

interface PersonaSelectorProps {
  selectedPersona: string
  onPersonaChange: (personaId: string) => void
}

const fallbackPersonas: Persona[] = [
  {
    id: 'tech-thought-leader',
    name: 'Tech Thought Leader',
    description: 'Technical expert sharing data-driven insights and industry analysis',
    isDefault: true,
    tone: ['analytical', 'authoritative', 'insightful'],
    cadence: 'detailed',
    ctaStyle: 'direct',
  },
  {
    id: 'motivational-speaker',
    name: 'Motivational Speaker',
    description: 'Inspirational voice that uplifts and energizes audiences',
    isDefault: false,
    tone: ['energetic', 'positive', 'encouraging'],
    cadence: 'conversational',
    ctaStyle: 'soft',
  },
  {
    id: 'social-storyteller',
    name: 'Social Storyteller',
    description: 'Conversational tone that focuses on relatability and community engagement',
    isDefault: false,
    tone: ['warm', 'relatable', 'community-focused'],
    cadence: 'conversational',
    ctaStyle: 'question-based',
  },
]

export function PersonaSelector({ selectedPersona, onPersonaChange }: PersonaSelectorProps) {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [personas, setPersonas] = useState<Persona[]>(fallbackPersonas)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPersonaDetails, setSelectedPersonaDetails] = useState<Persona | null>(null)

  useEffect(() => {
    if (isAuthLoading) return

    const loadPersonas = async () => {
      setIsLoading(true)

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID || 'dev-user'
      const targetUserId = user?.id || demoUserId

      try {
        const url = new URL('/api/personas', apiBase)
        url.searchParams.set('userId', targetUserId)

        const response = await fetch(url.toString())
        if (!response.ok) {
          throw new Error(`Persona request failed with ${response.status}`)
        }

        const data: unknown = await response.json()
        if (!Array.isArray(data)) {
          throw new Error('Persona response was not an array')
        }

        setPersonas(data as Persona[])

        if (!selectedPersona && data.length > 0) {
          const defaultPersona = (data as Persona[]).find((p) => p.isDefault) || (data as Persona[])[0]
          onPersonaChange(defaultPersona.id)
        }
      } catch (error) {
        console.error('Failed to fetch personas, falling back to demo personas:', error)
        setPersonas(fallbackPersonas)
        if (!selectedPersona) {
          onPersonaChange(fallbackPersonas[0].id)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadPersonas()
  }, [isAuthLoading, onPersonaChange, selectedPersona, user?.id])

  useEffect(() => {
    if (selectedPersona && personas.length > 0) {
      const persona = personas.find((p) => p.id === selectedPersona)
      setSelectedPersonaDetails(persona || null)
    }
  }, [selectedPersona, personas])

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Persona (Voice)</label>
        <select
          value={selectedPersona}
          onChange={(e) => onPersonaChange(e.target.value)}
          className="input"
        >
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name} {persona.isDefault && '(Default)'}
            </option>
          ))}
        </select>
      </div>

      {selectedPersonaDetails && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <div className="space-y-2">
            <div>
              <span className="font-medium text-gray-700">Tone:</span>
              <span className="ml-2 text-gray-600">{selectedPersonaDetails.tone.join(', ')}</span>
            </div>

            <div>
              <span className="font-medium text-gray-700">Cadence:</span>
              <span className="ml-2 text-gray-600 capitalize">{selectedPersonaDetails.cadence}</span>
            </div>

            <div>
              <span className="font-medium text-gray-700">CTA Style:</span>
              <span className="ml-2 text-gray-600 capitalize">
                {selectedPersonaDetails.ctaStyle.replace('-', ' ')}
              </span>
            </div>

            {selectedPersonaDetails.description && (
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <span className="ml-2 text-gray-600">{selectedPersonaDetails.description}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
