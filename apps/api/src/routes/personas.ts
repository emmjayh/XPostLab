import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib'

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

    if (!userId) {
      reply.code(400)
      return { error: 'userId is required' }
    }

    try {
      const personas = await prisma.persona.findMany({
        where: { userId },
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' }
        ]
      })

      return personas
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
      const persona = await prisma.persona.findUnique({
        where: { id: personaId }
      })

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
      // If this is set as default, unset other defaults
      if (body.isDefault) {
        await prisma.persona.updateMany({
          where: { userId: body.userId, isDefault: true },
          data: { isDefault: false }
        })
      }

      const persona = await prisma.persona.create({
        data: {
          name: body.name,
          description: body.description,
          userId: body.userId,
          tone: body.tone,
          cadence: body.cadence,
          donts: body.donts || [],
          hookPatterns: body.hookPatterns || [],
          ctaStyle: body.ctaStyle,
          isDefault: body.isDefault || false,
          platforms: body.platforms || {}
        }
      })

      return persona
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create persona')
      reply.code(500)
      return { error: 'Failed to create persona' }
    }
  })
}

export default personasRoutes