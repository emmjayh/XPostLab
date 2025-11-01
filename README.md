# AI Content Coach

> Your AI-powered content creation companion. Transform raw thoughts into polished, on-brand social media content.

## 🎯 What This Is

AI Content Coach is a comprehensive platform that helps creators:

- **Transform brain dumps** into polished social media posts
- **Maintain consistent voice** across all content with persona-driven generation
- **Optimize for algorithms** without sacrificing authenticity
- **Scale content creation** with intelligent automation
- **Generate talking-head videos** from scripts
- **Research and engage** with accounts strategically

## 🏗️ Current Status: MVP Foundation

This repository contains the foundational architecture for AI Content Coach. The current implementation includes:

### ✅ Completed
- **Monorepo Structure**: Turborepo + pnpm workspace
- **Core Applications**: Web (Next.js), API (Fastify), Worker, Webhooks
- **Database Schema**: Prisma with comprehensive models
- **Persona Engine**: Voice-consistent content generation system
- **Brain Dump → Composer**: MVP vertical slice with demo UI
- **Ollama Integration**: Local LLM runner architecture
- **Railway Deployment**: Production-ready configuration

### 🚧 Demo Features
- Brain Dump to multiple post variants
- Persona-based voice matching
- Platform-specific optimization (Twitter, LinkedIn, Instagram)
- Mock content generation (ready for real LLM integration)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- PostgreSQL (for production)
- Redis (for job queues)
- Ollama (optional, for local LLM)

### 1. Clone and Install
\`\`\`bash
git clone <repository-url>
cd ai-content-coach
cp .env.example .env
pnpm install
\`\`\`

### 2. Environment Setup
Edit `.env` with your configuration:
\`\`\`bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_content_coach"

# Redis  
REDIS_URL="redis://localhost:6379"

# Ollama (optional)
OLLAMA_BASE_URL="http://localhost:11434"
\`\`\`

### 3. Database Setup
\`\`\`bash
# Setup database
cd packages/database
pnpm db:push
pnpm db:seed
\`\`\`

### 4. Run Development
\`\`\`bash
# Start all services
pnpm dev

# Or start individual services
pnpm dev --filter=@ai-content-coach/web
pnpm dev --filter=@ai-content-coach/api
\`\`\`

### 5. Access the App
- **Web Interface**: http://localhost:3000
- **API Documentation**: http://localhost:8000/docs
- **API Health**: http://localhost:8000/health

## 🧠 Core Architecture

### Persona Engine
The heart of AI Content Coach. Every piece of content is filtered through a persona that captures:
- **Tone**: Professional, casual, humorous, etc.
- **Cadence**: Concise, detailed, conversational
- **Don'ts**: Things to never do or say
- **Hook Patterns**: Preferred ways to start posts
- **CTA Style**: How to end posts with calls-to-action

### Content Generation Flow
1. **Input**: Raw brain dump or structured idea
2. **Persona Selection**: Choose voice and platform
3. **Template Compilation**: System prompts + persona rules
4. **LLM Generation**: Ollama (local) or cloud LLM
5. **Validation**: Persona engine filters output
6. **Variants**: Multiple polished versions returned

### Ollama Integration
Two modes for local LLM processing:

**Runner Mode (Recommended)**:
\`\`\`bash
# Install the runner CLI
cd packages/ollama-runner
pnpm build
pnpm start

# The runner polls Railway for jobs and processes them locally
\`\`\`

**Direct Mode**:
Set `OLLAMA_BASE_URL` to your public Ollama tunnel for direct cloud → local calls.

## 📱 Demo the MVP

1. **Start the development servers**:
   \`\`\`bash
   pnpm dev
   \`\`\`

2. **Open http://localhost:3000**

3. **Try the Brain Dump Composer**:
   - Drop raw thoughts in the textarea
   - Select a persona (Professional Creator or Casual Thought Leader)
   - Choose platform (Twitter, LinkedIn, Instagram)
   - Generate 2-5 variants
   - Copy polished content to clipboard

4. **Observe the persona system**:
   - Notice how the same input produces different outputs based on persona
   - See platform-specific optimizations (character limits, hashtags)
   - Check how "don'ts" filter inappropriate content

## 🛠️ Development

### Project Structure
\`\`\`
apps/
├── web/           # Next.js frontend
├── api/           # Fastify API server  
├── worker/        # Background job processor
└── webhooks/      # Webhook handlers

packages/
├── database/      # Prisma schema and client
├── shared/        # Types and utilities
└── ollama-runner/ # Local LLM processing CLI
\`\`\`

### Key Scripts
\`\`\`bash
# Development
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm type-check       # TypeScript validation

# Database
pnpm db:push          # Push schema changes
pnpm db:generate      # Generate Prisma client
pnpm db:studio        # Open Prisma Studio
pnpm db:seed          # Seed demo data

# Ollama Runner
pnpm ollama:test      # Test Ollama connection
pnpm ollama:start     # Start job polling
\`\`\`

## 🚀 Deployment

### Railway (Recommended)
The repository is configured for automatic Railway deployment:

1. **Connect GitHub repo** to Railway
2. **Set environment variables** in Railway dashboard
3. **Deploy** - Railway auto-detects services from `railway.toml`

### Manual Deployment
\`\`\`bash
# Build for production
pnpm build

# Start production servers
NODE_ENV=production pnpm start --filter=@ai-content-coach/web
NODE_ENV=production pnpm start --filter=@ai-content-coach/api
\`\`\`

## 🎬 What's Next

The current MVP demonstrates the core concept. The next development phases would add:

### Phase 2: Real LLM Integration
- Complete Ollama runner implementation
- Cloud LLM fallback options
- Streaming responses
- Job queue management

### Phase 3: Advanced Features  
- Reply Guy (comment generation)
- Algo Analyzer (content risk/boost scoring)
- Account Researcher (competitor analysis)
- History Analyzer (performance insights)

### Phase 4: Avatar Studio
- Text-to-video generation
- Avatar provider integrations
- Video processing pipeline

### Phase 5: Growth Features
- Content scheduling
- Multi-platform publishing
- Team collaboration
- Analytics dashboard

## 💡 Contributing

This is the foundational architecture for AI Content Coach. The codebase is designed for:

- **Scalability**: Microservices architecture ready for growth
- **Modularity**: Clear separation between persona engine, content generation, and platforms
- **Extensibility**: Easy to add new LLM providers, platforms, and content types
- **Maintainability**: TypeScript throughout, comprehensive error handling

Key areas for contribution:
1. **LLM Integration**: Completing the Ollama runner and adding cloud LLM support
2. **Persona Refinement**: Enhancing the voice matching and content filtering
3. **Platform Expansion**: Adding TikTok, YouTube, etc.
4. **Advanced Features**: Implementing the roadmap features above

## 📄 License

[License TBD]

---

**Built with**: Next.js, Fastify, Prisma, PostgreSQL, Redis, Ollama, Railway

**Architecture**: Turborepo monorepo, TypeScript throughout, microservices ready