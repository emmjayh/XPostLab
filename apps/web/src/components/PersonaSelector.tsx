'use client'

import { useEffect, useState } from 'react'
import { usePersonas } from '@/hooks/usePersonas'
import { Persona } from '@/types/persona'

interface PersonaSelectorProps {
  selectedPersona: string
  onPersonaChange: (personaId: string) => void
}

export function PersonaSelector({ selectedPersona, onPersonaChange }: PersonaSelectorProps) {
  const { personas, isLoading, defaultPersonaId } = usePersonas()
  const [selectedPersonaDetails, setSelectedPersonaDetails] = useState<Persona | null>(null)

  useEffect(() => {
    if (!selectedPersona && defaultPersonaId) {
      onPersonaChange(defaultPersonaId)
    }
  }, [defaultPersonaId, onPersonaChange, selectedPersona])

  useEffect(() => {
    if (selectedPersona) {
      const persona = personas.find((p) => p.id === selectedPersona)
      setSelectedPersonaDetails(persona || null)
    }
  }, [personas, selectedPersona])

  if (isLoading && personas.length === 0) {
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
