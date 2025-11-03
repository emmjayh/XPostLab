import { prisma } from '../lib/database'
import { PersonaEngine, ContentRequest, ContentVariant, GenerationResult } from '../lib'
import { JobService } from './job-service'

export interface ComposerRequest {
  input: string
  personaId: string
  platform: 'twitter' | 'linkedin' | 'instagram'
  userId?: string
  options?: {
    variants?: number
    maxLength?: number // Custom character limit (defaults based on platform)
    includeHashtags?: boolean
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

      const requestedVariants = request.options?.variants ?? 3
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

      // Determine max length based on platform or user override
      const platformDefaults = {
        twitter: 280,
        linkedin: 3000,
        instagram: 2200
      }
      const maxLength = request.options?.maxLength || platformDefaults[request.platform]

      // Build content request
      const contentRequest: ContentRequest = {
        type: 'brain_dump',
        input: request.input,
        personaId: request.personaId,
        platform: request.platform,
        options: {
          variants: request.options?.variants || 3,
          maxLength: maxLength,
          includeHashtags: request.options?.includeHashtags || false
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
    console.log('🦙 Starting Ollama generation...')

    try {
      // Call Ollama API directly with simple prompt (bypass PersonaEngine for now)
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      const model = 'llama3.1:8b' // Use llama3.1 which we know works
      console.log('🌐 Calling Ollama:', { ollamaUrl, model })

      const variants: ContentVariant[] = []
      const variantCount = request.options.variants || 3
      const charLimit = request.options.maxLength || 280

      // Generate multiple variants ONE AT A TIME
      for (let i = 0; i < variantCount; i++) {
        console.log(`🔄 Generating variant ${i + 1}/${variantCount}...`)

        // Very simple prompt that works
        const hookStyle = i === 0 ? 'Ask a question' : i === 1 ? 'Share an insight' : 'Tell a story'
        const simplePrompt = `Write a short ${request.platform} post about: "${request.input}"

${hookStyle} to hook readers, add valuable content, and end with a call-to-action.

IMPORTANT: Keep it under ${charLimit} characters total.

Format your response exactly like this:
Hook: [your hook here]
Body: [your main content here]
CTA: [your call-to-action here]`

        console.log(`📝 Sending prompt to Ollama:\n${simplePrompt}`)

        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt: simplePrompt,
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 150
            }
          })
        })
        
        console.log(`📡 Ollama response status: ${response.status}`)

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`)
        }

        const result = await response.json()
        const content = result.response.trim()
        console.log(`📄 Generated content (${content.length} chars):`, content.slice(0, 200) + '...')

        // Parse the generated content into components
        let variant = this.parseGeneratedContent(content, `variant_${i + 1}`, request)

        // Auto-truncate if over limit - save original for rework
        if (variant.content.length > charLimit) {
          const overLimit = variant.content.length - charLimit
          const originalContent = variant.content
          console.log(`⚠️ Variant ${i + 1} is ${overLimit} characters OVER the ${charLimit} limit (${variant.content.length} total)`)
          console.log(`📝 Full untruncated content:\n${variant.content}`)
          variant.content = variant.content.substring(0, charLimit - 3) + '...'
          variant.metadata.length = variant.content.length
          variant.metadata.wasTruncated = true
          variant.metadata.originalLength = originalContent.length
          variant.metadata.overLimit = overLimit
          variant.metadata.originalContent = originalContent
          console.log(`✂️ Truncated to ${variant.metadata.length} chars`)
        }

        console.log(`📋 Parsed variant:`, JSON.stringify(variant, null, 2))
        variants.push(variant)
      }

      // Validate with persona engine
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
          processingTime: Date.now() - startTime
        }
      }
    }
  }

  private parseGeneratedContent(content: string, variantId: string, request: ContentRequest): ContentVariant {
    // Parse the Hook/Body/CTA format
    let hook = ''
    let body = ''
    let cta = ''

    // Extract Hook, Body, and CTA using regex (handle both markdown ** and plain formats)
    const hookMatch = content.match(/\*\*Hook:\*\*\s*(.+?)(?=\n|$)/is) || content.match(/Hook:\s*(.+?)(?=\nBody:|\n\*\*Body:|\n|$)/is)
    const bodyMatch = content.match(/\*\*Body:\*\*\s*(.+?)(?=\n|$)/is) || content.match(/Body:\s*(.+?)(?=\nCTA:|\n\*\*CTA:|\n|$)/is)
    const ctaMatch = content.match(/\*\*CTA:\*\*\s*(.+?)$/is) || content.match(/CTA:\s*(.+?)$/is)

    if (hookMatch) hook = hookMatch[1].trim().replace(/\*\*/g, '') // Remove any ** markdown
    if (bodyMatch) body = bodyMatch[1].trim().replace(/\*\*/g, '')
    if (ctaMatch) cta = ctaMatch[1].trim().replace(/\*\*/g, '')

    // Fallback: if parsing failed, use the whole content as body
    if (!hook && !body && !cta) {
      // Try old common patterns
      const hookPatterns = [
        /^(Here's what.*?[:.])/i,
        /^(Unpopular opinion[:.])/i,
      /^(Quick thread on.*?[:.])/i,
      /^(What if I told you.*?[:.])/i,
      /^(After \d+ years.*?[:.])/i
    ]
    
    for (const pattern of hookPatterns) {
      const match = content.match(pattern)
      if (match) {
        hook = match[1]
        body = content.replace(pattern, '').trim()
        break
      }
    }
    
    // Extract CTA (usually at the end)
    const ctaPatterns = [
      /\n\n(.+[?!])\s*$/,
      /\n\n(What are your thoughts\?.*?)$/i,
      /\n\n(Drop your.*?)$/i,
      /\n\n(Agree or disagree\?.*?)$/i
    ]
    
    for (const pattern of ctaPatterns) {
      const match = body.match(pattern)
      if (match) {
        cta = match[1]
        body = body.replace(pattern, '').trim()
        break
      }
    }
    
    // Use fallbacks if parsing failed
    if (!hook) hook = "Here's something interesting:"
    if (!body) body = content
    if (!cta) cta = "What are your thoughts?"
  }

    // Generate hashtags if requested
    const hashtags = request.options.includeHashtags ? this.generateHashtags(request.platform) : []

    // Calculate the ACTUAL content length (what will be posted)
    const actualContent = `${hook} ${body} ${cta}`.trim()
    const actualLength = actualContent.length

    return {
      id: variantId,
      content: actualContent, // Use the combined content, not the raw Ollama response
      hook,
      body,
      cta,
      hashtags,
      metadata: {
        length: actualLength, // Use the ACTUAL tweet length
        sentiment: 'positive', // Could be enhanced with sentiment analysis
        hookType: this.getHookType(hook)
      }
    }
  }

  // Mock generation for demo purposes (kept as fallback)
  private async generateMockVariants(request: ContentRequest): Promise<ContentVariant[]> {
    const variants: ContentVariant[] = []
    const variantCount = request.options.variants || 3

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
      
      // Simple content transformation
      const body = this.transformInput(request.input, i)
      const content = `${hook} ${body}\n\n${cta}`

      variants.push({
        id: `variant_${i + 1}`,
        content,
        hook,
        body,
        cta,
        hashtags: request.options.includeHashtags ? this.generateHashtags(request.platform) : [],
        metadata: {
          length: content.length,
          sentiment: 'positive',
          hookType: this.getHookType(hook)
        }
      })
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
      return
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
