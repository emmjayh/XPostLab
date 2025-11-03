export type PersonaCadence = 'concise' | 'detailed' | 'conversational' | string
export type PersonaCTAStyle = 'direct' | 'soft' | 'question-based' | string

export interface PersonaPlatformConfig {
  maxLength?: number
}

export interface Persona {
  id: string
  userId?: string
  name: string
  description?: string
  isDefault: boolean
  tone: string[]
  cadence: PersonaCadence
  donts?: string[]
  hookPatterns?: string[]
  ctaStyle: PersonaCTAStyle
  platforms?: Record<string, PersonaPlatformConfig>
  createdAt?: string
  updatedAt?: string
}
