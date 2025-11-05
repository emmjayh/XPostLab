import { Buffer } from 'buffer'
import { Tiktoken } from '@dqbd/tiktoken/lite'
import encoding from '@dqbd/tiktoken/encoders/cl100k_base.json'

const tokenizer = new Tiktoken(
  encoding.bpe_ranks,
  encoding.special_tokens,
  encoding.pat_str
)

export function normalizeToString(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (typeof value === 'object') {
    if (value instanceof Uint8Array) {
      return Buffer.from(value).toString('utf8')
    }
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

export function countTokens(text: string | null | undefined): number {
  const normalized = normalizeToString(text)
  if (!normalized) return 0
  return tokenizer.encode(normalized).length
}

export function truncateToTokenLimit(
  text: string,
  maxTokens: number
): { text: string; tokens: number; wasTruncated: boolean } {
  const normalized = normalizeToString(text)

  if (maxTokens <= 0) {
    return { text: '', tokens: 0, wasTruncated: normalized.length > 0 }
  }

  const tokens = tokenizer.encode(normalized)
  if (tokens.length <= maxTokens) {
    return { text: normalized, tokens: tokens.length, wasTruncated: false }
  }

  const truncatedTokens = tokens.slice(0, maxTokens)
  const truncatedText = tokenizer.decode(truncatedTokens) as unknown as string
  return {
    text: truncatedText,
    tokens: truncatedTokens.length,
    wasTruncated: true,
  }
}

export function approxCharsPerToken(): number {
  // Helpful for converting legacy character limits to token counts.
  return 4
}

export interface LimitEnforcementResult {
  text: string
  tokens: number
  wasTruncated: boolean
  tokenOverflow: number
  charOverflow: number
}

export function clampToCharLimit(text: string, maxLength?: number): string {
  const normalized = normalizeToString(text)

  if (typeof maxLength !== 'number') {
    return normalized
  }

  if (maxLength <= 0) {
    return ''
  }

  if (normalized.length <= maxLength) {
    return normalized
  }

  if (maxLength <= 3) {
    return normalized.slice(0, maxLength)
  }

  const prefix = normalized.slice(0, maxLength - 3)
  return `${prefix.trimEnd()}...`
}

export function applyOutputLimits(
  text: string,
  limits: { maxTokens?: number; maxLength?: number }
): LimitEnforcementResult {
  const normalized = normalizeToString(text)
  const { maxTokens, maxLength } = limits
  const originalTokens = countTokens(normalized)
  let tokenOverflow = 0
  let charOverflow = 0
  let currentText = normalized
  let wasTruncated = false

  if (typeof maxTokens === 'number' && maxTokens > 0 && originalTokens > maxTokens) {
    tokenOverflow = originalTokens - maxTokens
    const truncated = truncateToTokenLimit(currentText, maxTokens)
    currentText = truncated.text
    wasTruncated = wasTruncated || truncated.wasTruncated || tokenOverflow > 0
  }

  if (typeof maxLength === 'number' && maxLength > 0 && currentText.length > maxLength) {
    charOverflow = currentText.length - maxLength
    currentText = clampToCharLimit(currentText, maxLength)
    wasTruncated = true
  }

  if (typeof maxTokens === 'number' && maxTokens > 0) {
    const tokensAfterCharClamp = countTokens(currentText)
    if (tokensAfterCharClamp > maxTokens) {
      tokenOverflow = Math.max(tokenOverflow, tokensAfterCharClamp - maxTokens)
      const truncated = truncateToTokenLimit(currentText, maxTokens)
      currentText = truncated.text
      wasTruncated = wasTruncated || truncated.wasTruncated || tokenOverflow > 0
    }
  }

  if (typeof maxLength === 'number' && maxLength > 0 && currentText.length > maxLength) {
    charOverflow = Math.max(charOverflow, currentText.length - maxLength)
    currentText = clampToCharLimit(currentText, maxLength)
    wasTruncated = true
  }

  const finalTokens = countTokens(currentText)

  if (typeof maxTokens === 'number' && maxTokens > 0 && finalTokens > maxTokens) {
    tokenOverflow = Math.max(tokenOverflow, finalTokens - maxTokens)
  }

  if (typeof maxLength === 'number' && maxLength > 0 && currentText.length > maxLength) {
    charOverflow = Math.max(charOverflow, currentText.length - maxLength)
  }

  return {
    text: currentText,
    tokens: finalTokens,
    wasTruncated,
    tokenOverflow,
    charOverflow,
  }
}
