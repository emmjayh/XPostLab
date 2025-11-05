import { prisma } from '../lib/database'
import { PersonaEngine, ContentRequest, ContentVariant, GenerationResult } from '../lib'
import { countTokens, approxCharsPerToken, applyOutputLimits, normalizeToString } from '../lib/token-utils'
import { JobService } from './job-service'

export interface ComposerRequest {
  input: string
  personaId: string
  platform: 'twitter' | 'linkedin' | 'instagram'
  userId?: string
  options?: {
    variants?: number
    maxLength?: number // Custom character limit (defaults based on platform)
    maxTokens?: number
    includeHashtags?: boolean
    includeEmojis?: boolean
  }
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

interface PersonaEngineConfig {
  id: string
  name: string
  tone: string[]
  cadence: string
  donts: string[]
  hookPatterns: string[]
  ctaStyle: string
  platforms: Record<string, unknown>
}

export class ComposerService {
  private jobService: JobService

  constructor() {
    this.jobService = new JobService()
  }

  async generateFromBrainDump(request: ComposerRequest): Promise<{
    success: boolean
    jobId: string
    variants?: ContentVariant[]
    error?: string
  }> {
    try {
      if (!request.personaId || request.personaId.trim() === '') {
        throw new Error('Persona ID is required')
      }

      const { config: personaConfig, persistedId } = await this.resolvePersonaConfig(request.personaId, request.userId)

      const requestedVariants = request.options?.variants ?? 1
      const shouldGenerateSync =
        !request.userId || (requestedVariants <= 5 && request.input.length < 2000)

      if (shouldGenerateSync) {
        const result = await this.generateSync(request, personaConfig)

        let recordedJobId: string | null = null
        if (request.userId && result.success && result.variants?.length) {
          recordedJobId = await this.persistGeneratedContent(request, persistedId, result)
        }

        return {
          success: result.success,
          jobId: request.userId ? recordedJobId ?? 'sync' : 'demo-sync',
          variants: result.variants,
          error: result.error,
        }
      }

      if (!request.userId) {
        const result = await this.generateSync(request, personaConfig)
        return {
          success: result.success,
          jobId: 'demo-sync',
          variants: result.variants,
          error: result.error,
        }
      }

      const job = await this.jobService.createComposerJob({
        userId: request.userId,
        type: 'BRAIN_DUMP',
        personaId: personaConfig.id,
        input: request,
      })

      return {
        success: true,
        jobId: job?.id ?? 'queued',
      }

    } catch (error) {
      throw error
    }
  }

  async generateSync(request: ComposerRequest, personaConfig: PersonaEngineConfig): Promise<GenerationResult> {
    try {
      const personaEngine = PersonaEngine.fromDatabasePersona({
        id: personaConfig.id,
        name: personaConfig.name,
        description: undefined,
        tone: personaConfig.tone,
        cadence: personaConfig.cadence,
        donts: personaConfig.donts,
        hookPatterns: personaConfig.hookPatterns,
        ctaStyle: personaConfig.ctaStyle,
        platforms: personaConfig.platforms,
      })

      // Determine limits based on platform with token support
      const platformCharDefaults = {
        twitter: 280,
        linkedin: 3000,
        instagram: 2200,
      }
      const platformTokenDefaults = {
        twitter: 80,
        linkedin: 750,
        instagram: 550,
      }

      const defaultCharLimit = platformCharDefaults[request.platform]
      const maxLength = request.options?.maxLength ?? defaultCharLimit
      const defaultTokenLimit = platformTokenDefaults[request.platform]
      const maxTokens =
        request.options?.maxTokens ??
        defaultTokenLimit ??
        Math.ceil(maxLength / approxCharsPerToken())

      // Build content request
      const contentRequest: ContentRequest = {
        type: 'brain_dump',
        input: request.input,
        personaId: request.personaId,
        platform: request.platform,
        options: {
          variants: request.options?.variants ?? 1,
          maxLength,
          maxTokens,
          includeHashtags: request.options?.includeHashtags ?? false,
          includeEmojis: request.options?.includeEmojis ?? false,
        }
      }

      // Check if we have Ollama runner mode or direct mode
      const ollamaMode = process.env.OLLAMA_MODE || 'runner'
      
      if (ollamaMode === 'direct') {
        return await this.generateWithDirectOllama(personaEngine, contentRequest)
      } else {
        // For runner mode, queue the job and return pending status
        // In a real implementation, this would create a job and return job ID
        // For now, we'll simulate direct generation for demo purposes
        return await this.generateWithDirectOllama(personaEngine, contentRequest)
      }

    } catch (error) {
      return {
        success: false,
        variants: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          personaUsed: request.personaId,
          processingTime: 0
        }
      }
    }
  }


