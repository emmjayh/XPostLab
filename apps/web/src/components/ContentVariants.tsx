'use client'

import { useState } from 'react'
import { ContentVariant, GenerationResult } from '@/types/composer'

interface ContentVariantsProps {
  result: GenerationResult
  platform: string
  onRework?: (variantId: string, originalContent: string, charLimit: number) => void
}

const platformInfo: Record<
  string,
  {
    label: string
    characterLimit: number
  }
> = {
  twitter: { label: 'X / Twitter', characterLimit: 280 },
  linkedin: { label: 'LinkedIn', characterLimit: 3000 },
  instagram: { label: 'Instagram', characterLimit: 2200 },
}

const hookBadgeColors: Record<string, string> = {
  question: 'bg-blue-100 text-blue-800',
  story: 'bg-green-100 text-green-800',
  contrarian: 'bg-red-100 text-red-800',
  insight: 'bg-purple-100 text-purple-800',
}

export function ContentVariants({ result, platform, onRework }: ContentVariantsProps) {
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null)
  const [reworking, setReworking] = useState<string | null>(null)

  const copyToClipboard = async (text: string, variantId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedVariant(variantId)
      setTimeout(() => setCopiedVariant(null), 2000)
    } catch (error) {
      console.error('Failed to copy variant to clipboard:', error)
    }
  }

  const handleRework = async (variant: ContentVariant) => {
    if (!variant.metadata.originalContent || !onRework) return

    const limit = platformInfo[platform]?.characterLimit ?? 280
    setReworking(variant.id)
    onRework(variant.id, variant.metadata.originalContent, limit)
    setTimeout(() => setReworking(null), 2500)
  }

  if (!result.success) {
    return (
      <div className="card border-red-100 bg-red-50/70 text-center">
        <h3 className="text-lg font-semibold text-red-700">Generation failed</h3>
        <p className="mt-3 text-sm text-red-600">
          {result.error || 'We could not generate content. Try again or adjust your prompt.'}
        </p>
      </div>
    )
  }

  if (!result.variants || result.variants.length === 0) {
    return (
      <div className="card text-center">
        <h3 className="text-lg font-semibold text-gray-900">Generating your variants</h3>
        <p className="mt-2 text-sm text-gray-600">Give us a moment while we craft responses in your persona voice.</p>
        {result.jobId && result.jobId !== 'sync' && (
          <p className="mt-4 text-xs font-medium text-gray-400">Job ID: {result.jobId}</p>
        )}
      </div>
    )
  }

  const platformLabel = platformInfo[platform]?.label ?? 'Custom Platform'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Ready-to-post variants</h3>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">{platformLabel}</span>
        </div>
        <span className="text-sm text-gray-500">
          {result.variants.length} variant{result.variants.length !== 1 ? 's' : ''} generated
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {result.variants.map((variant, index) => {
          const hookBadgeClass = variant.metadata.hookType
            ? hookBadgeColors[variant.metadata.hookType] ?? 'bg-gray-100 text-gray-700'
            : null

          return (
            <div key={variant.id} className="card h-full border border-gray-200/80 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                    Variant {index + 1}
                  </span>
                  {hookBadgeClass && (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${hookBadgeClass}`}>
                      {variant.metadata.hookType}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => copyToClipboard(variant.content, variant.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-100"
                >
                  {copiedVariant === variant.id ? (
                    <>
                      <svg className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 7V5.75A2.75 2.75 0 0110.75 3h6.5A2.75 2.75 0 0120 5.75v6.5A2.75 2.75 0 0117.25 15H16M6.75 7.5H5.5A2.5 2.5 0 003 10v6.5A2.5 2.5 0 005.5 19h6.5a2.5 2.5 0 002.5-2.5v-6.5a2.5 2.5 0 00-2.5-2.5H6.75z"
                        />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">{variant.content}</p>
                </div>

                {variant.metadata.wasTruncated && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 text-xs">
                        <p className="font-medium">
                          Content truncated by {variant.metadata.overLimit} characters to meet platform limits.
                        </p>
                        <p>
                          Original length: {variant.metadata.originalLength} | Current length: {variant.metadata.length}
                        </p>
                      </div>
                      {onRework && (
                        <button
                          onClick={() => handleRework(variant)}
                          disabled={reworking === variant.id}
                          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reworking === variant.id ? 'Reworking...' : 'Shorten again'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {variant.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs font-medium text-indigo-600">
                    {variant.hashtags.map((hashtag, index) => (
                      <span key={`${variant.id}-tag-${index}`} className="rounded-full bg-indigo-50 px-3 py-1">
                        {hashtag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between border-t pt-3 text-xs text-gray-500">
                  <span>{variant.metadata.length} characters</span>
                  {variant.metadata.sentiment && <span className="capitalize">{variant.metadata.sentiment}</span>}
                </div>

                {variant.hook && variant.cta && (
                  <div className="rounded-lg border border-gray-100 bg-white p-3 text-xs text-gray-600">
                    <p>
                      <span className="font-semibold text-gray-700">Hook: </span>
                      {variant.hook}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-gray-700">CTA: </span>
                      {variant.cta}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
