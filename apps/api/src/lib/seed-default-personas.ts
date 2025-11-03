import { prisma } from './database'

export const defaultPersonas = [
  {
    id: 'tech-thought-leader',
    name: 'Tech Thought Leader',
    description: 'Technical expert sharing data-driven insights and industry analysis',
    isDefault: true,
    tone: ['analytical', 'authoritative', 'insightful'],
    cadence: 'detailed',
    donts: ['use buzzwords without substance', 'make unfounded claims', 'oversimplify complex topics'],
    hookPatterns: ['Data reveals...', 'After analyzing 10,000+ cases...', 'The numbers tell a different story:'],
    ctaStyle: 'direct',
    platforms: { linkedin: { maxLength: 3000 }, twitter: { maxLength: 280 } }
  },
  {
    id: 'motivational-speaker',
    name: 'Motivational Speaker',
    description: 'Inspirational voice that uplifts and energizes audiences',
    isDefault: false,
    tone: ['energetic', 'positive', 'encouraging'],
    cadence: 'conversational',
    donts: ['be negative or pessimistic', 'use complex jargon', 'sound preachy'],
    hookPatterns: ['You have the power to...', 'Today is YOUR day to...', 'Stop waiting. Start...'],
    ctaStyle: 'soft',
    platforms: { instagram: { maxLength: 2200 }, twitter: { maxLength: 280 } }
  },
  {
    id: 'master-storyteller',
    name: 'Master Storyteller',
    description: 'Narrative-driven content that captivates through compelling stories',
    isDefault: false,
    tone: ['narrative', 'emotional', 'vivid'],
    cadence: 'detailed',
    donts: ['rush the story', 'be overly technical', 'skip emotional beats'],
    hookPatterns: ['It was 3 AM when...', 'Nobody told me that...', 'Five years ago, I...'],
    ctaStyle: 'soft',
    platforms: { linkedin: { maxLength: 3000 }, instagram: { maxLength: 2200 } }
  },
  {
    id: 'the-educator',
    name: 'The Educator',
    description: 'Clear, structured teaching focused on practical takeaways',
    isDefault: false,
    tone: ['clear', 'structured', 'helpful'],
    cadence: 'detailed',
    donts: ['assume prior knowledge', 'use unexplained acronyms', 'be condescending'],
    hookPatterns: ['Here\'s what most people get wrong about...', '3 things you need to know:', 'Let me break this down:'],
    ctaStyle: 'direct',
    platforms: { linkedin: { maxLength: 3000 }, twitter: { maxLength: 280 } }
  },
  {
    id: 'the-contrarian',
    name: 'The Contrarian',
    description: 'Provocative takes that challenge conventional wisdom',
    isDefault: false,
    tone: ['provocative', 'bold', 'challenging'],
    cadence: 'concise',
    donts: ['follow popular opinion', 'water down the message', 'be mean-spirited'],
    hookPatterns: ['Unpopular opinion:', 'Everyone is wrong about...', 'Hot take:'],
    ctaStyle: 'question-based',
    platforms: { twitter: { maxLength: 280 }, linkedin: { maxLength: 3000 } }
  },
  {
    id: 'the-entertainer',
    name: 'The Entertainer',
    description: 'Witty, humorous content that makes people smile and share',
    isDefault: false,
    tone: ['witty', 'playful', 'humorous'],
    cadence: 'conversational',
    donts: ['take yourself too seriously', 'be offensive', 'force jokes'],
    hookPatterns: ['Plot twist:', 'Nobody:', 'Can we talk about how...'],
    ctaStyle: 'question-based',
    platforms: { twitter: { maxLength: 280 }, instagram: { maxLength: 2200 } }
  },
  {
    id: 'the-minimalist',
    name: 'The Minimalist',
    description: 'Direct, no-fluff content that gets straight to the point',
    isDefault: false,
    tone: ['direct', 'concise', 'clear'],
    cadence: 'concise',
    donts: ['use filler words', 'add unnecessary details', 'ramble'],
    hookPatterns: ['The truth:', 'Here\'s the deal:', 'Bottom line:'],
    ctaStyle: 'direct',
    platforms: { twitter: { maxLength: 280 }, linkedin: { maxLength: 3000 } }
  }
]

/**
 * Seed default personas for a new user
 */
export async function seedDefaultPersonas(userId: string) {
  const personas = await prisma.persona.createMany({
    data: defaultPersonas.map(p => ({
      id: p.id,
      userId,
      name: p.name,
      description: p.description,
      isDefault: p.isDefault,
      tone: JSON.stringify(p.tone),
      cadence: p.cadence,
      donts: JSON.stringify(p.donts),
      hookPatterns: JSON.stringify(p.hookPatterns),
      ctaStyle: p.ctaStyle,
      platforms: JSON.stringify(p.platforms)
    })),
    skipDuplicates: true
  })

  return personas
}
