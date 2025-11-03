import { FastifyPluginAsync } from 'fastify'
import { ContentUploadService } from '../services/content-upload-service'
import { authenticate } from '../middleware/auth'
import { MultipartFile } from '@fastify/multipart'

const uploadRoutes: FastifyPluginAsync = async (fastify) => {
  const uploadService = new ContentUploadService()

  // Register multipart
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  })

  // Upload CSV file
  fastify.post('/api/uploads/csv', {
    preHandler: authenticate,
    schema: {
      description: 'Upload CSV file containing social media posts for analysis',
      tags: ['Uploads'],
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' }
        }
      },
      consumes: ['multipart/form-data']
    }
  }, async (request, reply) => {
    try {
      if (!request.user) {
        reply.code(401)
        return { error: 'Not authenticated' }
      }

      const data = await request.file()

      if (!data) {
        reply.code(400)
        return { error: 'No file uploaded' }
      }

      // Validate file type
      if (!data.filename.endsWith('.csv')) {
        reply.code(400)
        return { error: 'Only CSV files are supported' }
      }

      // Read file buffer
      const buffer = await data.toBuffer()

      // Get platform from fields (default to twitter)
      const fields = data.fields as any
      const platform = (fields.platform?.value as string) || 'twitter'

      // Save file
      const filename = await uploadService.saveFile(buffer, data.filename)

      // Process asynchronously
      const result = await uploadService.processUpload(
        request.user.id,
        filename,
        data.filename,
        platform
      )

      return {
        success: true,
        ...result
      }
    } catch (error) {
      fastify.log.error({ error }, 'Upload failed')
      reply.code(500)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  })

  // Get user's uploads
  fastify.get('/api/uploads', {
    preHandler: authenticate,
    schema: {
      description: 'Get all uploads for the authenticated user',
      tags: ['Uploads'],
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              filename: { type: 'string' },
              originalName: { type: 'string' },
              platform: { type: 'string' },
              status: { type: 'string' },
              totalPosts: { type: 'number' },
              createdAt: { type: 'string' }
            }
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

      const uploads = await uploadService.getUserUploads(request.user.id)
      return uploads
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get uploads')
      reply.code(500)
      return { error: 'Failed to get uploads' }
    }
  })

  // Get upload details with analysis
  fastify.get('/api/uploads/:uploadId', {
    preHandler: authenticate,
    schema: {
      description: 'Get detailed information about a specific upload including analysis',
      tags: ['Uploads'],
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' }
        }
      },
      params: {
        type: 'object',
        required: ['uploadId'],
        properties: {
          uploadId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { uploadId } = request.params as { uploadId: string }

    try {
      if (!request.user) {
        reply.code(401)
        return { error: 'Not authenticated' }
      }

      const details = await uploadService.getUploadDetails(uploadId, request.user.id)
      return details
    } catch (error) {
      fastify.log.error({ error }, 'Failed to get upload details')

      if (error instanceof Error && error.message === 'Upload not found') {
        reply.code(404)
        return { error: 'Upload not found' }
      }

      reply.code(500)
      return { error: 'Failed to get upload details' }
    }
  })

  // Create persona from upload analysis
  fastify.post('/api/uploads/:uploadId/create-persona', {
    preHandler: authenticate,
    schema: {
      description: 'Create a new persona based on the analysis of an upload',
      tags: ['Uploads'],
      headers: {
        type: 'object',
        required: ['authorization'],
        properties: {
          authorization: { type: 'string' }
        }
      },
      params: {
        type: 'object',
        required: ['uploadId'],
        properties: {
          uploadId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { uploadId } = request.params as { uploadId: string }
    const { name, description, suggestionId } = request.body as {
      name?: string
      description?: string
      suggestionId?: string
    }

    try {
      if (!request.user) {
        reply.code(401)
        return { error: 'Not authenticated' }
      }

      const persona = await uploadService.createPersonaFromAnalysis(
        request.user.id,
        uploadId,
        { name, description, suggestionId }
      )

      return { success: true, persona }
    } catch (error) {
      fastify.log.error({ error }, 'Failed to create persona')

      if (error instanceof Error && error.message.includes('not found')) {
        reply.code(404)
        return { error: error.message }
      }

      reply.code(500)
      return { error: 'Failed to create persona' }
    }
  })
}

export default uploadRoutes
