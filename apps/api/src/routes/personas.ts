import { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/database'
import { defaultPersonas } from '../lib/seed-default-personas'
import { authenticate, optionalAuthenticate } from '../middleware/auth'

const DEMO_USER_ID = 'dev-user'

function serializePersonaRecord(persona: any) {
  return {
    id: persona.id,
    userId: persona.userId,
    name: persona.name,
    description: persona.description,
    isDefault: persona.isDefault,
    tone: safeParse(persona.tone, []),
    cadence: persona.cadence,
    donts: safeParse(persona.donts, []),
    hookPatterns: safeParse(persona.hookPatterns, []),
    ctaStyle: persona.ctaStyle,
    platforms: safeParse(persona.platforms, {}),
    createdAt: persona.createdAt?.toISOString?.() ?? persona.createdAt,
    updatedAt: persona.updatedAt?.toISOString?.() ?? persona.updatedAt,
  }
}

function serializeSeedPersona(seed: (typeof defaultPersonas)[number]) {
  const now = new Date().toISOString()
  return {
    id: seed.id,
    userId: DEMO_USER_ID,
    name: seed.name,
    description: seed.description,
    isDefault: seed.isDefault,
    tone: seed.tone,
    cadence: seed.cadence,
    donts: seed.donts,
    hookPatterns: seed.hookPatterns,
    ctaStyle: seed.ctaStyle,
    platforms: seed.platforms,
    createdAt: now,
    updatedAt: now,
  }
}

function safeParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const personasRoutes: FastifyPluginAsync = async (fastify) => {
  // Get all personas for a user
  fastify.get('/api/personas', {
    preHandler: optionalAuthenticate,
    schema: {
      description: 'Get all personas for the authenticated user',
      tags: ['Personas'],
      querystring: {
        type: 'object',
        properties: {
          userId: {
            type: 'string',
            description: 'User ID (used only for demo mode)',
          },
        },
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
              donts: { type: 'array', items: { type: 'string' } },
              hookPatterns: { type: 'array', items: { type: 'string' } },
              ctaStyle: { type: 'string' },
              platforms: { type: 'object' },
              createdAt: { type: 'string' },
              updatedAt: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { userId: queryUserId } = request.query as { userId?: string }
    const authUserId = request.user?.id

    if (!authUserId) {
      if (!queryUserId || queryUserId === DEMO_USER_ID) {
        return defaultPersonas.map(serializeSeedPersona)
      }
      reply.code(401)
      return { error: 'Authentication required' }
    }

    const personas = await prisma.persona.findMany({
      where: { userId: authUserId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })

    if (!personas.length) {
      return defaultPersonas.map(serializeSeedPersona)
    }

    return personas.map(serializePersonaRecord)
  })

  // Get a specific persona
  fastify.get('/api/personas/:personaId', {
    preHandler: optionalAuthenticate,
    schema: {
      description: 'Get a specific persona by ID',
      tags: ['Personas'],
      params: {
        type: 'object',
        required: ['personaId'],
        properties: {
          personaId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const { personaId } = request.params as { personaId: string }
    const authUserId = request.user?.id

    if (authUserId) {
      const persona = await prisma.persona.findFirst({
        where: {
          id: personaId,
          userId: authUserId,
        },
      })

      if (!persona) {
        reply.code(404)
        return { error: 'Persona not found' }
      }

      return serializePersonaRecord(persona)
    }

    const seedPersona = defaultPersonas.find((persona) => persona.id === personaId)
    if (seedPersona) {
      return serializeSeedPersona(seedPersona)
    }

    reply.code(404)
    return { error: 'Persona not found' }
  })

  // Create a new persona
  fastify.post('/api/personas', {
    preHandler: authenticate,
    schema: {
      description: 'Create a new persona',
      tags: ['Personas'],
      body: {
        type: 'object',
        required: ['name', 'tone', 'cadence', 'ctaStyle'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          tone: { type: 'array', items: { type: 'string' } },
          cadence: { type: 'string', enum: ['concise', 'detailed', 'conversational'] },
          donts: { type: 'array', items: { type: 'string' } },
          hookPatterns: { type: 'array', items: { type: 'string' } },
          ctaStyle: { type: 'string', enum: ['direct', 'soft', 'question-based'] },
          isDefault: { type: 'boolean', default: false },
          platforms: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    if (!request.user) {
      reply.code(401)
      return { error: 'Not authenticated' }
    }

    const body = request.body as {
      name: string
      description?: string
      tone: string[]
      cadence: 'concise' | 'detailed' | 'conversational'
      donts?: string[]
      hookPatterns?: string[]
      ctaStyle: 'direct' | 'soft' | 'question-based'
      isDefault?: boolean
      platforms?: Record<string, unknown>
    }

    if (!Array.isArray(body.tone) || body.tone.length === 0) {
      reply.code(400)
      return { error: 'Tone must include at least one descriptor' }
    }

    if (body.isDefault) {
      await prisma.persona.updateMany({
        where: { userId: request.user.id },
        data: { isDefault: false },
      })
    }

    const persona = await prisma.persona.create({
      data: {
        userId: request.user.id,
        name: body.name,
        description: body.description,
        isDefault: body.isDefault ?? false,
        tone: JSON.stringify(body.tone),
        cadence: body.cadence,
        donts: JSON.stringify(body.donts ?? []),
        hookPatterns: JSON.stringify(body.hookPatterns ?? []),
        ctaStyle: body.ctaStyle,
        platforms: JSON.stringify(body.platforms ?? {}),
      },
    })

    reply.code(201)
    return serializePersonaRecord(persona)
  })
}

export default personasRoutes
