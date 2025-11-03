import { prisma, Job } from '../lib/database'

export interface CreateJobRequest {
  userId: string
  type: string
  personaId?: string | null
  input: any
  priority?: number
}

export interface LogJobRequest {
  userId: string
  type: string
  personaId?: string | null
  status?: 'COMPLETED' | 'FAILED'
  input: any
  output?: any
  error?: string
}

function serializeJob(job: Job | null) {
  if (!job) {
    return null
  }

  return {
    ...job,
    input: safeParse(job.input),
    output: safeParse(job.output),
  }
}

function safeParse(value?: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

export class JobService {
  async createComposerJob(request: CreateJobRequest) {
    const job = await prisma.job.create({
      data: {
        userId: request.userId,
        personaId: request.personaId ?? null,
        type: request.type,
        status: 'QUEUED',
        priority: request.priority ?? 0,
        input: JSON.stringify(request.input),
        attempts: 0,
      },
    })

    return serializeJob(job)
  }

  async logJobResult(request: LogJobRequest) {
    const job = await prisma.job.create({
      data: {
        userId: request.userId,
        personaId: request.personaId ?? null,
        type: request.type,
        status: request.status ?? 'COMPLETED',
        input: JSON.stringify(request.input),
        output: request.output ? JSON.stringify(request.output) : null,
        error: request.error ?? null,
        attempts: 1,
        maxRetries: 0,
      },
    })

    return serializeJob(job)
  }

  async getJob(jobId: string, userId?: string) {
    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        ...(userId ? { userId } : {}),
      },
    })

    return serializeJob(job)
  }

  async getJobsByUser(userId: string, status?: string) {
    const jobs = await prisma.job.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return jobs
      .map((job) => serializeJob(job))
      .filter((entry): entry is ReturnType<typeof serializeJob> => Boolean(entry))
  }

  async updateJobStatus(jobId: string, status: string, result?: any, error?: string) {
    const job = await prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        output: result ? JSON.stringify(result) : undefined,
        error: error || null,
        attempts: { increment: 1 },
      },
    })

    return serializeJob(job)
  }
}
