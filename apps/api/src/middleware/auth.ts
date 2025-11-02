import { FastifyRequest, FastifyReply } from 'fastify'
import { AuthService } from '../services/auth-service'

const authService = new AuthService()

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      name?: string
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401)
      return reply.send({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Verify token
    const payload = authService.verifyToken(token)

    // Attach user to request
    request.user = payload

  } catch (error) {
    reply.code(401)
    return reply.send({ error: 'Invalid or expired token' })
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if missing
 */
export async function optionalAuthenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = authService.verifyToken(token)
      request.user = payload
    }
  } catch (error) {
    // Silently fail - user is just not authenticated
  }
}
