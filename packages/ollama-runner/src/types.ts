export interface OllamaRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  stream?: boolean
  options?: {
    temperature?: number
    top_p?: number
    max_tokens?: number
  }
}

export interface OllamaResponse {
  message: {
    role: string
    content: string
  }
  done: boolean
  total_duration?: number
  load_duration?: number
  prompt_eval_count?: number
  eval_count?: number
}

export interface LLMJob {
  id: string
  type: string
  systemPrompt: string
  userPrompt: string
  model?: string
  options?: {
    temperature?: number
    max_tokens?: number
  }
  createdAt: string
}

export interface LLMJobResult {
  jobId: string
  success: boolean
  response?: string
  error?: string
  metadata?: {
    model: string
    processingTime: number
    tokenCount?: number
  }
}