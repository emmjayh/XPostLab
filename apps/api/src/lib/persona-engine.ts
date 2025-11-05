import { Persona, ContentRequest, ContentVariant, GenerationResult } from './types'
import { approxCharsPerToken, applyOutputLimits, countTokens } from './token-utils'

export class PersonaEngine {
  private persona: Persona
  private templates: Map<string, string> = new Map()

  constructor(persona: Persona) {
    this.persona = persona
    this.initializeTemplates()
  }

  private initializeTemplates() {
    // Core system prompt templates
    this.templates.set('system_base', `
You are an AI content creator that embodies a specific persona and voice. Your goal is to create authentic, engaging content that feels human-written and on-brand.

PERSONA PROFILE:
- Name: ${this.persona.name}
- Tone: ${this.persona.tone.join(', ')}
- Cadence: ${this.persona.cadence}
- Hook Patterns: ${this.persona.hookPatterns.join(', ')}
- CTA Style: ${this.persona.ctaStyle}

VOICE GUIDELINES:
- Match the specified tone and cadence exactly
- Use the preferred hook patterns when appropriate
- End with CTAs that match the specified style
- Keep content authentic and valuable, never generic
`)

    this.templates.set('composer_prompt', `
Create {variants} unique social media {postLabel} from this brain dump or idea:

INPUT: {input}
PLATFORM: {platform}
TARGET LENGTH: approximately {maxLength} characters
MAX TOKENS: {maxTokens}
HASHTAG RULES: {hashtagRules}
EMOJI RULES: {emojiRules}

For each {variantLabel}, provide:
1. Hook (opening line that grabs attention)
2. Body (main content that delivers value)
3. CTA (call-to-action that matches the persona's style)

Return as JSON array with this structure:
[{
  "hook": "...",
  "body": "...", 
  "cta": "...",
  "hashtags": ["..."],
  "metadata": {
    "length": number,
    "hookType": "question|story|contrarian|insight"
  }
}]

Make each {variantLabel} unique in approach while maintaining the persona's voice.
`)

    this.templates.set('reply_prompt', `
Generate {variants} sharp, value-adding {replyLabel} to this post:

ORIGINAL POST: {originalPost}
AUTHOR: {author}
GOAL: {replyGoal}
HASHTAG RULES: {hashtagRules}
EMOJI RULES: {emojiRules}

Create {replyLabel} that:
- Add genuine value, not generic praise
- Show expertise and insight
- Feel conversational, not promotional
- Match the persona's voice perfectly
- Are under {maxLength} characters

Return as JSON array with same structure as composer.
`)
  }

  buildSystemMessage(type: string, platform: string): string {
    const basePrompt = this.templates.get('system_base') || ''
    const platformRules = this.getPlatformRules(platform)
    
    return `${basePrompt}\n\nPLATFORM RULES for ${platform.toUpperCase()}:\n${platformRules}`
  }

  private getPlatformRules(platform: string): string {
    const rules = {
      twitter: `
- Keep posts under 280 characters unless creating threads
- Use 1-2 hashtags maximum, strategically placed
- Write for skimming - make every word count
- Use line breaks for readability
- Threads should have strong hooks and clear progression`,
      
      linkedin: `
- Professional tone while maintaining personality
- Longer-form content encouraged (up to 3000 characters)
- Include relevant industry insights
- Use line breaks and emojis sparingly
- End with engagement-driving questions`,
      
      instagram: `
- Visual-first platform - assume there's an image
- Use emojis to break up text
- Include relevant hashtags (3-5 recommended)
- Encourage saves and shares
- Personal storytelling works well`
    }

    return rules[platform as keyof typeof rules] || rules.twitter
  }

