# Hybrid Deployment Guide

## Setup: Frontend on Railway + Local API + Local Ollama

This setup deploys only the frontend to Railway while running the API locally with your Ollama.

### Railway Setup (Frontend Only)

1. **Delete the API service** from Railway dashboard if it exists
2. **Keep only these services:**
   - Web App (Next.js frontend)
   - PostgreSQL Database

### Web App Environment Variables in Railway:
```
DATABASE_URL=${PostgreSQL.DATABASE_URL}
NEXTAUTH_URL=${RAILWAY_PUBLIC_DOMAIN}
NEXTAUTH_SECRET=your-secret-here
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Local Development:

1. **Start Ollama** (already running on your PC)
2. **Start the API locally:**
   ```bash
   cd apps/api
   npm run dev
   ```
3. **The frontend on Railway** will connect to your local API

### Environment Variables for Local API:
Create `apps/api/.env`:
```
DATABASE_URL=your-railway-postgres-url
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
PORT=8000
```

### Benefits:
- ✅ Frontend deployed and accessible from anywhere
- ✅ API runs locally with direct Ollama access
- ✅ No tunneling or port forwarding needed
- ✅ Easy development and debugging
- ✅ Can use any local models you have

### To Access Your App:
- Frontend: Railway public URL
- API: localhost:8000
- Database: Railway PostgreSQL
- LLM: Your local Ollama