  private async generateWithDirectOllama(
    personaEngine: PersonaEngine,
    request: ContentRequest
  ): Promise<GenerationResult> {
    const startTime = Date.now()
    console.log('Starting Ollama generation...')

    try {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      const model = 'gemma3:12b' // Default to Gemma 3 12B for richer outputs
      console.log('Calling Ollama:', { ollamaUrl, model })

      const variants: ContentVariant[] = []
      const variantCount = request.options?.variants ?? 1
      const tokenLimit =
        request.options.maxTokens ??
        Math.ceil((request.options.maxLength ?? 280) / approxCharsPerToken())
      const charLimit =
        request.options.maxLength ?? Math.ceil(tokenLimit * approxCharsPerToken())

      for (let i = 0; i < variantCount; i++) {
        console.log(`Generating variant ${i + 1}/${variantCount}...`)

        const hookStyle = i === 0 ? 'Ask a question' : i === 1 ? 'Share an insight' : 'Tell a story'
        const includeHashtags = request.options?.includeHashtags ?? false
        const includeEmojis = request.options?.includeEmojis ?? false

        const rules: string[] = [
          `- Keep the entire post under ${charLimit} characters (approx ${tokenLimit} tokens).`,
          '- Return ONLY the final post text. No headings, instructions, or additional sections.',
          '- Write a single, polished post without replies or follow-up content.'
        ]

        if (includeHashtags) {
          rules.push('- Include 1-2 concise hashtags only if they add value (preferably at the end).')
        } else {
          rules.push('- Do not include hashtags.')
        }

        if (includeEmojis) {
          rules.push('- Emojis are allowed; use them sparingly to add personality.')
        } else {
          rules.push('- Do not use emojis.')
        }

        const basePrompt = `You are writing a ${request.platform} post.
${rules.join('\n')}

Topic: "${request.input}"

Style hint: ${hookStyle}.

Produce a single post that satisfies every rule above.`

        const maxAttempts = 4
        let attempt = 0
        let prompt = basePrompt
        let acceptedVariant: ContentVariant | null = null
        let lastVariant: ContentVariant | null = null
        let lastCharLength = 0
        let lastTokenLength = 0

        while (attempt < maxAttempts) {
          attempt++
          console.log(`Sending prompt to Ollama (attempt ${attempt}/${maxAttempts}):\n${prompt}`)

          const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              prompt,
              stream: false,
              options: {
                temperature: 0.7,
                num_predict: 150,
              },
            }),
          })

          console.log(`Ollama response status: ${response.status}`)

