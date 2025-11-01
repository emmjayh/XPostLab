import { prisma } from '@ai-content-coach/database'
import { PersonaEngine, ContentRequest, ContentVariant, GenerationResult } from '@ai-content-coach/shared'
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

      // For demo purposes, we'll return mock data
      // In production, this would call Ollama directly or queue a job
      const mockVariants: ContentVariant[] = await this.generateMockVariants(request)

      // Validate with persona engine
      const result = personaEngine.validateOutput(mockVariants, request)
      result.metadata.processingTime = Date.now() - startTime

      return result

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed',
        metadata: {
          personaUsed: request.personaId,
          processingTime: Date.now() - startTime
        }
      }
    }
  }

  // Mock generation for demo purposes
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