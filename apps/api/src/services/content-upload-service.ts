import { parse } from 'csv-parse/sync'
import { prisma } from '../lib/database'
import fs from 'fs/promises'
import path from 'path'

interface CSVRow {
  [key: string]: string
}

type PersonaCadence = 'concise' | 'detailed' | 'conversational'

interface PersonaSuggestion {
  id: string
  name: string
  description: string
  tone: string[]
  cadence: PersonaCadence
  donts: string[]
  hookPatterns: string[]
  ctaStyle: 'direct' | 'soft' | 'question-based'
  samplePosts: string[]
  matchScore: number
}

interface StyleAnalysis {
  avgLength: number
  toneKeywords: string[]
  commonPhrases: string[]
  hookPatterns: string[]
  sentimentScore: number
  cadence: PersonaCadence
  personaSuggestions: PersonaSuggestion[]
}

export class ContentUploadService {
  private readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads')

  constructor() {
    this.ensureUploadDir()
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true })
    } catch (error) {
      console.error('Failed to create upload directory:', error)
    }
  }

  /**
   * Save uploaded file
   */
  async saveFile(buffer: Buffer, originalName: string): Promise<string> {
    const filename = `${Date.now()}-${originalName}`
    const filePath = path.join(this.UPLOAD_DIR, filename)
    await fs.writeFile(filePath, buffer)
    return filename
  }

  private async removeUploadArtifacts(uploadId: string, filename?: string | null) {
    try {
      await prisma.$transaction([
        prisma.analyzedPost.deleteMany({ where: { uploadId } }),
        prisma.contentUpload.delete({ where: { id: uploadId } }),
      ])
    } catch (error) {
      console.error('Failed to delete upload records', error)
    }

    if (!filename) return

    try {
      const filePath = path.join(this.UPLOAD_DIR, filename)
      await fs.unlink(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Failed to delete upload file', error)
      }
    }
  }

  /**
   * Parse CSV file
   */
  async parseCSV(filename: string): Promise<CSVRow[]> {
    const filePath = path.join(this.UPLOAD_DIR, filename)
    const fileContent = await fs.readFile(filePath, 'utf-8')

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    })

    return records
  }

  /**
   * Extract content from CSV rows
   * Handles common column names from Twitter/LinkedIn/Instagram exports
   */
  extractContent(rows: CSVRow[]): Array<{ content: string; date?: Date; engagement?: number }> {
    const posts: Array<{ content: string; date?: Date; engagement?: number }> = []

    for (const row of rows) {
      const lowerRow: Record<string, string> = {}
      for (const [key, value] of Object.entries(row)) {
        lowerRow[key.toLowerCase()] = value
      }

      // Try common column names for content
      const content =
        lowerRow.text ||
        lowerRow.content ||
        lowerRow.full_text ||
        lowerRow.tweet ||
        lowerRow.post ||
        lowerRow.message ||
        lowerRow.body

      if (!content || content.trim().length === 0) {
        continue
      }

      // Try to extract date
      let date: Date | undefined
      const dateStr =
        lowerRow['created at'] ||
        lowerRow['created_at'] ||
        lowerRow.date ||
        lowerRow.timestamp ||
        lowerRow.posted_at
      if (dateStr) {
        const parsed = new Date(dateStr)
        if (!isNaN(parsed.getTime())) {
          date = parsed
        }
      }

      // Try to calculate engagement score
      let engagement = 0
      const likes = parseInt(lowerRow['favorite count'] || lowerRow['likes'] || lowerRow['favorites'] || lowerRow['favorite_count'] || lowerRow['like count'] || '0')
      const retweets = parseInt(lowerRow['retweet count'] || lowerRow['retweets'] || lowerRow['shares'] || '0')
      const replies = parseInt(lowerRow['reply count'] || lowerRow['replies'] || lowerRow['comments'] || '0')
      engagement = likes + (retweets * 2) + (replies * 3) // Weight replies more

      posts.push({ content, date, engagement })
    }

    return posts
  }

  /**
   * Analyze writing style from posts
   */
  async analyzeStyle(posts: Array<{ content: string; engagement?: number }>): Promise<StyleAnalysis> {
    const contents = posts.map(p => p.content)

    // Calculate average length
    const avgLength = contents.reduce((sum, c) => sum + c.length, 0) / contents.length

    // Determine cadence based on average length
    let cadence: 'concise' | 'detailed' | 'conversational'
    if (avgLength < 100) {
      cadence = 'concise'
    } else if (avgLength > 500) {
      cadence = 'detailed'
    } else {
      cadence = 'conversational'
    }

    // Extract tone keywords (simple keyword analysis)
    const toneKeywords = this.extractToneKeywords(contents)

    // Find common phrases (2-3 word combinations that appear multiple times)
    const commonPhrases = this.findCommonPhrases(contents)

    // Identify hook patterns (first 20 chars of posts with high engagement)
    const hookPatterns = this.identifyHookPatterns(posts)

    // Calculate sentiment score (simple positive/negative word counting)
    const sentimentScore = this.calculateSentiment(contents)

    const personaSuggestions = this.generatePersonaSuggestions(
      posts,
      toneKeywords,
      hookPatterns,
      cadence,
      sentimentScore
    )

    return {
      avgLength,
      toneKeywords,
      commonPhrases,
      hookPatterns,
      sentimentScore,
      cadence,
      personaSuggestions
    }
  }

  /**
   * Extract tone keywords from content
   */
  private extractToneKeywords(contents: string[]): string[] {
    const toneMap: { [key: string]: string[] } = {
      analytical: ['data', 'analysis', 'research', 'study', 'findings', 'results', 'metrics'],
      motivational: ['achieve', 'success', 'goal', 'dream', 'inspire', 'motivate', 'empower'],
      educational: ['learn', 'teach', 'guide', 'how to', 'tips', 'tutorial', 'lesson'],
      humorous: ['lol', 'haha', 'funny', 'joke', 'laugh', 'hilarious'],
      professional: ['business', 'strategy', 'growth', 'revenue', 'market', 'industry'],
      conversational: ['hey', 'just', 'think', 'feel', 'believe', 'honestly']
    }

    const foundTones: { [key: string]: number } = {}
    const allText = contents.join(' ').toLowerCase()

    for (const [tone, keywords] of Object.entries(toneMap)) {
      let count = 0
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'g')
        const matches = allText.match(regex)
        count += matches ? matches.length : 0
      }
      if (count > 0) {
        foundTones[tone] = count
      }
    }

    // Return top 3 tones
    return Object.entries(foundTones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tone]) => tone)
  }

  /**
   * Find common phrases
   */
  private findCommonPhrases(contents: string[]): string[] {
    const phrases: { [key: string]: number } = {}

    for (const content of contents) {
      const words = content.toLowerCase().split(/\s+/)
      for (let i = 0; i < words.length - 1; i++) {
        const phrase = `${words[i]} ${words[i + 1]}`
        if (phrase.length > 5) { // Skip very short phrases
          phrases[phrase] = (phrases[phrase] || 0) + 1
        }
      }
    }

    // Return phrases that appear at least twice
    return Object.entries(phrases)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase]) => phrase)
  }

  /**
   * Identify hook patterns from high-engagement posts
   */
  private identifyHookPatterns(posts: Array<{ content: string; engagement?: number }>): string[] {
    // Sort by engagement and take top 20%
    const sorted = posts
      .filter(p => p.engagement !== undefined)
      .sort((a, b) => (b.engagement || 0) - (a.engagement || 0))

    const topPosts = sorted.slice(0, Math.ceil(sorted.length * 0.2))

    if (topPosts.length === 0) {
      // Fallback to first sentence of random posts
      return posts
        .slice(0, 5)
        .map(p => {
          const firstSentence = p.content.split(/[.!?]/)[0]
          return firstSentence.slice(0, 50).trim() + '...'
        })
    }

    return topPosts.slice(0, 5).map(p => {
      const firstPart = p.content.slice(0, 50).trim()
      return firstPart + (p.content.length > 50 ? '...' : '')
    })
  }

  /**
   * Calculate sentiment score (-1 to 1)
   */
  private calculateSentiment(contents: string[]): number {
    const positiveWords = ['great', 'amazing', 'awesome', 'love', 'excellent', 'best', 'wonderful', 'fantastic', 'brilliant']
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'poor']

    let score = 0
    const allText = contents.join(' ').toLowerCase()

    for (const word of positiveWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'g')
      const matches = allText.match(regex)
      score += matches ? matches.length : 0
    }

    for (const word of negativeWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'g')
      const matches = allText.match(regex)
      score -= matches ? matches.length : 0
    }

    // Normalize to -1 to 1 range
    const maxScore = Math.max(Math.abs(score), 1)
    return score / maxScore
  }

  private generatePersonaSuggestions(
    posts: Array<{ content: string; engagement?: number }>,
    toneKeywords: string[],
    hookPatterns: string[],
    cadence: PersonaCadence,
    sentimentScore: number
  ): PersonaSuggestion[] {
    const totalPosts = posts.length || 1
    const lowerPosts = posts.map((post) => ({
      ...post,
      text: post.content.toLowerCase(),
    }))

    const blueprints = [
      {
        id: 'mental-health-ally',
        name: 'Mental Health Ally',
        description:
          'Shows up with honesty and compassion to unpack heavy moments and normalize getting help.',
        keywords: ['mental', 'hospital', 'disorder', 'therapy', 'diagnosed', 'struggle', 'please see'],
        tone: ['empathetic', 'vulnerable', 'supportive'],
        cadence: 'detailed' as PersonaCadence,
        donts: ['dismiss lived experiences', 'offer medical advice', 'rush serious conversations'],
        hookPatterns: ["I remember when...", "It’s okay to admit..."],
        ctaStyle: 'soft' as const,
      },
      {
        id: 'creative-promoter',
        name: 'Creative Promoter',
        description:
          'Hype-first voice that celebrates new drops, collabs, and the behind-the-scenes creative grind.',
        keywords: ['music', 'drop', 'spotify', 'youtube', 'stream', 'release', 'album', 'single'],
        tone: ['energetic', 'optimistic', 'promotional'],
        cadence: 'conversational' as PersonaCadence,
        donts: ['sound desperate', 'overpromise outcomes', 'spam links without context'],
        hookPatterns: ['The next track is...', 'When the beat drops...'],
        ctaStyle: 'direct' as const,
      },
      {
        id: 'community-collaborator',
        name: 'Community Collaborator',
        description:
          'Builds momentum with peers, invites collabs, and keeps the conversation warm and personal.',
        keywords: ['collab', 'together', 'community', 'join', 'dm', '@', 'looking to'],
        tone: ['friendly', 'inviting', 'collaborative'],
        cadence: 'conversational' as PersonaCadence,
        donts: ['ignore replies', 'make one-sided requests', 'sound insincere'],
        hookPatterns: ['Who else is building...', 'Let’s team up to...'],
        ctaStyle: 'question-based' as const,
      },
      {
        id: 'ai-and-tech-explorer',
        name: 'AI & Tech Explorer',
        description:
          'Breaks down how AI and new tools are shifting the creative world with curiosity and clarity.',
        keywords: ['ai', 'automation', 'machine learning', 'tool', 'tech', 'future', 'innovation'],
        tone: ['curious', 'analytical', 'forward-looking'],
        cadence: 'detailed' as PersonaCadence,
        donts: ['use unexplained jargon', 'overhype features', 'ignore creator impact'],
        hookPatterns: ['What if AI could...', 'The next shift in tech is...'],
        ctaStyle: 'direct' as const,
      },
    ]

    const bucketMap = new Map<
      string,
      {
        blueprint: (typeof blueprints)[number]
        count: number
        samplePosts: string[]
      }
    >()

    const addToBucket = (blueprint: (typeof blueprints)[number], post: string) => {
      const existing = bucketMap.get(blueprint.id) || {
        blueprint,
        count: 0,
        samplePosts: [] as string[],
      }

      existing.count += 1
      if (existing.samplePosts.length < 3) {
        existing.samplePosts.push(post.slice(0, 200).trim())
      }

      bucketMap.set(blueprint.id, existing)
    }

    for (const post of lowerPosts) {
      let matched = false

      for (const blueprint of blueprints) {
        if (blueprint.keywords.some((keyword) => post.text.includes(keyword))) {
          addToBucket(blueprint, post.content)
          matched = true
        }
      }

      if (!matched && post.text.includes('?')) {
        addToBucket(
          {
            id: 'curious-conversationalist',
            name: 'Curious Conversationalist',
            description: 'Keeps threads lively by asking sharp, open-ended questions that invite stories.',
            keywords: [],
            tone: ['inquisitive', 'approachable', 'thoughtful'],
            cadence: 'conversational',
            donts: ['make rhetorical questions that shut down dialogue', 'ignore follow-ups', 'overcomplicate language'],
            hookPatterns: ['What if we tried...', 'Has anyone else noticed...'],
            ctaStyle: 'question-based',
          },
          post.content
        )
      }
    }

    const suggestions: PersonaSuggestion[] = Array.from(bucketMap.values())
      .map(({ blueprint, count, samplePosts }) => ({
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        tone: blueprint.tone,
        cadence: blueprint.cadence,
        donts: blueprint.donts,
        hookPatterns: hookPatterns.length ? hookPatterns.slice(0, 3) : blueprint.hookPatterns,
        ctaStyle: blueprint.ctaStyle,
        samplePosts,
        matchScore: Number((count / totalPosts).toFixed(2)),
      }))
      .sort((a, b) => b.matchScore - a.matchScore)

    if (!suggestions.length) {
      suggestions.push({
        id: 'creator-generalist',
        name: 'Creator Generalist',
        description: 'Balanced voice that mixes personal updates with steady community touchpoints.',
        tone: toneKeywords.length ? toneKeywords : ['authentic', 'approachable', 'growth-minded'],
        cadence: cadence,
        donts: ['sound robotic', 'over-orchestrate copy', 'lean on filler phrases'],
        hookPatterns: hookPatterns.slice(0, 3),
        ctaStyle: sentimentScore >= 0 ? 'question-based' : 'soft',
        samplePosts: lowerPosts.slice(0, 3).map((p) => p.content.slice(0, 200).trim()),
        matchScore: 1,
      })
    }

    if (suggestions.length < 3) {
      suggestions.push({
        id: 'momentum-journal',
        name: 'Momentum Journal',
        description: 'Captures daily momentum, lessons, and unfiltered reflections from the creative grind.',
        tone: ['reflective', 'honest', 'motivational'],
        cadence: cadence,
        donts: ['overlook the struggle', 'sell toxic positivity', 'forget the audience'],
        hookPatterns: hookPatterns.slice(0, 3),
        ctaStyle: sentimentScore >= 0 ? 'soft' : 'question-based',
        samplePosts: lowerPosts
          .filter((post) => post.text.includes('today') || post.text.includes('remember'))
          .slice(0, 3)
          .map((p) => p.content.slice(0, 200).trim()),
        matchScore: 0.4,
      })
    }

    return suggestions.slice(0, 4)
  }

  /**
   * Process uploaded file
   */
  async processUpload(userId: string, filename: string, originalName: string, platform: string) {
    // Create upload record
    const upload = await prisma.contentUpload.create({
      data: {
        userId,
        filename,
        originalName,
        platform,
        status: 'PROCESSING'
      }
    })

    try {
      // Parse CSV
      const rows = await this.parseCSV(filename)

      // Extract content
      const posts = this.extractContent(rows)

      if (posts.length === 0) {
        throw new Error('No valid content found in CSV. Please check the file format.')
      }

      // Save analyzed posts to database
      await Promise.all(
        posts.map(post =>
          prisma.analyzedPost.create({
            data: {
              uploadId: upload.id,
              content: post.content,
              platform,
              originalDate: post.date,
              engagementScore: post.engagement || 0,
              metadata: JSON.stringify({
                length: post.content.length
              })
            }
          })
        )
      )

      // Analyze style
      const analysis = await this.analyzeStyle(posts)

      // Update upload record
      await prisma.contentUpload.update({
        where: { id: upload.id },
        data: {
          status: 'ANALYZED',
          totalPosts: posts.length,
          analysis: JSON.stringify(analysis)
        }
      })

      return {
        uploadId: upload.id,
        totalPosts: posts.length,
        analysis
      }
    } catch (error) {
      // Update upload with error
      await prisma.contentUpload.update({
        where: { id: upload.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  /**
   * Get uploads for user
   */
  async getUserUploads(userId: string) {
    return await prisma.contentUpload.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { analyzedPosts: true }
        }
      }
    })
  }

  /**
   * Get upload details
   */
  async getUploadDetails(uploadId: string, userId: string) {
    const upload = await prisma.contentUpload.findFirst({
      where: {
        id: uploadId,
        userId
      },
      include: {
        analyzedPosts: {
          orderBy: { engagementScore: 'desc' },
          take: 20
        }
      }
    })

    if (!upload) {
      throw new Error('Upload not found')
    }

    return {
      ...upload,
      analysis: upload.analysis ? JSON.parse(upload.analysis) : null
    }
  }

  /**
   * Create persona from analysis
   */
  async createPersonaFromAnalysis(
    userId: string,
    uploadId: string,
    customizations?: {
      name?: string
      description?: string
      suggestionId?: string
    }
  ) {
    const upload = await prisma.contentUpload.findFirst({
      where: {
        id: uploadId,
        userId
      }
    })

    if (!upload || !upload.analysis) {
      throw new Error('Upload not found or not analyzed')
    }

    const analysis: StyleAnalysis = JSON.parse(upload.analysis)
    const suggestions = analysis.personaSuggestions || []

    const chosenSuggestion =
      suggestions.find((suggestion) => suggestion.id === customizations?.suggestionId) ||
      suggestions[0]

    const personaSource = chosenSuggestion || {
      id: 'creator-generalist',
      name: customizations?.name || 'Creator Generalist',
      description:
        customizations?.description ||
        `Persona generated from ${upload.totalPosts} posts uploaded on ${upload.createdAt.toISOString()}`,
      tone: ['authentic', 'engaging'],
      cadence: 'conversational' as PersonaCadence,
      donts: [],
      hookPatterns: ['Let me share...', 'Here is what I learned...'],
      ctaStyle: 'question-based' as const,
      samplePosts: [],
      matchScore: 0.5,
    }

    const persona = await prisma.persona.create({
      data: {
        userId,
        name: customizations?.name || personaSource.name,
        description:
          customizations?.description ||
          personaSource.description ||
          `AI-generated persona based on ${upload.totalPosts} posts`,
        isDefault: false,
        tone: JSON.stringify(personaSource.tone),
        cadence: personaSource.cadence,
        donts: JSON.stringify(personaSource.donts ?? []),
        hookPatterns: JSON.stringify(personaSource.hookPatterns ?? []),
        ctaStyle: personaSource.ctaStyle,
        platforms: JSON.stringify({})
      }
    })

    await this.removeUploadArtifacts(uploadId, upload.filename)

    return persona
  }
}
