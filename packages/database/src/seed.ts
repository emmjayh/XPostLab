import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create sample templates
  await prisma.template.createMany({
    data: [
      {
        name: 'Question Hook',
        description: 'Engaging question to start a post',
        type: 'hook',
        platform: 'twitter',
        template: 'What if {topic}?',
        variables: ['topic'],
        tags: ['engagement', 'question']
      },
      {
        name: 'Contrarian Take',
        description: 'Challenge conventional wisdom',
        type: 'hook',
        platform: 'twitter',
        template: 'Unpopular opinion: {statement}',
        variables: ['statement'],
        tags: ['controversial', 'opinion']
      },
      {
        name: 'Personal Story',
        description: 'Share a personal experience',
        type: 'hook',
        platform: 'twitter',
        template: '{timeframe} ago, I {experience}. Here\'s what I learned:',
        variables: ['timeframe', 'experience'],
        tags: ['personal', 'story', 'lesson']
      },
      {
        name: 'List Thread',
        description: 'Numbered list format',
        type: 'full_post',
        platform: 'twitter',
        template: '{intro}\n\nThread 🧵\n\n{items}',
        variables: ['intro', 'items'],
        tags: ['thread', 'list', 'educational']
      }
    ]
  })

  // Create demo user
  const demoUser = await prisma.user.create({
    data: {
      id: 'demo-user-1',
      email: 'demo@aicontentcoach.com',
      name: 'Demo User',
      image: null
    }
  })

  // Create sample personas
  const defaultPersona = await prisma.persona.create({
    data: {
      name: 'Professional Creator',
      description: 'Balanced professional voice with personal insights',
      isDefault: true,
      userId: demoUser.id,
      tone: ['professional', 'insightful', 'approachable'],
      cadence: 'conversational',
      donts: ['use corporate jargon', 'be overly promotional', 'post without value'],
      hookPatterns: ['Question hooks', 'Personal stories', 'Contrarian takes'],
      ctaStyle: 'question-based',
      platforms: {
        twitter: {
          maxLength: 280,
          preferredHashtags: 2,
          threadPreference: true
        },
        linkedin: {
          maxLength: 3000,
          professionalTone: true,
          includeCallToAction: true
        }
      }
    }
  })

  const casualPersona = await prisma.persona.create({
    data: {
      name: 'Casual Thought Leader',
      description: 'Relaxed but authoritative voice for everyday insights',
      isDefault: false,
      userId: demoUser.id,
      tone: ['casual', 'authentic', 'helpful'],
      cadence: 'concise',
      donts: ['sound too formal', 'use big words unnecessarily', 'ignore questions'],
      hookPatterns: ['Story hooks', 'Insight drops', 'Quick tips'],
      ctaStyle: 'soft',
      platforms: {
        twitter: {
          maxLength: 280,
          preferredHashtags: 1,
          threadPreference: false
        },
        linkedin: {
          maxLength: 1500,
          professionalTone: false,
          includeCallToAction: true
        }
      }
    }
  })

  console.log('✅ Database seeded successfully!')
  console.log(`Created user: ${demoUser.name}`)
  console.log(`Created personas: ${defaultPersona.name}, ${casualPersona.name}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })