export interface ContentVariant {
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
    wasTruncated?: boolean
    originalLength?: number
    overLimit?: number
    originalContent?: string
  }
}

export interface GenerationResult {
  success: boolean
  jobId?: string
  variants?: ContentVariant[]
  error?: string
}
