import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { config } from 'dotenv'

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

fastify.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'AI Content Coach API',
      description: 'API for AI-powered content creation and coaching',
      version: '0.1.0'
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:8000',
        description: 'Development server'
      }
    ]
  }
})

fastify.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
})

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Register routes
fastify.register(async function (fastify) {
  await fastify.register(import('./routes/composer'))
  await fastify.register(import('./routes/personas'))
  await fastify.register(import('./routes/jobs'))
})

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000')
    const host = process.env.HOST || '0.0.0.0'
    
    // Create demo personas on startup (development only)
    if (process.env.NODE_ENV !== 'production') {
      const { createDemoPersonas } = await import('./lib/create-demo-personas')
      await createDemoPersonas()
    }
    
    await fastify.listen({ port, host })
    
    fastify.log.info(`🚀 API server running at http://${host}:${port}`)
    fastify.log.info(`📚 API docs available at http://${host}:${port}/docs`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()