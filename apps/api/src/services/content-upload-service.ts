import { parse } from 'csv-parse/sync'
import { prisma } from '../lib/database'
import fs from 'fs/promises'
import path from 'path'

interface CSVRow {
  [key: string]: string
}

interface StyleAnalysis {
  avgLength: number
  toneKeywords: string[]
  commonPhrases: string[]
  hookPatterns: string[]
  sentimentScore: number
  cadence: 'concise' | 'detailed' | 'conversational'
  suggestedPersona: {
    name: string
    tone: string[]
    cadence: string
    hookPatterns: string[]
    ctaStyle: string
  }
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

  /**
   * Parse CSV file
   */
  async parseCSV(filename: string): Promise<CSVRow[]> {
    const filePath = path.join(this.UPLOAD_DIR, filename)
    const fileContent = await fs.readFile(filePath, 'utf-8')

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
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
      // Try common column names for content
      const content =
        row.text ||
        row.content ||
        row.full_text ||
        row.tweet ||
        row.post ||
        row.message ||
        row.body

      if (!content || content.trim().length === 0) {
        continue
      }

      // Try to extract date
      let date: Date | undefined
      const dateStr = row.date || row.created_at || row.timestamp || row.posted_at
      if (dateStr) {
        const parsed = new Date(dateStr)
        if (!isNaN(parsed.getTime())) {
          date = parsed
        }
      }

      // Try to calculate engagement score
      let engagement = 0
      const likes = parseInt(row.likes || row.favorites || row.favorite_count || '0')
      const retweets = parseInt(row.retweets || row.retweet_count || row.shares || '0')
      const replies = parseInt(row.replies || row.reply_count || row.comments || '0')
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

    // Generate suggested persona based on analysis
    const suggestedPersona = this.generatePersona(
      avgLength,
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
      suggestedPersona
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

  /**
   * Generate persona suggestion
   */
  private generatePersona(
    avgLength: number,
    toneKeywords: string[],
    hookPatterns: string[],
    cadence: string,
    sentimentScore: number
  ) {
    // Determine persona name and CTA style based on tone
    let name = 'Custom Voice'
    let ctaStyle: 'direct' | 'soft' | 'question-based' = 'direct'

    if (toneKeywords.includes('analytical')) {
      name = 'Data-Driven Analyst'
      ctaStyle = 'direct'
    } else if (toneKeywords.includes('motivational')) {
      name = 'Inspirational Coach'
      ctaStyle = 'soft'
    } else if (toneKeywords.includes('educational')) {
      name = 'Knowledge Sharer'
      ctaStyle = 'question-based'
    } else if (toneKeywords.includes('humorous')) {
      name = 'Witty Entertainer'
      ctaStyle = 'question-based'
    } else if (toneKeywords.includes('professional')) {
      name = 'Business Expert'
      ctaStyle = 'direct'
    }

    return {
      name,
      tone: toneKeywords.length > 0 ? toneKeywords : ['authentic', 'engaging'],
      cadence,
      hookPatterns,
      ctaStyle
    }
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
  async createPersonaFromAnalysis(userId: string, uploadId: string, customizations?: {
    name?: string
    description?: string
  }) {
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
    const suggested = analysis.suggestedPersona

    // Create persona
    const persona = await prisma.persona.create({
      data: {
        userId,
        name: customizations?.name || suggested.name,
        description: customizations?.description || `AI-generated persona based on ${upload.totalPosts} posts`,
        isDefault: false,
        tone: JSON.stringify(suggested.tone),
        cadence: suggested.cadence,
        donts: JSON.stringify([]),
        hookPatterns: JSON.stringify(suggested.hookPatterns),
        ctaStyle: suggested.ctaStyle,
        platforms: JSON.stringify({})
      }
    })

    return persona
  }
}
