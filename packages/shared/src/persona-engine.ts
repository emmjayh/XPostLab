import { Persona, ContentRequest, ContentVariant, GenerationResult } from './types'

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

STRICT RULES (NEVER violate these):
${this.persona.donts.map(dont => `- DO NOT ${dont}`).join('\n')}

VOICE GUIDELINES:
- Match the specified tone and cadence exactly
- Use the preferred hook patterns when appropriate
- End with CTAs that match the specified style
- Keep content authentic and valuable, never generic
`)

    this.templates.set('composer_prompt', `
Create {variants} unique social media posts from this brain dump or idea:

INPUT: {input}
PLATFORM: {platform}
MAX LENGTH: {maxLength}

For each variant, provide:
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

Make each variant unique in approach while maintaining the persona's voice.
`)

    this.templates.set('reply_prompt', `
Generate {variants} sharp, value-adding replies to this post:

ORIGINAL POST: {originalPost}
AUTHOR: {author}
GOAL: {replyGoal}

Create replies that:
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

    return template
      .replace('{variants}', request.options.variants?.toString() || '3')
      .replace('{input}', request.input)
      .replace('{platform}', request.platform)
      .replace('{maxLength}', this.getPlatformMaxLength(request.platform, request.options.maxLength).toString())
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
    const filteredVariants: ContentVariant[] = []
    const errors: string[] = []

    for (const variant of variants) {
      // Check length
      if (variant.content.length > maxLength) {
        errors.push(`Variant ${variant.id} exceeds ${maxLength} character limit`)
        continue
      }

      // Check for don'ts violations
      const violations = this.checkDontsViolations(variant.content)
      if (violations.length > 0) {
        errors.push(`Variant ${variant.id} violates rules: ${violations.join(', ')}`)
        continue
      }

      // Add metadata
      variant.metadata.length = variant.content.length
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

  private checkDontsViolations(content: string): string[] {
    const violations: string[] = []
    const lowerContent = content.toLowerCase()

    for (const dont of this.persona.donts) {
      // Simple keyword matching - could be enhanced with NLP
      const keywords = dont.toLowerCase().split(' ')
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        violations.push(dont)
      }
    }

    return violations
  }

  // Static method to create engine from database persona
  static fromDatabasePersona(dbPersona: any): PersonaEngine {
    const persona: Persona = {
      id: dbPersona.id,
      name: dbPersona.name,
      description: dbPersona.description,
      tone: typeof dbPersona.tone === 'string' ? JSON.parse(dbPersona.tone) : dbPersona.tone,
      cadence: dbPersona.cadence,
      donts: typeof dbPersona.donts === 'string' ? JSON.parse(dbPersona.donts) : dbPersona.donts,
      hookPatterns: typeof dbPersona.hookPatterns === 'string' ? JSON.parse(dbPersona.hookPatterns) : dbPersona.hookPatterns,
      ctaStyle: dbPersona.ctaStyle,
      platforms: typeof dbPersona.platforms === 'string' ? JSON.parse(dbPersona.platforms) : dbPersona.platforms
    }

    return new PersonaEngine(persona)
  }
}