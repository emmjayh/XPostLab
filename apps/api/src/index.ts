import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { config } from 'dotenv'
import fs from 'fs'
import path from 'path'

// Load environment variables
config()

// Check for SSL certificates
const useHTTPS = process.env.USE_HTTPS === 'true' || process.env.NODE_ENV === 'production'
let httpsOptions: any = {}

if (useHTTPS) {
  try {
    const certPath = path.join(__dirname, '..', 'cert.pem')
    const keyPath = path.join(__dirname, '..', 'key.pem')
    
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      httpsOptions = {
        https: {
          cert: fs.readFileSync(certPath),
          key: fs.readFileSync(keyPath)
        }
      }
      console.log('🔒 SSL certificates found, enabling HTTPS')
    } else {
      console.log('⚠️ SSL certificates not found, falling back to HTTP')
    }
  } catch (error) {
    console.log('⚠️ Failed to load SSL certificates, falling back to HTTP:', error)
  }
}

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  },
  ...httpsOptions
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
  await fastify.register(import('./routes/auth'))
  await fastify.register(import('./routes/uploads'))
  await fastify.register(import('./routes/composer'))
  await fastify.register(import('./routes/personas'))
  await fastify.register(import('./routes/jobs'))
})

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8001')
    const host = process.env.HOST || '0.0.0.0'
    const protocol = useHTTPS && httpsOptions.https ? 'https' : 'http'
    
    // Skip database setup for now - will use mock data
    
    await fastify.listen({ port, host })
    
    fastify.log.info(`🚀 API server running at ${protocol}://${host}:${port}`)
    fastify.log.info(`📚 API docs available at ${protocol}://${host}:${port}/docs`)
    
    if (protocol === 'https') {
      fastify.log.info(`🔒 HTTPS enabled with self-signed certificate`)
      fastify.log.info(`🌐 External access: https://184.175.54.85:${port}`)
    }
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()