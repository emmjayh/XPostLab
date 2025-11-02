import { FastifyPluginAsync } from 'fastify'
import { AuthService } from '../services/auth-service'
import { authenticate } from '../middleware/auth'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService()

  // Register endpoint
  fastify.post('/api/auth/register', {
    schema: {
      description: 'Register a new user',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          password: {
            type: 'string',
            minLength: 6,
            description: 'User password (min 6 characters)'
          },
          name: {
            type: 'string',
            description: 'User full name (optional)'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                createdAt: { type: 'string' }
              }
            },
            token: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password, name } = request.body as {
      email: string
      password: string
      name?: string
    }

    try {
      const result = await authService.register(email, password, name)
      return result
    } catch (error) {
      fastify.log.error({ error }, 'Registration failed')
      reply.code(400)
      return {
        error: error instanceof Error ? error.message : 'Registration failed'
      }
    }
  })

  // Login endpoint
  fastify.post('/api/auth/login', {
    schema: {
      description: 'Login with email and password',
      tags: ['Auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email'
          },
          password: {
            type: 'string'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                createdAt: { type: 'string' }
              }
            },
            token: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body as {
      email: string
      password: string
    }

    try {
      const result = await authService.login(email, password)
      return result
    } catch (error) {
      fastify.log.error({ error }, 'Login failed')
      reply.code(401)
      return {
        error: error instanceof Error ? error.message : 'Login failed'
      }
    }
  })

  // Get current user (requires authentication)
  fastify.get('/api/auth/me', {
    preHandler: authenticate,
    schema: {
      description: 'Get current authenticated user',
      tags: ['Auth'],
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: {
            type: 'string',
            description: 'Bearer token'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            image: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      if (!request.user) {
        reply.code(401)
        return { error: 'Not authenticated' }
      }

      const user = await authService.getUserById(request.user.id)
      return user
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get user')
      reply.code(500)
      return {
        error: error instanceof Error ? error.message : 'Failed to get user'
      }
    }
  })

  // Update profile (requires authentication)
  fastify.patch('/api/auth/profile', {
    preHandler: authenticate,
    schema: {
      description: 'Update user profile',
      tags: ['Auth'],
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: {
            type: 'string',
            description: 'Bearer token'
          }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          image: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { name, image } = request.body as {
      name?: string
      image?: string
    }

    try {
      if (!request.user) {
        reply.code(401)
        return { error: 'Not authenticated' }
      }

      const user = await authService.updateProfile(request.user.id, { name, image })
      return user
    } catch (error) {
      fastify.log.error({ error }, 'Failed to update profile')
      reply.code(500)
      return {
        error: error instanceof Error ? error.message : 'Failed to update profile'
      }
    }
  })
}

export default authRoutes
