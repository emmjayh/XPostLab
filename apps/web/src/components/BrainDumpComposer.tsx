'use client'

import { useState } from 'react'
import { PersonaSelector } from './PersonaSelector'
import { ContentVariants } from './ContentVariants'

interface ContentVariant {
  id: string
  content: string
  hook?: string
  body: string
  cta?: string
  hashtags: string[]
  metadata: {
    length: number
    sentiment?: string
    hookType?: string
    wasTruncated?: boolean
    originalLength?: number
    overLimit?: number
    originalContent?: string
  }
}

interface GenerationResult {
  success: boolean
  jobId?: string
  variants?: ContentVariant[]
  error?: string
}

export function BrainDumpComposer() {
  const [input, setInput] = useState('')
  const [selectedPersona, setSelectedPersona] = useState('demo-persona-1')
  const [selectedPlatform, setSelectedPlatform] = useState<'twitter' | 'linkedin' | 'instagram'>('twitter')
  const [variants, setVariants] = useState(3)
  const [includeHashtags, setIncludeHashtags] = useState(false)
  const [characterLimit, setCharacterLimit] = useState(280)
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<GenerationResult | null>(null)

  const handleGenerate = async () => {
    if (!input.trim()) return

    setIsGenerating(true)
    setResult(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/composer/brain-dump`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          personaId: selectedPersona,
          platform: selectedPlatform,
          options: {
            variants,
            includeHashtags,
            maxLength: characterLimit
          }
        })
      })

      const data = await response.json()
      setResult(data)

    } catch (error) {
      console.error('Generation failed:', error)
      setResult({
        success: false,
        error: 'Failed to generate content. Please try again.'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClear = () => {
    setInput('')
    setResult(null)
  }

  const handleRework = async (originalContent: string, charLimit: number) => {
    setIsGenerating(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/composer/brain-dump`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: `Make this content SHORTER to fit under ${charLimit} characters:\n\n${originalContent}`,
          personaId: selectedPersona,
          platform: selectedPlatform,
          options: {
            variants: 1,
            includeHashtags,
            maxLength: charLimit - 20 // Give it extra room
          }
        })
      })

      const data = await response.json()

      // Replace the result with the reworked version
      if (data.success && data.variants && data.variants.length > 0) {
        setResult(data)
      }

    } catch (error) {
      console.error('Rework failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Brain Dump Composer</h2>
        
        <div className="space-y-6">
          {/* Input Section */}
          <div>
            <label htmlFor="brain-dump" className="block text-sm font-medium text-gray-700 mb-2">
              Your ideas, thoughts, or notes
            </label>
            <textarea
              id="brain-dump"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Drop your thoughts here... 

Examples:
• Just had an amazing insight about productivity and time management from my morning routine
• The biggest mistake I see creators making with their content strategy
• Why I think remote work is changing faster than people realize"
              className="textarea h-32"
              rows={6}
            />
            <p className="text-sm text-gray-500 mt-1">
              {input.length} characters
            </p>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <PersonaSelector 
                selectedPersona={selectedPersona}
                onPersonaChange={setSelectedPersona}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => {
                    const platform = e.target.value as typeof selectedPlatform
                    setSelectedPlatform(platform)
                    // Auto-update character limit based on platform
                    const defaults = { twitter: 280, linkedin: 3000, instagram: 2200 }
                    setCharacterLimit(defaults[platform])
                  }}
                  className="input"
                >
                  <option value="twitter">Twitter</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="instagram">Instagram</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variants: {variants}
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={variants}
                  onChange={(e) => setVariants(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="char-limit" className="block text-sm font-medium text-gray-700 mb-2">
                  Character Limit
                </label>
                <input
                  type="number"
                  id="char-limit"
                  min="100"
                  max="5000"
                  value={characterLimit}
                  onChange={(e) => setCharacterLimit(parseInt(e.target.value))}
                  className="input w-full"
                  placeholder="280"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: Twitter (280), LinkedIn (3000), Instagram (2200)
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="include-hashtags"
                  checked={includeHashtags}
                  onChange={(e) => setIncludeHashtags(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="include-hashtags" className="ml-2 block text-sm text-gray-700">
                  Include hashtags
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              onClick={handleClear}
              className="btn-secondary"
              disabled={isGenerating}
            >
              Clear
            </button>
            
            <button
              onClick={handleGenerate}
              disabled={!input.trim() || isGenerating}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating...</span>
                </span>
              ) : (
                `Generate ${variants} Variants`
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <ContentVariants
          result={result}
          platform={selectedPlatform}
          onRework={handleRework}
        />
      )}
    </div>
  )
}