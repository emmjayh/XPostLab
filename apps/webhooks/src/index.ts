import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { config } from 'dotenv'
import { prisma } from '@ai-content-coach/database'

// Load environment variables
config()

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
})

// Register plugins
fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.WEB_URL || 'https://ai-content-coach.railway.app']
    : true
})

fastify.register(helmet)

// Health check
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    service: 'webhooks',
    timestamp: new Date().toISOString() 
  }
})

// Avatar provider webhooks (D-ID, HeyGen, etc.)
fastify.post('/webhooks/avatar/did', {
  schema: {
    body: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        status: { type: 'string' },
        result_url: { type: 'string' },
        error: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  const body = request.body as {
    id: string
    status: string
    result_url?: string
    error?: string
  }

  fastify.log.info({ body }, 'Received D-ID webhook')

  try {
    // Find the corresponding job in our database
    const job = await prisma.job.findFirst({
      where: {
        type: 'AVATAR_GENERATION',
        // For demo purposes, we'll search by the body ID in a simple way
        // In production, you'd store the external ID in a structured way
      }
    })

    if (!job) {
      fastify.log.warn(`No job found for D-ID ID: ${body.id}`)
      return { received: true }
    }

    // Update job status based on webhook
    if (body.status === 'done' && body.result_url) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          output: body.result_url,
          updatedAt: new Date()
        }
      })
      
      fastify.log.info(`Avatar job ${job.id} completed`)
      
    } else if (body.status === 'error') {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: body.error || 'Avatar generation failed',
          updatedAt: new Date()
        }
      })
      
      fastify.log.error({ error: body.error }, `Avatar job ${job.id} failed`)
    }

    return { received: true }

  } catch (error) {
    fastify.log.error({ error }, 'Failed to process D-ID webhook')
    reply.code(500)
    return { error: 'Failed to process webhook' }
  }
})

// HeyGen webhook
fastify.post('/webhooks/avatar/heygen', {
  schema: {}
}, async (request, reply) => {
  const body = request.body as any

  fastify.log.info({ body }, 'Received HeyGen webhook')

  try {
    // Similar processing logic for HeyGen
    // Implementation would depend on HeyGen's webhook format
    
    return { received: true }

  } catch (error) {
    fastify.log.error({ error }, 'Failed to process HeyGen webhook')
    reply.code(500)
    return { error: 'Failed to process webhook' }
  }
})

// Twitter/X API webhooks (for account monitoring)
fastify.post('/webhooks/twitter/mentions', {
  schema: {}
}, async (request, reply) => {
  const body = request.body as any

  fastify.log.info({ body }, 'Received Twitter webhook')

  try {
    // Process Twitter mentions for automated reply suggestions
    // This would trigger Reply Guy jobs for monitored accounts
    
    return { received: true }

  } catch (error) {
    fastify.log.error({ error }, 'Failed to process Twitter webhook')
    reply.code(500)
    return { error: 'Failed to process webhook' }
  }
})

// Generic external service webhook
fastify.post('/webhooks/external/:provider/:jobId', {
  schema: {
    params: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
        jobId: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  const { provider, jobId } = request.params as { provider: string; jobId: string }
  const body = request.body as any

  fastify.log.info({ body, provider, jobId }, `Received ${provider} webhook for job ${jobId}`)

  try {
    // Find and update the job
    const job = await prisma.job.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      reply.code(404)
      return { error: 'Job not found' }
    }

    // Update based on webhook content
    // This is a generic handler - specific providers would have custom logic
    
    return { received: true, jobId, provider }

  } catch (error) {
    fastify.log.error({ error, provider }, `Failed to process ${provider} webhook`)
    reply.code(500)
    return { error: 'Failed to process webhook' }
  }
})

// Webhook verification endpoint (for providers that require it)
fastify.get('/webhooks/verify/:provider', {
  schema: {
    params: {
      type: 'object',
      properties: {
        provider: { type: 'string' }
      }
    },
    querystring: {
      type: 'object',
      properties: {
        challenge: { type: 'string' },
        token: { type: 'string' }
      }
    }
  }
}, async (request, reply) => {
  const { provider } = request.params as { provider: string }
  const { challenge, token } = request.query as { challenge?: string; token?: string }

  fastify.log.info({ challenge, token, provider }, `Webhook verification for ${provider}`)

  // Verify token if required by provider
  const expectedToken = process.env[`${provider.toUpperCase()}_WEBHOOK_TOKEN`]
  
  if (expectedToken && token !== expectedToken) {
    reply.code(403)
    return { error: 'Invalid verification token' }
  }

  // Return challenge for verification (common pattern)
  if (challenge) {
    return { challenge }
  }

  return { verified: true, provider }
})

// Job status webhook (internal - for notifying web app of completed jobs)
fastify.post('/webhooks/internal/job-complete', {
  schema: {}
}, async (request, reply) => {
  const body = request.body as {
    jobId: string
    userId: string
    status: string
    result?: any
  }

  fastify.log.info({ body }, 'Job completion notification')

  try {
    // Here you could trigger real-time notifications to the web app
    // via WebSockets, Server-Sent Events, or push notifications
    
    // For now, just log the completion
    fastify.log.info(`Notifying user ${body.userId} that job ${body.jobId} is ${body.status}`)
    
    return { notified: true }

  } catch (error) {
    fastify.log.error({ error }, 'Failed to send job completion notification')
    reply.code(500)
    return { error: 'Failed to send notification' }
  }
})

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8001')
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port, host })
    
    fastify.log.info(`🎣 Webhooks server running at http://${host}:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('🛑 Shutting down webhooks server...')
  await fastify.close()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  fastify.log.info('🛑 Shutting down webhooks server...')
  await fastify.close()
  await prisma.$disconnect()
  process.exit(0)
})

start()