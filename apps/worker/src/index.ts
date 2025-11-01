import { config } from 'dotenv'
import { createConnection } from 'net'

// Load environment variables
config()

console.log('🚀 Starting AI Content Coach Worker...')

// Check if Redis is available
async function checkRedisConnection(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      timeout: 2000
    })

    socket.on('connect', () => {
      socket.end()
      resolve(true)
    })

    socket.on('error', () => {
      resolve(false)
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function startWorker() {
  console.log('📡 Checking Redis connection...')
  
  const redisAvailable = await checkRedisConnection()
  
  if (!redisAvailable) {
    console.log('⚠️  Redis not available - running in mock mode')
    console.log('💡 For full functionality, start Redis: redis-server')
    console.log('✅ Worker started in demo mode (no background jobs)')
    
    // Keep the process running in demo mode
    setInterval(() => {
      console.log('🔄 Worker running in demo mode - no Redis required')
    }, 30000) // Log every 30 seconds
    
    return
  }

  console.log('✅ Redis available - starting full worker mode')
  
  // Only import and start Redis-dependent services if Redis is available
  const { Worker, Queue } = await import('bullmq')
  const { prisma } = await import('@ai-content-coach/database')
  const { PersonaEngine } = await import('@ai-content-coach/shared')

  // Redis connection
  const redisConnection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  }

  // Content generation queue
  const contentQueue = new Queue('content-generation', {
    connection: redisConnection,
  })

  // Avatar generation queue
  const avatarQueue = new Queue('avatar-generation', {
    connection: redisConnection,
  })

  // Content generation worker
  const contentWorker = new Worker('content-generation', async (job) => {
    console.log(`📝 Processing content job ${job.id}:`, job.data.type)
    
    try {
      const { type, personaId, input, options } = job.data

      // Get persona from database
      const persona = await prisma.persona.findUnique({
        where: { id: personaId }
      })

      if (!persona) {
        throw new Error(`Persona ${personaId} not found`)
      }

      // Create persona engine
      const personaEngine = PersonaEngine.fromDatabasePersona(persona)

      // Process based on job type
      switch (type) {
        case 'BRAIN_DUMP':
        case 'COMPOSE':
          return await processContentGeneration(personaEngine, input, options)
        
        case 'REPLY_GENERATION':
          return await processReplyGeneration(personaEngine, input, options)
        
        case 'ALGO_ANALYSIS':
          return await processAlgoAnalysis(input)
        
        default:
          throw new Error(`Unknown job type: ${type}`)
      }

    } catch (error) {
      console.error(`❌ Content job ${job.id} failed:`, error)
      throw error
    }
  }, {
    connection: redisConnection,
    concurrency: 3,
  })

  // Avatar generation worker
  const avatarWorker = new Worker('avatar-generation', async (job) => {
    console.log(`🎬 Processing avatar job ${job.id}`)
    
    try {
      const { script, options } = job.data
      
      // Simulate avatar generation
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      return {
        success: true,
        videoUrl: 'https://example.com/generated-video.mp4',
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        duration: 30,
        size: 1024 * 1024 * 2
      }

    } catch (error) {
      console.error(`❌ Avatar job ${job.id} failed:`, error)
      throw error
    }
  }, {
    connection: redisConnection,
    concurrency: 2,
  })

  // Content generation processor
  async function processContentGeneration(personaEngine: any, input: any, options: any) {
    await new Promise(resolve => setTimeout(resolve, 2000))

    const variants = [
      {
        id: 'variant_1',
        content: `Processed: ${input.input}`,
        hook: "Here's what I learned",
        body: input.input,
        cta: "What are your thoughts?",
        hashtags: ['#contentcreation'],
        metadata: {
          length: input.input.length + 50,
          sentiment: 'positive',
          hookType: 'insight'
        }
      }
    ]

    return {
      success: true,
      variants,
      metadata: {
        personaUsed: 'demo-persona',
        processingTime: 2000,
        model: 'mock-llm'
      }
    }
  }

  // Reply generation processor
  async function processReplyGeneration(personaEngine: any, input: any, options: any) {
    await new Promise(resolve => setTimeout(resolve, 1500))

    return {
      success: true,
      replies: [
        {
          id: 'reply_1',
          content: `Great point! ${input.originalPost.content.slice(0, 50)}...`,
          metadata: {
            length: 80,
            replyType: 'supportive'
          }
        }
      ]
    }
  }

  // Algorithm analysis processor
  async function processAlgoAnalysis(input: any) {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const content = input.content
    const length = content.length
    const linkCount = (content.match(/https?:\/\//g) || []).length
    const hashtagCount = (content.match(/#\w+/g) || []).length

    let riskScore = 0
    let boostScore = 50

    if (length > 280) riskScore += 10
    if (length < 50) riskScore += 15
    if (linkCount > 2) riskScore += 20
    if (linkCount > 0) boostScore -= 5
    if (hashtagCount > 3) riskScore += 15
    if (hashtagCount === 1 || hashtagCount === 2) boostScore += 10

    const band = riskScore > 30 ? 'red' : riskScore > 15 ? 'yellow' : 'green'

    return {
      success: true,
      analysis: {
        riskScore: Math.min(100, riskScore),
        boostScore: Math.max(0, boostScore),
        band,
        suggestions: [
          {
            type: 'length',
            description: 'Consider shortening for better engagement',
            impact: 'medium',
            edit: 'Trim to under 280 characters'
          }
        ],
        factors: {
          linkDensity: linkCount,
          hashtagCount,
          length,
          sentiment: 'neutral',
          readability: 75
        }
      }
    }
  }

  // Error handlers
  contentWorker.on('completed', (job) => {
    console.log(`✅ Content job ${job.id} completed`)
  })

  contentWorker.on('failed', (job, err) => {
    console.log(`❌ Content job ${job?.id} failed:`, err.message)
  })

  avatarWorker.on('completed', (job) => {
    console.log(`✅ Avatar job ${job.id} completed`)
  })

  avatarWorker.on('failed', (job, err) => {
    console.log(`❌ Avatar job ${job?.id} failed:`, err.message)
  })

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down worker gracefully...')
    await contentWorker.close()
    await avatarWorker.close()
    await prisma.$disconnect()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down worker gracefully...')
    await contentWorker.close()
    await avatarWorker.close()
    await prisma.$disconnect()
    process.exit(0)
  })

  console.log('✅ Worker started successfully')
  console.log('📊 Monitoring queues: content-generation, avatar-generation')
}

// Graceful shutdown for demo mode
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down worker...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down worker...')
  process.exit(0)
})

startWorker().catch((error) => {
  console.error('❌ Failed to start worker:', error)
  process.exit(1)
})