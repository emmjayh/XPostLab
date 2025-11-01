import { z } from 'zod'

// Persona Configuration
export const PersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tone: z.array(z.string()),
  cadence: z.enum(['concise', 'detailed', 'conversational']),
  donts: z.array(z.string()),
  hookPatterns: z.array(z.string()),
  ctaStyle: z.enum(['direct', 'soft', 'question-based']),
  platforms: z.record(z.any()).default({})
})

export type Persona = z.infer<typeof PersonaSchema>

// Content Generation
export const ContentRequestSchema = z.object({
  type: z.enum(['brain_dump', 'compose', 'reply', 'thread']),
  input: z.string(),
  personaId: z.string(),
  platform: z.enum(['twitter', 'linkedin', 'instagram']),
  options: z.object({
    variants: z.number().min(1).max(5).default(3),
    maxLength: z.number().optional(),
    includeHashtags: z.boolean().default(false),
    tone: z.string().optional()
  }).default({})
})

export type ContentRequest = z.infer<typeof ContentRequestSchema>

export const ContentVariantSchema = z.object({
  id: z.string(),
  content: z.string(),
  hook: z.string().optional(),
  body: z.string(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  metadata: z.object({
    length: z.number(),
    sentiment: z.string().optional(),
    readability: z.number().optional(),
    hookType: z.string().optional()
  })
})

export type ContentVariant = z.infer<typeof ContentVariantSchema>

export const GenerationResultSchema = z.object({
  success: z.boolean(),
  variants: z.array(ContentVariantSchema).default([]),
  error: z.string().optional(),
  metadata: z.object({
    personaUsed: z.string(),
    processingTime: z.number(),
    model: z.string().optional()
  })
})

export type GenerationResult = z.infer<typeof GenerationResultSchema>

// Job System
export const JobSchema = z.object({
  id: z.string(),
  type: z.enum(['BRAIN_DUMP', 'COMPOSE', 'REPLY_GENERATION', 'ALGO_ANALYSIS', 'ACCOUNT_RESEARCH', 'AVATAR_GENERATION', 'HISTORY_ANALYSIS']),
  status: z.enum(['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  input: z.any(),
  output: z.any().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type Job = z.infer<typeof JobSchema>

// Algorithm Analysis
export const AlgoAnalysisSchema = z.object({
  content: z.string(),
  riskScore: z.number().min(0).max(100),
  boostScore: z.number().min(0).max(100),
  band: z.enum(['green', 'yellow', 'red']),
  suggestions: z.array(z.object({
    type: z.string(),
    description: z.string(),
    impact: z.enum(['low', 'medium', 'high']),
    edit: z.string()
  })),
  factors: z.object({
    linkDensity: z.number(),
    hashtagCount: z.number(),
    length: z.number(),
    sentiment: z.string(),
    readability: z.number()
  })
})

export type AlgoAnalysis = z.infer<typeof AlgoAnalysisSchema>

// Reply Generation
export const ReplyContextSchema = z.object({
  originalPost: z.object({
    content: z.string(),
    author: z.string(),
    platform: z.string(),
    engagement: z.object({
      likes: z.number(),
      shares: z.number(),
      comments: z.number()
    }).optional()
  }),
  replyGoal: z.enum(['engage', 'add_value', 'question', 'support', 'correct']),
  maxLength: z.number().default(280)
})

export type ReplyContext = z.infer<typeof ReplyContextSchema>