          if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`)
          }

          const result = await response.json()
          const content = normalizeToString(result.response).trim()
          const generatedTokens = countTokens(content)
          console.log(
            `Generated content (${content.length} chars, ${generatedTokens} tokens):`,
            content.slice(0, 200) + '...'
          )

          const candidate = this.parseGeneratedContent(content, `variant_${i + 1}`, request)
          candidate.metadata.length = candidate.content.length
          candidate.metadata.tokenLength = countTokens(candidate.content)

          lastVariant = candidate
          lastCharLength = candidate.metadata.length
          lastTokenLength = candidate.metadata.tokenLength

          if (candidate.metadata.length <= charLimit && candidate.metadata.tokenLength <= tokenLimit) {
            acceptedVariant = candidate
            break
          }

          console.log(
            `Variant ${i + 1} exceeded limits (${candidate.metadata.length}/${charLimit} chars, ${candidate.metadata.tokenLength}/${tokenLimit} tokens)`
          )

          if (attempt >= maxAttempts) {
            break
          }

          prompt = `${basePrompt}

Your previous attempt was ${lastCharLength} characters and ${lastTokenLength} tokens.
Rewrite the single ${request.platform} post to satisfy every rule: stay under ${charLimit} characters, no extra sections, no replies, no labels—just the final post text. Remove filler until the post meets the limit.`
        }

        let finalVariant: ContentVariant | null = acceptedVariant

        if (!finalVariant && lastVariant) {
          console.log(
            `All attempts exceeded limits. Applying fallback clamp (may reduce richness).`
          )
          const originalFallbackContent = lastVariant.content
          const fallback = applyOutputLimits(originalFallbackContent, {
            maxTokens: tokenLimit,
            maxLength: charLimit,
          })

          lastVariant.content = fallback.text
          lastVariant.metadata.length = fallback.text.length
          lastVariant.metadata.tokenLength = fallback.tokens
          lastVariant.metadata.wasTruncated = true
          lastVariant.metadata.originalLength =
            lastVariant.metadata.originalLength ?? originalFallbackContent.length
          lastVariant.metadata.originalContent =
            lastVariant.metadata.originalContent ?? originalFallbackContent

          if (fallback.charOverflow > 0) {
            lastVariant.metadata.overLimit = Math.max(
              lastVariant.metadata.overLimit ?? 0,
              fallback.charOverflow
            )
          }

          if (fallback.tokenOverflow > 0) {
            lastVariant.metadata.overTokenLimit = Math.max(
              lastVariant.metadata.overTokenLimit ?? 0,
              fallback.tokenOverflow
            )
          }

          finalVariant = lastVariant
        }

        if (!finalVariant) {
          throw new Error('Failed to produce a variant within the specified limits.')
        }

        // Ensure metadata reflects final content limits
        finalVariant.metadata.length = finalVariant.content.length
        finalVariant.metadata.tokenLength = countTokens(finalVariant.content)

        if (!finalVariant.metadata.wasTruncated) {
          finalVariant.metadata.originalLength = undefined
          finalVariant.metadata.originalContent = undefined
          finalVariant.metadata.overLimit = undefined
          finalVariant.metadata.overTokenLimit = undefined
        }

        console.log(`Parsed variant:`, JSON.stringify(finalVariant, null, 2))
        variants.push(finalVariant)
      }

      const result = personaEngine.validateOutput(variants, request)
      result.metadata.processingTime = Date.now() - startTime
      result.metadata.model = model

      return result
    } catch (error) {
      console.error('Ollama generation error:', error)
      return {
        success: false,
        variants: [],
        error: error instanceof Error ? error.message : 'Generation failed',
        metadata: {
          personaUsed: request.personaId,
          processingTime: Date.now() - startTime,
        },
      }
    }
  }

  private parseGeneratedContent(content: string, variantId: string, request: ContentRequest): ContentVariant {
    let sanitized = normalizeToString(content).trim()

    sanitized = sanitized.replace(/^['"`]+|['"`]+$/g, '')
    sanitized = sanitized.replace(/^```(?:[a-zA-Z]+)?\s*([\s\S]*?)\s*```$/g, '$1').trim()
    sanitized = sanitized.replace(/\b(?:Hook|Body|CTA|Copy|Variant)\s*[:\-]\s*/gi, '')

    const cutoffMarkers = ['\nReplies', '\nReply', '\n---', '\n# Replies', '\nAdditional context', '\nNotes']
    for (const markerString of cutoffMarkers) {
      const idx = sanitized.toLowerCase().indexOf(markerString.toLowerCase())
      if (idx >= 0) {
        sanitized = sanitized.slice(0, idx).trim()
      }
    }

    const includeHashtags = request.options?.includeHashtags ?? false
    const includeEmojis = request.options?.includeEmojis ?? false

    if (!includeEmojis) {
      sanitized = sanitized.replace(/\p{Extended_Pictographic}/gu, '')
    }

    sanitized = sanitized.replace(/\s+\n/g, ' ').replace(/\n+/g, ' ')
    sanitized = sanitized.replace(/\s{2,}/g, ' ').trim()

    let hashtags: string[] = []

    if (includeHashtags) {
      const hashtagRegex = /#[^\s#]+/g
      let extractedMatches = sanitized.match(hashtagRegex)
      let extracted = extractedMatches ? Array.from(extractedMatches) : []

      if (extracted.length === 0) {
        const generated = this.generateHashtags(request.platform)
        if (generated.length) {
          const appended = `${sanitized} ${generated.join(' ')}`.trim()
          sanitized = appended
          extractedMatches = sanitized.match(hashtagRegex)
          extracted = extractedMatches ? Array.from(extractedMatches) : generated
        }
      }

      hashtags = extracted.map((tag) => tag.trim())
    } else {
      sanitized = sanitized.replace(/(?:^|\s)#[^\s#]+/g, (match) => (match.startsWith(' ') ? ' ' : ''))
    }

    if (!includeEmojis) {
      sanitized = sanitized.replace(/\p{Extended_Pictographic}/gu, '')
    }

    sanitized = sanitized.replace(/\s{2,}/g, ' ').trim()

    if (!sanitized) {
      sanitized = 'Preview unavailable.'
    }

    if (includeHashtags && hashtags.length) {
      hashtags = Array.from(new Set(hashtags.map((tag) => tag.trim())))
    }

    const hashtagsForMeta = includeHashtags ? hashtags : []

    return {
      id: variantId,
      content: sanitized,
      body: sanitized,
      hook: sanitized,
      cta: undefined,
      hashtags: hashtagsForMeta,
      metadata: {
        length: sanitized.length,
        sentiment: 'positive',
        hookType: this.getHookType(sanitized),
      },
    }
  }

  // Mock generation for demo purposes (kept as fallback)
  private async generateMockVariants(request: ContentRequest): Promise<ContentVariant[]> {
    const variants: ContentVariant[] = []
    const variantCount = request.options?.variants ?? 1

    const hooks = [
      "Here's what I learned from",
      "Unpopular opinion:",
      "Quick thread on",
      "What if I told you",
      "After 5 years of"
    ]

    const ctas = [
      "What are your thoughts?",
      "Drop your experience below 👇",
      "Agree or disagree?",
      "Save this for later 🔖",
      "Share if this resonates!"
    ]

    for (let i = 0; i < variantCount; i++) {
      const hook = hooks[i % hooks.length]
      const cta = ctas[i % ctas.length]
      const body = this.transformInput(request.input, i)
      const rawContent = `${hook} ${body}\n\n${cta}`

      let variant = this.parseGeneratedContent(rawContent, `variant_${i + 1}`, request)

      const limits = applyOutputLimits(variant.content, {
        maxTokens: request.options.maxTokens,
        maxLength: request.options.maxLength,
      })

      variant.content = limits.text
      variant.body = limits.text
      variant.hook = variant.content
      variant.metadata.length = limits.text.length
      variant.metadata.tokenLength = limits.tokens
      variant.metadata.sentiment = 'positive'
      variant.metadata.hookType = this.getHookType(variant.content)

      if (limits.wasTruncated) {
        variant.metadata.wasTruncated = true
        variant.metadata.originalLength = rawContent.length
        variant.metadata.originalContent = rawContent
      } else {
        delete variant.metadata.wasTruncated
        delete variant.metadata.originalLength
        delete variant.metadata.originalContent
        delete variant.metadata.overLimit
        delete variant.metadata.overTokenLimit
      }

      if (limits.charOverflow > 0) {
        variant.metadata.overLimit = limits.charOverflow
      }

      if (limits.tokenOverflow > 0) {
        variant.metadata.overTokenLimit = limits.tokenOverflow
      }

      variants.push(variant)
    }

    return variants
  }

  private transformInput(input: string, variant: number): string {
    // Simple transformation logic for demo
    const sentences = input.split('.').filter(s => s.trim().length > 0)
    
    switch (variant) {
      case 0:
        return sentences.join('. ') + '.'
      case 1:
        return sentences.reverse().join('. ') + '.'
      case 2:
        return sentences.slice(0, Math.max(1, sentences.length - 1)).join('. ') + '.'
      default:
        return input
    }
  }

  private generateHashtags(platform: string): string[] {
    const hashtagMap = {
      twitter: ['#contentcreation', '#socialmedia'],
      linkedin: ['#productivity', '#business'],
      instagram: ['#creativity', '#inspiration']
    }

    return hashtagMap[platform as keyof typeof hashtagMap] || []
  }

  private getHookType(hook: string): string {
    if (hook.includes('opinion')) return 'contrarian'
    if (hook.includes('learned')) return 'insight'
    if (hook.includes('What if')) return 'question'
    if (hook.includes('After')) return 'story'
    return 'general'
  }

  async getJobStatus(jobId: string, userId?: string) {
    if (jobId === 'sync' || jobId === 'demo-sync') {
      return {
        id: 'sync',
        status: 'COMPLETED',
        result: { message: 'Synchronous request completed immediately' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }

    return await this.jobService.getJob(jobId, userId)
  }

  private async resolvePersonaConfig(
    personaId: string,
    userId?: string
  ): Promise<{ config: PersonaEngineConfig; persistedId: string | null }> {
    const persona = await prisma.persona.findFirst({
      where: {
        id: personaId,
        ...(userId ? { userId } : {}),
      },
    })

    if (!persona) {
      return {
        config: {
          id: personaId,
          name: 'Custom Persona',
          tone: ['neutral', 'helpful'],
          cadence: 'conversational',
          donts: [],
          hookPatterns: ["Here's the signal I'm watching"],
          ctaStyle: 'direct',
          platforms: {},
        },
        persistedId: null,
      }
    }

    return {
      config: {
        id: persona.id,
        name: persona.name,
        tone: safeJsonParse<string[]>(persona.tone, []),
        cadence: persona.cadence,
        donts: safeJsonParse<string[]>(persona.donts, []),
        hookPatterns: safeJsonParse<string[]>(persona.hookPatterns, []),
        ctaStyle: persona.ctaStyle,
        platforms: safeJsonParse<Record<string, unknown>>(persona.platforms, {}),
      },
      persistedId: persona.id,
    }
  }

  private async persistGeneratedContent(
    request: ComposerRequest,
    personaId: string | null,
    result: GenerationResult
  ) {
    if (!request.userId || !result.variants?.length) {
      return null
    }

    const job = await this.jobService.logJobResult({
      userId: request.userId,
      personaId,
      type: 'BRAIN_DUMP',
      status: 'COMPLETED',
      input: {
        personaId: request.personaId,
        platform: request.platform,
        options: request.options,
        input: request.input,
      },
      output: {
        variants: result.variants,
      },
    })

    await prisma.$transaction(
      result.variants.map((variant) =>
        prisma.post.create({
          data: {
            userId: request.userId!,
            personaId: personaId ?? undefined,
            platform: request.platform,
            content: variant.content,
            published: false,
            platformData: JSON.stringify({
              hook: variant.hook,
              body: variant.body,
              cta: variant.cta,
              hashtags: variant.hashtags,
              metadata: variant.metadata,
              sourceJobId: job?.id,
            }),
          },
        })
      )
    )

    return job?.id ?? null
  }
}
