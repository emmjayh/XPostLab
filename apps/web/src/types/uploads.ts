export interface PersonaSuggestion {
  id: string
  name: string
  description: string
  tone: string[]
  cadence: string
  donts: string[]
  hookPatterns: string[]
  ctaStyle: string
  samplePosts?: string[]
  matchScore?: number
}

export interface UploadSummary {
  id: string
  filename: string
  originalName: string
  platform: string
  status: string
  totalPosts: number
  createdAt: string
  updatedAt?: string
  error?: string | null
}

export interface UploadDetails extends UploadSummary {
  analysis?: {
    avgLength?: number
    toneKeywords?: string[]
    commonPhrases?: string[]
    hookPatterns?: string[]
    sentimentScore?: number
    cadence?: string
    personaSuggestions?: PersonaSuggestion[]
  } | null
  analyzedPosts?: Array<{
    id: string
    content: string
    platform: string
    originalDate?: string
    engagementScore?: number
  }>
}
