'use client'

import { useEffect, useMemo, useState } from 'react'
import { ContentVariants } from './ContentVariants'
import { usePersonas } from '@/hooks/usePersonas'
import { ContentVariant, GenerationResult } from '@/types/composer'

type ReplyLength = 'short' | 'medium' | 'long'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ReplyStudioResult extends GenerationResult {
  variants?: ContentVariant[]
}

export function ReplyStudio() {
  const { personas, isLoading: personasLoading, defaultPersonaId } = usePersonas()
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('')
  const [replyLength, setReplyLength] = useState<ReplyLength>('short')
  const [replyCount, setReplyCount] = useState(3)
  const [conversationContext, setConversationContext] = useState('')
  const [goal, setGoal] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [includeHashtags, setIncludeHashtags] = useState(false)
  const [result, setResult] = useState<ReplyStudioResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedPersonaId && defaultPersonaId) {
      setSelectedPersonaId(defaultPersonaId)
    }
  }, [defaultPersonaId, selectedPersonaId])

  const selectedPersona = useMemo(
    () => personas.find((persona) => persona.id === selectedPersonaId) ?? null,
    [personas, selectedPersonaId]
  )

  const characterLimit = useMemo(() => {
    switch (replyLength) {
      case 'short':
        return 180
      case 'medium':
        return 280
      case 'long':
        return 420
      default:
        return 280
    }
  }, [replyLength])

  const handleGenerate = async () => {
    if (!conversationContext.trim() || !selectedPersonaId) {
      setError('Add conversation context and choose a persona to generate replies.')
      return
    }

    setIsGenerating(true)
    setResult(null)
    setError(null)

    try {
      const personaSummary = selectedPersona
        ? `${selectedPersona.name} persona with tone ${selectedPersona.tone.join(', ')}`
        : 'the selected persona'

      const prompt = [
        `You are ${personaSummary}. Craft ${replyCount} authentic replies to the conversation below.`,
        'Each reply should feel human, on-brand, and aligned with the persona cadence and CTA style.',
        goal ? `Primary goal: ${goal}.` : null,
        `Keep replies ${replyLength} in length and respect platform limits.`,
        includeHashtags ? 'Add one subtle hashtag when it feels natural.' : 'Do not force hashtags.',
        '',
        'Conversation:',
        conversationContext.trim(),
      ]
        .filter(Boolean)
        .join('\n')

      const response = await fetch(`${API_BASE}/api/composer/compose`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: prompt,
          personaId: selectedPersonaId,
          platform: 'twitter',
          options: {
            variants: replyCount,
            maxLength: characterLimit,
            includeHashtags,
          },
        }),
      })

      const data: ReplyStudioResult = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Reply generation failed')
      }

      const normalized: ReplyStudioResult =
        typeof data?.success === 'boolean' ? data : { ...data, success: true }

      setResult(normalized)
    } catch (err) {
      console.error('Reply Studio generation failed', err)
      setError(err instanceof Error ? err.message : 'Unable to generate replies. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Reply Studio</h2>
        <p className="text-sm text-gray-600">
          Transform any post or thread into authentic, on-brand replies that keep the conversation moving.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <div className="card space-y-6">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Conversation context</label>
              <textarea
                value={conversationContext}
                onChange={(event) => setConversationContext(event.target.value)}
                rows={6}
                className="textarea h-36"
                placeholder={`Paste the post you want to respond to...

Example:
Creator: "We launched our beta and 4,000 people joined in 48 hours."
Your reply should add value, extend the conversation, or open a loop.`}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Persona</label>
              <select
                value={selectedPersonaId}
                onChange={(event) => setSelectedPersonaId(event.target.value)}
                className="input"
                disabled={personasLoading}
              >
                <option value="" disabled>
                  {personasLoading ? 'Loading personas...' : 'Select a persona'}
                </option>
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} {persona.isDefault ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Reply length</label>
                <select
                  value={replyLength}
                  onChange={(event) => setReplyLength(event.target.value as ReplyLength)}
                  className="input"
                >
                  <option value="short">Short (under 180 characters)</option>
                  <option value="medium">Medium (under 280 characters)</option>
                  <option value="long">Long (under 420 characters)</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Variants</label>
                <select
                  value={replyCount}
                  onChange={(event) => setReplyCount(Number(event.target.value))}
                  className="input"
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Optional goal</label>
              <input
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                className="input"
                placeholder="E.g. encourage a DM, highlight social proof, invite collaboration"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <div className="flex flex-col">
                <span className="font-medium text-gray-700">Character target</span>
                <span>
                  Up to <strong>{characterLimit}</strong> characters · Platform focus: X/Twitter style replies
                </span>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeHashtags}
                  onChange={(event) => setIncludeHashtags(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Allow hashtags</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div className="flex items-center justify-end gap-3 border-t pt-4">
            <button
              type="button"
              className="btn-secondary"
              disabled={isGenerating}
              onClick={() => {
                setConversationContext('')
                setGoal('')
                setResult(null)
                setError(null)
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isGenerating || !conversationContext.trim()}
              onClick={handleGenerate}
            >
              {isGenerating ? 'Generating replies...' : `Generate ${replyCount} replies`}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Persona insight</h3>
            {selectedPersona ? (
              <div className="space-y-3 text-sm text-gray-600">
                <p>{selectedPersona.description}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPersona.tone.map((tone) => (
                    <span key={tone} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
                      {tone}
                    </span>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-700">
                  CTA style: <strong className="capitalize">{selectedPersona.ctaStyle.replace('-', ' ')}</strong> · Cadence:{' '}
                  <strong className="capitalize">{selectedPersona.cadence}</strong>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Choose a persona to view tone and cadence guidance.</p>
            )}
          </div>

          <div className="card space-y-3">
            <h3 className="text-lg font-semibold text-gray-900">Reply playbook</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Start by acknowledging the original post before adding your perspective.</li>
              <li>• Make one strong point per reply to keep things scannable.</li>
              <li>• Close with a loop, question, or soft CTA to encourage further engagement.</li>
            </ul>
          </div>
        </div>
      </div>

      {result && <ContentVariants result={result} platform="twitter" />}
    </div>
  )
}
