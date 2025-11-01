import axios, { AxiosInstance } from 'axios'
import { OllamaRequest, OllamaResponse } from './types'

export class OllamaClient {
  private client: AxiosInstance
  private baseURL: string

  constructor(baseURL: string = 'http://localhost:11434') {
    this.baseURL = baseURL
    this.client = axios.create({
      baseURL,
      timeout: 120000, // 2 minutes
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/tags')
      return response.status === 200
    } catch (error) {
      return false
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags')
      return response.data.models?.map((model: any) => model.name) || []
    } catch (error) {
      console.error('Failed to list models:', error)
      return []
    }
  }

  async generate(request: OllamaRequest): Promise<string> {
    try {
      const response = await this.client.post('/api/chat', {
        model: request.model,
        messages: request.messages,
        stream: false,
        options: request.options
      })

      return response.data.message.content
    } catch (error) {
      console.error('Ollama generation failed:', error)
      throw new Error(`Ollama generation failed: ${error}`)
    }
  }

  async generateWithMetadata(request: OllamaRequest): Promise<{
    content: string
    metadata: {
      model: string
      processingTime: number
      tokenCount?: number
    }
  }> {
    const startTime = Date.now()
    
    try {
      const response = await this.client.post('/api/chat', {
        model: request.model,
        messages: request.messages,
        stream: false,
        options: request.options
      })

      const processingTime = Date.now() - startTime

      return {
        content: response.data.message.content,
        metadata: {
          model: request.model,
          processingTime,
          tokenCount: response.data.eval_count
        }
      }
    } catch (error) {
      console.error('Ollama generation failed:', error)
      throw new Error(`Ollama generation failed: ${error}`)
    }
  }

  async pullModel(modelName: string): Promise<void> {
    try {
      console.log(`Pulling model: ${modelName}...`)
      await this.client.post('/api/pull', {
        name: modelName,
        stream: false
      })
      console.log(`Model ${modelName} pulled successfully`)
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error)
      throw error
    }
  }

  // Recommended models for different tasks
  static getRecommendedModels() {
    return {
      creative: 'llama3.1:8b',      // Good for content generation
      analytical: 'mistral:7b',      // Good for analysis tasks
      fast: 'llama3.1:7b',          // Faster responses
      quality: 'llama3.1:70b'       // Best quality but slower
    }
  }
}