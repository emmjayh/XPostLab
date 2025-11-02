import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { ComposerService } from '../services/composer-service'

const composerRoutes: FastifyPluginAsync = async (fastify) => {
  const composerService = new ComposerService()

  // Brain dump to posts endpoint
  fastify.post('/api/composer/brain-dump', {
    schema: {
      description: 'Transform brain dump or raw ideas into polished social media posts',
      tags: ['Composer'],
      body: {
        type: 'object',
        required: ['input', 'personaId', 'platform'],
        properties: {
          input: {
            type: 'string',
            description: 'Raw brain dump or ideas to transform'
          },
          personaId: {
            type: 'string',
            description: 'ID of the persona to use for voice matching'
          },
          platform: {
            type: 'string',
            enum: ['twitter', 'linkedin', 'instagram'],
            description: 'Target platform for the content'
          },
          options: {
            type: 'object',
            properties: {
              variants: {
                type: 'number',
                minimum: 1,
                maximum: 5,
                default: 3,
                description: 'Number of variants to generate'
              },
              maxLength: {
                type: 'number',
                minimum: 100,
                maximum: 5000,
                description: 'Custom character limit (defaults: Twitter=280, LinkedIn=3000, Instagram=2200)'
              },
              includeHashtags: {
                type: 'boolean',
                default: false,
                description: 'Include relevant hashtags'
              }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            jobId: { type: 'string' },
            variants: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  hook: { type: 'string' },
                  body: { type: 'string' },
                  cta: { type: 'string' },
                  hashtags: { type: 'array', items: { type: 'string' } },
                  metadata: {
                    type: 'object',
                    properties: {
                      length: { type: 'number' },
                      sentiment: { type: 'string' },
                      hookType: { type: 'string' }
                    }
                  }
                }
              }
            },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as {
      input: string
      personaId: string
      platform: 'twitter' | 'linkedin' | 'instagram'
      options?: {
        variants?: number
        maxLength?: number
        includeHashtags?: boolean
      }
    }

    try {
      const result = await composerService.generateFromBrainDump(body)
      return result
    } catch (error) {
      fastify.log.error({ error }, 'Brain dump generation failed')
      reply.code(500)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }
    }
  })

  // Get job status endpoint
  fastify.get('/api/composer/job/:jobId', {
    schema: {
      description: 'Get the status and result of a composition job',
      tags: ['Composer'],
      params: {
        type: 'object',
        required: ['jobId'],
        properties: {
          jobId: {
            type: 'string',
            description: 'ID of the job to check'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            status: { 
              type: 'string',
              enum: ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']
            },
            result: {
              type: 'object',
              properties: {
                variants: { type: 'array' },
                metadata: { type: 'object' }
              }
            },
            error: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { jobId } = request.params as { jobId: string }

    try {
      const job = await composerService.getJobStatus(jobId)
      
      if (!job) {
        reply.code(404)
        return { error: 'Job not found' }
      }

      return job
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get job status')
      reply.code(500)
      return {
        error: error instanceof Error ? error.message : 'Internal server error'
      }
    }
  })

  // Direct compose endpoint (synchronous, for simple cases)
  fastify.post('/api/composer/compose', {
    schema: {
      description: 'Generate posts synchronously (for simple, fast requests)',
      tags: ['Composer'],
      body: {
        type: 'object',
        required: ['input', 'personaId', 'platform'],
        properties: {
          input: { type: 'string' },
          personaId: { type: 'string' },
          platform: { type: 'string', enum: ['twitter', 'linkedin', 'instagram'] },
          options: {
            type: 'object',
            properties: {
              variants: { type: 'number', minimum: 1, maximum: 3, default: 2 },
              maxLength: { type: 'number' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const body = request.body as {
      input: string
      personaId: string
      platform: 'twitter' | 'linkedin' | 'instagram'
      options?: { variants?: number; maxLength?: number }
    }

    try {
      const result = await composerService.generateSync(body)
      return result
    } catch (error) {
      fastify.log.error({ error }, 'Sync composition failed')
      reply.code(500)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }
    }
  })
}

export default composerRoutes