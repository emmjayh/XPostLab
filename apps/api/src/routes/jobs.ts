import { FastifyPluginAsync } from 'fastify'
import { JobService } from '../services/job-service'

const jobsRoutes: FastifyPluginAsync = async (fastify) => {
  const jobService = new JobService()

  // Get jobs for user
  fastify.get('/api/jobs', {
    schema: {
      description: 'Get jobs for the authenticated user',
      tags: ['Jobs'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string' },
          status: { 
            type: 'string',
            enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']
          },
          limit: { type: 'number', default: 20 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { userId, status, limit = 20, offset = 0 } = request.query as {
      userId?: string
      status?: any
      limit?: number
      offset?: number
    }

    try {
      if (!userId) {
        // Return demo jobs for testing
        return [
          {
            id: 'demo-job-1',
            type: 'BRAIN_DUMP',
            status: 'COMPLETED',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            result: {
              variants: [
                {
                  id: 'variant_1',
                  content: 'Demo content variant 1',
                  metadata: { length: 25 }
                }
              ]
            }
          }
        ]
      }

      const jobs = await jobService.getJobsByUser(userId, status)
      return jobs
    } catch (error) {
      fastify.log.error('Failed to fetch jobs:', error)
      reply.code(500)
      return { error: 'Failed to fetch jobs' }
    }
  })

  // Get specific job
  fastify.get('/api/jobs/:jobId', {
    schema: {
      description: 'Get a specific job by ID',
      tags: ['Jobs'],
      params: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string }

    try {
      const job = await jobService.getJob(jobId)
      
      if (!job) {
        reply.code(404)
        return { error: 'Job not found' }
      }

      return job
    } catch (error) {
      fastify.log.error('Failed to fetch job:', error)
      reply.code(500)
      return { error: 'Failed to fetch job' }
    }
  })

  // LLM Runner endpoints (for Ollama runner to poll)
  fastify.get('/api/llm/jobs/pending', {
    schema: {
      description: 'Get pending LLM jobs (for Ollama runner)',
      tags: ['LLM Runner'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    // Simple auth check (in production, use proper JWT validation)
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401)
      return { error: 'Unauthorized' }
    }

    try {
      // Return pending LLM jobs
      // For now, return empty array (in production, query database)
      return []
    } catch (error) {
      fastify.log.error('Failed to fetch pending jobs:', error)
      reply.code(500)
      return { error: 'Failed to fetch pending jobs' }
    }
  })

  // Submit LLM job result
  fastify.post('/api/llm/jobs/result', {
    schema: {
      description: 'Submit LLM job result (from Ollama runner)',
      tags: ['LLM Runner'],
      headers: {
        type: 'object',
        properties: {
          authorization: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['jobId', 'success'],
        properties: {
          jobId: { type: 'string' },
          success: { type: 'boolean' },
          response: { type: 'string' },
          error: { type: 'string' },
          metadata: {
            type: 'object',
            properties: {
              model: { type: 'string' },
              processingTime: { type: 'number' },
              tokenCount: { type: 'number' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    // Simple auth check
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401)
      return { error: 'Unauthorized' }
    }

    const body = request.body as {
      jobId: string
      success: boolean
      response?: string
      error?: string
      metadata?: any
    }

    try {
      // Update job with result
      const updatedJob = await jobService.updateJobStatus(
        body.jobId,
        body.success ? 'COMPLETED' : 'FAILED',
        body.response ? { response: body.response, metadata: body.metadata } : undefined,
        body.error
      )

      return { success: true, job: updatedJob }
    } catch (error) {
      fastify.log.error('Failed to update job result:', error)
      reply.code(500)
      return { error: 'Failed to update job result' }
    }
  })
}

export default jobsRoutes