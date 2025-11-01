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
          id: 'persona-1',
          userId: effectiveUserId,
          name: 'Professional Coach',
          description: 'Expert business and leadership content',
          isDefault: true,
          tone: ['professional', 'insightful', 'authoritative'],
          cadence: 'detailed',
          donts: ['use slang', 'be overly casual'],
          hookPatterns: ['Data-driven insights', 'Industry observations'],
          ctaStyle: 'direct',
          platforms: { linkedin: { maxLength: 3000 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'persona-2', 
          userId: effectiveUserId,
          name: 'Casual Creator',
          description: 'Friendly, relatable social media personality',
          isDefault: false,
          tone: ['casual', 'friendly', 'humorous'],
          cadence: 'conversational',
          donts: ['be too formal', 'use corporate speak'],
          hookPatterns: ['Personal stories', 'Quick tips'],
          ctaStyle: 'question-based',
          platforms: { twitter: { maxLength: 280 } },
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
      // Return mock persona data for now
      const mockPersonas = [
        {
          id: 'persona-1',
          userId: 'dev-user',
          name: 'Professional Coach',
          description: 'Expert business and leadership content',
          isDefault: true,
          tone: ['professional', 'insightful', 'authoritative'],
          cadence: 'detailed',
          donts: ['use slang', 'be overly casual'],
          hookPatterns: ['Data-driven insights', 'Industry observations'],
          ctaStyle: 'direct',
          platforms: { linkedin: { maxLength: 3000 } },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'persona-2', 
          userId: 'dev-user',
          name: 'Casual Creator',
          description: 'Friendly, relatable social media personality',
          isDefault: false,
          tone: ['casual', 'friendly', 'humorous'],
          cadence: 'conversational',
          donts: ['be too formal', 'use corporate speak'],
          hookPatterns: ['Personal stories', 'Quick tips'],
          ctaStyle: 'question-based',
          platforms: { twitter: { maxLength: 280 } },
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