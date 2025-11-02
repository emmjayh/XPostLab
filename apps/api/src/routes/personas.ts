import { FastifyPluginAsync } from 'fastify'
// import { prisma } from '../lib' // Temporarily disabled for quick setup

const personasRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all personas for a user
  fastify.get('/api/personas', {
    schema: {
      description: 'Get all personas for the authenticated user',
      tags: ['Personas'],
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'User ID (temporary - will use auth token in production)'
          }
        }
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              isDefault: { type: 'boolean' },
              tone: { type: 'array', items: { type: 'string' } },
              cadence: { type: 'string' },
              hookPatterns: { type: 'array', items: { type: 'string' } },
              ctaStyle: { type: 'string' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { userId } = request.query as { userId?: string }

    // For development, use a default userId if none provided
    const effectiveUserId = userId || 'dev-user'

    try {
      // Return mock personas for now to get the API working
      const mockPersonas = [
        {
          id: 'tech-thought-leader',
          userId: effectiveUserId,
          name: 'Tech Thought Leader',
          description: 'Technical expert sharing data-driven insights and industry analysis',
          isDefault: true,
          tone: ['analytical', 'authoritative', 'insightful'],
          cadence: 'detailed',
          donts: ['use buzzwords without substance', 'make unfounded claims', 'oversimplify complex topics'],
          hookPatterns: ['Data reveals...', 'After analyzing 10,000+ cases...', 'The numbers tell a different story:'],
          ctaStyle: 'direct',
          platforms: { linkedin: { maxLength: 3000 }, twitter: { maxLength: 280 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'motivational-speaker',
          userId: effectiveUserId,
          name: 'Motivational Speaker',
          description: 'Inspirational voice that uplifts and energizes audiences',
          isDefault: false,
          tone: ['energetic', 'positive', 'encouraging'],
          cadence: 'conversational',
          donts: ['be negative or pessimistic', 'use complex jargon', 'sound preachy'],
          hookPatterns: ['You have the power to...', 'Today is YOUR day to...', 'Stop waiting. Start...'],
          ctaStyle: 'soft',
          platforms: { instagram: { maxLength: 2200 }, twitter: { maxLength: 280 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'storyteller',
          userId: effectiveUserId,
          name: 'Master Storyteller',
          description: 'Narrative-driven content that captivates through compelling stories',
          isDefault: false,
          tone: ['narrative', 'emotional', 'vivid'],
          cadence: 'detailed',
          donts: ['rush the story', 'be overly technical', 'skip emotional beats'],
          hookPatterns: ['It was 3 AM when...', 'Nobody told me that...', 'Five years ago, I...'],
          ctaStyle: 'soft',
          platforms: { linkedin: { maxLength: 3000 }, instagram: { maxLength: 2200 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'educator',
          userId: effectiveUserId,
          name: 'The Educator',
          description: 'Clear, structured teaching focused on practical takeaways',
          isDefault: false,
          tone: ['clear', 'structured', 'helpful'],
          cadence: 'detailed',
          donts: ['assume prior knowledge', 'use unexplained acronyms', 'be condescending'],
          hookPatterns: ['Here\'s what most people get wrong about...', '3 things you need to know:', 'Let me break this down:'],
          ctaStyle: 'direct',
          platforms: { linkedin: { maxLength: 3000 }, twitter: { maxLength: 280 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'contrarian',
          userId: effectiveUserId,
          name: 'The Contrarian',
          description: 'Provocative takes that challenge conventional wisdom',
          isDefault: false,
          tone: ['provocative', 'bold', 'challenging'],
          cadence: 'concise',
          donts: ['follow popular opinion', 'water down the message', 'be mean-spirited'],
          hookPatterns: ['Unpopular opinion:', 'Everyone is wrong about...', 'Hot take:'],
          ctaStyle: 'question-based',
          platforms: { twitter: { maxLength: 280 }, linkedin: { maxLength: 3000 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'entertainer',
          userId: effectiveUserId,
          name: 'The Entertainer',
          description: 'Witty, humorous content that makes people smile and share',
          isDefault: false,
          tone: ['witty', 'playful', 'humorous'],
          cadence: 'conversational',
          donts: ['take yourself too seriously', 'be offensive', 'force jokes'],
          hookPatterns: ['Plot twist:', 'Nobody:', 'Can we talk about how...'],
          ctaStyle: 'question-based',
          platforms: { twitter: { maxLength: 280 }, instagram: { maxLength: 2200 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'minimalist',
          userId: effectiveUserId,
          name: 'The Minimalist',
          description: 'Direct, no-fluff content that gets straight to the point',
          isDefault: false,
          tone: ['direct', 'concise', 'clear'],
          cadence: 'concise',
          donts: ['use filler words', 'add unnecessary details', 'ramble'],
          hookPatterns: ['The truth:', 'Here\'s the deal:', 'Bottom line:'],
          ctaStyle: 'direct',
          platforms: { twitter: { maxLength: 280 }, linkedin: { maxLength: 3000 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      return mockPersonas
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch personas')
      reply.code(500)
      return { error: 'Failed to fetch personas' }
    }
  })

  // Get a specific persona
  fastify.get('/api/personas/:personaId', {
    schema: {
      description: 'Get a specific persona by ID',
      tags: ['Personas'],
      params: {
        type: 'object',
        required: ['personaId'],
        properties: {
          personaId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { personaId } = request.params as { personaId: string }

    try {
      // Return mock persona data for now (same as GET all personas)
      const mockPersonas = [
        {
          id: 'tech-thought-leader',
          userId: 'dev-user',
          name: 'Tech Thought Leader',
          description: 'Technical expert sharing data-driven insights and industry analysis',
          isDefault: true,
          tone: ['analytical', 'authoritative', 'insightful'],
          cadence: 'detailed',
          donts: ['use buzzwords without substance', 'make unfounded claims', 'oversimplify complex topics'],
          hookPatterns: ['Data reveals...', 'After analyzing 10,000+ cases...', 'The numbers tell a different story:'],
          ctaStyle: 'direct',
          platforms: { linkedin: { maxLength: 3000 }, twitter: { maxLength: 280 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'motivational-speaker',
          userId: 'dev-user',
          name: 'Motivational Speaker',
          description: 'Inspirational voice that uplifts and energizes audiences',
          isDefault: false,
          tone: ['energetic', 'positive', 'encouraging'],
          cadence: 'conversational',
          donts: ['be negative or pessimistic', 'use complex jargon', 'sound preachy'],
          hookPatterns: ['You have the power to...', 'Today is YOUR day to...', 'Stop waiting. Start...'],
          ctaStyle: 'soft',
          platforms: { instagram: { maxLength: 2200 }, twitter: { maxLength: 280 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'storyteller',
          userId: 'dev-user',
          name: 'Master Storyteller',
          description: 'Narrative-driven content that captivates through compelling stories',
          isDefault: false,
          tone: ['narrative', 'emotional', 'vivid'],
          cadence: 'detailed',
          donts: ['rush the story', 'be overly technical', 'skip emotional beats'],
          hookPatterns: ['It was 3 AM when...', 'Nobody told me that...', 'Five years ago, I...'],
          ctaStyle: 'soft',
          platforms: { linkedin: { maxLength: 3000 }, instagram: { maxLength: 2200 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'educator',
          userId: 'dev-user',
          name: 'The Educator',
          description: 'Clear, structured teaching focused on practical takeaways',
          isDefault: false,
          tone: ['clear', 'structured', 'helpful'],
          cadence: 'detailed',
          donts: ['assume prior knowledge', 'use unexplained acronyms', 'be condescending'],
          hookPatterns: ['Here\'s what most people get wrong about...', '3 things you need to know:', 'Let me break this down:'],
          ctaStyle: 'direct',
          platforms: { linkedin: { maxLength: 3000 }, twitter: { maxLength: 280 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'contrarian',
          userId: 'dev-user',
          name: 'The Contrarian',
          description: 'Provocative takes that challenge conventional wisdom',
          isDefault: false,
          tone: ['provocative', 'bold', 'challenging'],
          cadence: 'concise',
          donts: ['follow popular opinion', 'water down the message', 'be mean-spirited'],
          hookPatterns: ['Unpopular opinion:', 'Everyone is wrong about...', 'Hot take:'],
          ctaStyle: 'question-based',
          platforms: { twitter: { maxLength: 280 }, linkedin: { maxLength: 3000 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'entertainer',
          userId: 'dev-user',
          name: 'The Entertainer',
          description: 'Witty, humorous content that makes people smile and share',
          isDefault: false,
          tone: ['witty', 'playful', 'humorous'],
          cadence: 'conversational',
          donts: ['take yourself too seriously', 'be offensive', 'force jokes'],
          hookPatterns: ['Plot twist:', 'Nobody:', 'Can we talk about how...'],
          ctaStyle: 'question-based',
          platforms: { twitter: { maxLength: 280 }, instagram: { maxLength: 2200 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'minimalist',
          userId: 'dev-user',
          name: 'The Minimalist',
          description: 'Direct, no-fluff content that gets straight to the point',
          isDefault: false,
          tone: ['direct', 'concise', 'clear'],
          cadence: 'concise',
          donts: ['use filler words', 'add unnecessary details', 'ramble'],
          hookPatterns: ['The truth:', 'Here\'s the deal:', 'Bottom line:'],
          ctaStyle: 'direct',
          platforms: { twitter: { maxLength: 280 }, linkedin: { maxLength: 3000 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]

      const persona = mockPersonas.find(p => p.id === personaId)

      if (!persona) {
        reply.code(404)
        return { error: 'Persona not found' }
      }

      return persona
    } catch (error) {
      fastify.log.error({ error }, 'Failed to fetch persona')
      reply.code(500)
      return { error: 'Failed to fetch persona' }
    }
  })

  // Create a new persona
  fastify.post('/api/personas', {
    schema: {
      description: 'Create a new persona',
      tags: ['Personas'],
      body: {
        type: 'object',
        required: ['name', 'userId', 'tone', 'cadence', 'ctaStyle'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          userId: { type: 'string' },
          tone: { type: 'array', items: { type: 'string' } },
          cadence: { type: 'string', enum: ['concise', 'detailed', 'conversational'] },
          donts: { type: 'array', items: { type: 'string' } },
          hookPatterns: { type: 'array', items: { type: 'string' } },
          ctaStyle: { type: 'string', enum: ['direct', 'soft', 'question-based'] },
          isDefault: { type: 'boolean', default: false },
          platforms: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as {
      name: string
      description?: string
      userId: string
      tone: string[]
      cadence: 'concise' | 'detailed' | 'conversational'
      donts?: string[]
      hookPatterns?: string[]
      ctaStyle: 'direct' | 'soft' | 'question-based'
      isDefault?: boolean
      platforms?: any
    }

    try {
      // Return mock created persona for now
      const newPersona = {
        id: `persona-${Date.now()}`,
        userId: body.userId,
        name: body.name,
        description: body.description,
        isDefault: body.isDefault || false,
        tone: body.tone,
        cadence: body.cadence,
        donts: body.donts || [],
        hookPatterns: body.hookPatterns || [],
        ctaStyle: body.ctaStyle,
        platforms: body.platforms || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      return newPersona
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create persona')
      reply.code(500)
      return { error: 'Failed to create persona' }
    }
  })
}

export default personasRoutes