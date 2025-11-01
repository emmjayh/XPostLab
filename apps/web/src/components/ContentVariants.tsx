'use client'

import { useState } from 'react'

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
  }
}

interface GenerationResult {
  success: boolean
  jobId?: string
  variants?: ContentVariant[]
  error?: string
}

interface ContentVariantsProps {
  result: GenerationResult
  platform: string
}

export function ContentVariants({ result, platform }: ContentVariantsProps) {
  const [copiedVariant, setCopiedVariant] = useState<string | null>(null)

  const copyToClipboard = async (text: string, variantId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedVariant(variantId)
      setTimeout(() => setCopiedVariant(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'twitter':
        return '🐦'
      case 'linkedin':
        return '💼'
      case 'instagram':
        return '📸'
      default:
        return '📱'
    }
  }

  const getHookTypeColor = (hookType?: string) => {
    switch (hookType) {
      case 'question':
        return 'bg-blue-100 text-blue-800'
      case 'story':
        return 'bg-green-100 text-green-800'
      case 'contrarian':
        return 'bg-red-100 text-red-800'
      case 'insight':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!result.success) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Generation Failed</h3>
          <p className="text-gray-600">{result.error || 'An unexpected error occurred'}</p>
        </div>
      </div>
    )
  }

  if (!result.variants || result.variants.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-yellow-500 text-5xl mb-4">⏳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Processing...</h3>
          <p className="text-gray-600">Your content is being generated. This may take a moment.</p>
          {result.jobId && result.jobId !== 'sync' && (
            <p className="text-sm text-gray-500 mt-2">Job ID: {result.jobId}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Generated Variants {getPlatformIcon(platform)}
        </h3>
        <span className="text-sm text-gray-500">
          {result.variants.length} variant{result.variants.length !== 1 ? 's' : ''} generated
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {result.variants.map((variant, index) => (
          <div key={variant.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2 py-1 rounded">
                  Variant {index + 1}
                </span>
                {variant.metadata.hookType && (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${getHookTypeColor(variant.metadata.hookType)}`}>
                    {variant.metadata.hookType}
                  </span>
                )}
              </div>
              
              <button
                onClick={() => copyToClipboard(variant.content, variant.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy to clipboard"
              >
                {copiedVariant === variant.id ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {/* Content Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="whitespace-pre-wrap text-gray-900 text-sm leading-relaxed">
                  {variant.content}
                </div>
              </div>

              {/* Hashtags */}
              {variant.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {variant.hashtags.map((hashtag, i) => (
                    <span key={i} className="text-primary-600 text-sm">
                      {hashtag}
                    </span>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
                <span>{variant.metadata.length} characters</span>
                {variant.metadata.sentiment && (
                  <span className="capitalize">{variant.metadata.sentiment}</span>
                )}
              </div>

              {/* Breakdown (if available) */}
              {variant.hook && variant.cta && (
                <div className="text-xs text-gray-500 space-y-1">
                  <div><strong>Hook:</strong> {variant.hook}</div>
                  <div><strong>CTA:</strong> {variant.cta}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}