  buildPrompt(request: ContentRequest): string {
    const template = request.type === 'reply' 
      ? this.templates.get('reply_prompt')
      : this.templates.get('composer_prompt')

    if (!template) throw new Error(`Template not found for type: ${request.type}`)

    const variantCount = request.options.variants ?? 1
    const variantLabel = variantCount === 1 ? 'variant' : 'variants'
    const postLabel = variantCount === 1 ? 'post' : 'posts'
    const replyLabel = variantCount === 1 ? 'reply' : 'replies'
    const maxLengthValue = this.getPlatformMaxLength(request.platform, request.options.maxLength)
    const maxTokensValue =
      request.options.maxTokens ?? Math.ceil(maxLengthValue / approxCharsPerToken())
    const maxLength = maxLengthValue.toString()
    const maxTokens = maxTokensValue.toString()

    const includeHashtags = request.options.includeHashtags ?? false
    const includeEmojis = request.options.includeEmojis ?? false
    const hashtagRules = includeHashtags ? 'Include 1-2 relevant hashtags only when useful.' : 'Do not include hashtags.'
    const emojiRules = includeEmojis ? 'Emojis are permitted; use them sparingly.' : 'Do not use emojis.'

    const replacements: Record<string, string> = {
      '{variants}': variantCount.toString(),
      '{variantLabel}': variantLabel,
      '{postLabel}': postLabel,
      '{replyLabel}': replyLabel,
      '{input}': request.input,
      '{platform}': request.platform,
      '{maxLength}': maxLength,
      '{maxTokens}': maxTokens,
      '{hashtagRules}': hashtagRules,
      '{emojiRules}': emojiRules,
    }

    let prompt = template
    for (const [token, value] of Object.entries(replacements)) {
      prompt = prompt.split(token).join(value)
    }

    return prompt
  }

  private getPlatformMaxLength(platform: string, override?: number): number {
    if (override) return override
    
    const defaults = {
      twitter: 280,
      linkedin: 3000,
      instagram: 2200
    }
    
    return defaults[platform as keyof typeof defaults] || 280
  }

  validateOutput(variants: ContentVariant[], request: ContentRequest): GenerationResult {
    const maxLength = this.getPlatformMaxLength(request.platform, request.options.maxLength)
    const maxTokens =
      request.options.maxTokens ?? Math.ceil(maxLength / approxCharsPerToken())
    const filteredVariants: ContentVariant[] = []
    const errors: string[] = []

    for (const variant of variants) {
      const originalContent = variant.content
      const limits = applyOutputLimits(originalContent, {
        maxTokens,
        maxLength,
      })

      variant.content = limits.text

      const includeHashtags = request.options.includeHashtags ?? false
      const includeEmojis = request.options.includeEmojis ?? false
      const hashtagRegex = /#[^\s#]+/g

      if (!includeHashtags) {
        variant.content = variant.content.replace(/(?:^|\s)#[^\s#]+/g, (match) => (match.startsWith(' ') ? ' ' : '')).replace(/\s{2,}/g, ' ').trim()
        variant.hashtags = []
      } else {
        const extractedMatches = variant.content.match(hashtagRegex)
        const extracted = extractedMatches ? Array.from(extractedMatches) : []
        if (extracted.length) {
          variant.hashtags = Array.from(new Set(extracted.map((tag) => tag.trim())))
        }
      }

      if (!includeEmojis) {
        variant.content = variant.content.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s{2,}/g, ' ').trim()
      }

      variant.metadata.length = variant.content.length
      variant.metadata.tokenLength = countTokens(variant.content)

      if (limits.charOverflow > 0) {
        variant.metadata.overLimit = Math.max(
          variant.metadata.overLimit ?? 0,
          limits.charOverflow
        )
      }

      if (limits.tokenOverflow > 0) {
        variant.metadata.overTokenLimit = Math.max(
          variant.metadata.overTokenLimit ?? 0,
          limits.tokenOverflow
        )
      }

      if (limits.wasTruncated) {
        variant.metadata.wasTruncated = true
        variant.metadata.originalLength = variant.metadata.originalLength ?? originalContent.length
        variant.metadata.originalContent = variant.metadata.originalContent ?? originalContent
      }

      if (!variant.content.trim()) {
        errors.push(`Variant ${variant.id} was truncated to empty content after enforcing limits`)
        continue
      }

      filteredVariants.push(variant)
    }

    return {
      success: filteredVariants.length > 0,
      variants: filteredVariants,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      metadata: {
        personaUsed: this.persona.id,
        processingTime: Date.now() // This should be set by the caller
      }
    }
  }

  // Static method to create engine from database persona
  static fromDatabasePersona(dbPersona: any): PersonaEngine {
    const persona: Persona = {
      id: dbPersona.id,
      name: dbPersona.name,
      description: dbPersona.description,
      tone: dbPersona.tone,
      cadence: dbPersona.cadence,
      donts: dbPersona.donts,
      hookPatterns: dbPersona.hookPatterns,
      ctaStyle: dbPersona.ctaStyle,
      platforms: dbPersona.platforms
    }

    return new PersonaEngine(persona)
  }
}
