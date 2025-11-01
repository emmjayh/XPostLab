import axios from 'axios'
import { OllamaClient } from './ollama-client'
import { LLMJob, LLMJobResult } from './types'

export class OllamaRunner {
  private ollamaClient: OllamaClient
  private railwayApiUrl: string
  private apiKey: string
  private pollInterval: number
  private isRunning: boolean = false

  constructor(config: {
    ollamaBaseUrl?: string
    railwayApiUrl: string
    apiKey: string
    pollInterval?: number
  }) {
    this.ollamaClient = new OllamaClient(config.ollamaBaseUrl)
    this.railwayApiUrl = config.railwayApiUrl
    this.apiKey = config.apiKey
    this.pollInterval = config.pollInterval || 5000 // 5 seconds
  }

  async start(): Promise<void> {
    console.log('🚀 Starting Ollama Runner...')
    
    // Check if Ollama is available
    const isAvailable = await this.ollamaClient.isAvailable()
    if (!isAvailable) {
      throw new Error('Ollama is not available at the configured URL. Please ensure Ollama is running.')
    }

    // List available models
    const models = await this.ollamaClient.listModels()
    console.log(`📋 Available models: ${models.join(', ')}`)

    if (models.length === 0) {
      console.log('⚠️  No models found. Pulling recommended model...')
      await this.ollamaClient.pullModel('llama3.1:8b')
    }

    this.isRunning = true
    console.log('✅ Ollama Runner started successfully')
    
    this.startPolling()
  }

  stop(): void {
    this.isRunning = false
    console.log('🛑 Ollama Runner stopped')
  }

  private async startPolling(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.pollForJobs()
      } catch (error) {
        console.error('Error polling for jobs:', error)
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, this.pollInterval))
    }
  }

  private async pollForJobs(): Promise<void> {
    try {
      // Fetch pending jobs from Railway API
      const response = await axios.get(`${this.railwayApiUrl}/api/llm/jobs/pending`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      const jobs: LLMJob[] = response.data

      if (jobs.length > 0) {
        console.log(`📥 Found ${jobs.length} pending job(s)`)
        
        // Process jobs sequentially
        for (const job of jobs) {
          await this.processJob(job)
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // No pending jobs - this is normal
        return
      }
      console.error('Failed to poll for jobs:', error)
    }
  }

  private async processJob(job: LLMJob): Promise<void> {
    console.log(`🔄 Processing job ${job.id} (${job.type})`)
    
    try {
      const startTime = Date.now()
      
      // Determine the best model for this job type
      const model = this.selectModelForJob(job)
      
      // Generate response using Ollama
      const result = await this.ollamaClient.generateWithMetadata({
        model,
        messages: [
          { role: 'system', content: job.systemPrompt },
          { role: 'user', content: job.userPrompt }
        ],
        options: job.options
      })

      // Send result back to Railway
      const jobResult: LLMJobResult = {
        jobId: job.id,
        success: true,
        response: result.content,
        metadata: result.metadata
      }

      await this.submitJobResult(jobResult)
      
      console.log(`✅ Completed job ${job.id} in ${result.metadata.processingTime}ms`)
      
    } catch (error) {
      console.error(`❌ Failed to process job ${job.id}:`, error)
      
      // Send error result back
      const jobResult: LLMJobResult = {
        jobId: job.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      await this.submitJobResult(jobResult)
    }
  }

  private selectModelForJob(job: LLMJob): string {
    // Return specified model if provided
    if (job.model) return job.model

    // Select model based on job type
    const modelMap: Record<string, string> = {
      'BRAIN_DUMP': 'llama3.1:8b',
      'COMPOSE': 'llama3.1:8b',
      'REPLY_GENERATION': 'llama3.1:7b',
      'ALGO_ANALYSIS': 'mistral:7b',
      'ACCOUNT_RESEARCH': 'llama3.1:8b',
      'HISTORY_ANALYSIS': 'mistral:7b'
    }

    return modelMap[job.type] || 'llama3.1:8b'
  }

  private async submitJobResult(result: LLMJobResult): Promise<void> {
    try {
      await axios.post(`${this.railwayApiUrl}/api/llm/jobs/result`, result, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('Failed to submit job result:', error)
      throw error
    }
  }
}