import { prisma } from '../lib'
import { PersonaEngine, ContentRequest, ContentVariant, GenerationResult } from '../lib'
import { JobService } from './job-service'

export interface ComposerRequest {
  input: string
  personaId: string
  platform: 'twitter' | 'linkedin' | 'instagram'
  options?: {
    variants?: number
    maxLength?: number
    includeHashtags?: boolean
  }
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
      // Validate persona exists
      const persona = await prisma.persona.findUnique({
        where: { id: request.personaId }
      })

      if (!persona) {
        throw new Error('Persona not found')
      }

      // For simple requests, generate synchronously
      if ((request.options?.variants || 3) <= 2 && request.input.length < 500) {
        const result = await this.generateSync(request)
        return {
          success: result.success,
          jobId: 'sync', // No actual job for sync requests
          variants: result.variants,
          error: result.error
        }
      }

      // For complex requests, queue a job
      const job = await this.jobService.createComposerJob({
        type: 'BRAIN_DUMP',
        personaId: request.personaId,
        input: request
      })

      return {
        success: true,
        jobId: job.id
      }

    } catch (error) {
      throw error
    }
  }

  async generateSync(request: ComposerRequest): Promise<GenerationResult> {
    try {
      // Get persona from database
      const dbPersona = await prisma.persona.findUnique({
        where: { id: request.personaId }
      })

      if (!dbPersona) {
        throw new Error('Persona not found')
      }

      // Create persona engine
      const personaEngine = PersonaEngine.fromDatabasePersona(dbPersona)

      // Build content request
      const contentRequest: ContentRequest = {
        type: 'brain_dump',
        input: request.input,
        personaId: request.personaId,
        platform: request.platform,
        options: {
          variants: request.options?.variants || 3,
          maxLength: request.options?.maxLength,
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

    try {
      // Build prompts
      const systemPrompt = personaEngine.buildSystemMessage('compose', request.platform)
      const userPrompt = personaEngine.buildPrompt(request)

      // Call Ollama API
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
      const model = process.env.OLLAMA_MODEL || 'llama3.1:8b'

      const variants: ContentVariant[] = []
      const variantCount = request.options.variants || 3

      // Generate multiple variants
      for (let i = 0; i < variantCount; i++) {
        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt: `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant: I'll create engaging ${request.platform} content based on your persona and input. Here's variant ${i + 1}:`,
            stream: false,
            options: {
              temperature: 0.7 + (i * 0.1), // Vary temperature for different variants
              top_p: 0.9,
              max_tokens: request.options.maxLength || 280
            }
          })
        })

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`)
        }

        const result = await response.json()
        const content = result.response.trim()

        // Parse the generated content into components
        const variant = this.parseGeneratedContent(content, `variant_${i + 1}`, request)
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
    // Simple parsing - in production you might want more sophisticated parsing
    const lines = content.split('\n').filter(line => line.trim().length > 0)
    
    // Try to extract hook, body, and CTA from the content
    let hook = ''
    let body = content
    let cta = ''
    
    // Look for common patterns
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
    
    // Generate hashtags if requested
    const hashtags = request.options.includeHashtags ? this.generateHashtags(request.platform) : []
    
    return {
      id: variantId,
      content: content,
      hook: hook || "Here's something interesting:",
      body: body || content,
      cta: cta || "What are your thoughts?",
      hashtags,
      metadata: {
        length: content.length,
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

  async getJobStatus(jobId: string) {
    if (jobId === 'sync') {
      return {
        id: 'sync',
        status: 'COMPLETED',
        result: { message: 'Synchronous request completed immediately' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    }

    return await this.jobService.getJob(jobId)
  }
}