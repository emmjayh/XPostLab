import { prisma } from './database'

export async function createDemoPersonas() {
  try {
    // Check if demo personas already exist
    const existing = await prisma.persona.findFirst({
      where: { userId: 'dev-user' }
    })

    if (existing) {
      console.log('Demo personas already exist')
      return
    }

    // Create demo personas
    const demoPersonas = [
      {
        userId: 'dev-user',
        name: 'Professional Coach',
        description: 'Expert business and leadership content',
        isDefault: true,
        tone: ['professional', 'insightful', 'authoritative'],
        cadence: 'detailed',
        donts: ['use slang', 'be overly casual', 'make unsubstantiated claims'],
        hookPatterns: ['Data-driven insights', 'Industry observations', 'Leadership lessons'],
        ctaStyle: 'direct',
        platforms: {
          linkedin: { maxLength: 3000, hashtags: true },
          twitter: { maxLength: 280, hashtags: false }
        }
      },
      {
        userId: 'dev-user',
        name: 'Casual Creator',
        description: 'Friendly, relatable social media personality',
        isDefault: false,
        tone: ['casual', 'friendly', 'humorous'],
        cadence: 'conversational',
        donts: ['be too formal', 'use corporate speak', 'sound robotic'],
        hookPatterns: ['Personal stories', 'Relatable experiences', 'Quick tips'],
        ctaStyle: 'question-based',
        platforms: {
          twitter: { maxLength: 280, hashtags: true },
          instagram: { maxLength: 2200, hashtags: true }
        }
      },
      {
        userId: 'dev-user',
        name: 'Tech Thought Leader',
        description: 'Innovation and technology expert',
        isDefault: false,
        tone: ['innovative', 'analytical', 'forward-thinking'],
        cadence: 'detailed',
        donts: ['oversimplify complex topics', 'use outdated references', 'ignore nuance'],
        hookPatterns: ['Future predictions', 'Technology trends', 'Industry disruption'],
        ctaStyle: 'soft',
        platforms: {
          linkedin: { maxLength: 3000, hashtags: true },
          twitter: { maxLength: 280, hashtags: true }
        }
      }
    ]

    for (const persona of demoPersonas) {
      await prisma.persona.create({
        data: persona
      })
    }

    console.log('✅ Created demo personas successfully')
  } catch (error) {
    console.error('❌ Error creating demo personas:', error)
  }
}