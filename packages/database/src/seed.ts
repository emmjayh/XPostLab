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
        variables: JSON.stringify(['topic']),
        tags: JSON.stringify(['engagement', 'question'])
      },
      {
        name: 'Contrarian Take',
        description: 'Challenge conventional wisdom',
        type: 'hook',
        platform: 'twitter',
        template: 'Unpopular opinion: {statement}',
        variables: JSON.stringify(['statement']),
        tags: JSON.stringify(['controversial', 'opinion'])
      },
      {
        name: 'Personal Story',
        description: 'Share a personal experience',
        type: 'hook',
        platform: 'twitter',
        template: '{timeframe} ago, I {experience}. Here\'s what I learned:',
        variables: JSON.stringify(['timeframe', 'experience']),
        tags: JSON.stringify(['personal', 'story', 'lesson'])
      },
      {
        name: 'List Thread',
        description: 'Numbered list format',
        type: 'full_post',
        platform: 'twitter',
        template: '{intro}\n\nThread 🧵\n\n{items}',
        variables: JSON.stringify(['intro', 'items']),
        tags: JSON.stringify(['thread', 'list', 'educational'])
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
      tone: JSON.stringify(['professional', 'insightful', 'approachable']),
      cadence: 'conversational',
      donts: JSON.stringify(['use corporate jargon', 'be overly promotional', 'post without value']),
      hookPatterns: JSON.stringify(['Question hooks', 'Personal stories', 'Contrarian takes']),
      ctaStyle: 'question-based',
      platforms: JSON.stringify({
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
      })
    }
  })

  const casualPersona = await prisma.persona.create({
    data: {
      name: 'Casual Thought Leader',
      description: 'Relaxed but authoritative voice for everyday insights',
      isDefault: false,
      userId: demoUser.id,
      tone: JSON.stringify(['casual', 'authentic', 'helpful']),
      cadence: 'concise',
      donts: JSON.stringify(['sound too formal', 'use big words unnecessarily', 'ignore questions']),
      hookPatterns: JSON.stringify(['Story hooks', 'Insight drops', 'Quick tips']),
      ctaStyle: 'soft',
      platforms: JSON.stringify({
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
      })
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