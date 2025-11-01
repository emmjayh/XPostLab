# Railway Deployment Guide

## Quick Setup

1. **Delete existing Railway services** (if any) to start fresh

2. **Create 3 new services in Railway:**

### Service 1: Database
- Type: **PostgreSQL Database**
- No additional config needed

### Service 2: Web App (Frontend)
- **Source**: Connect to GitHub repo `emmjayh/XPostLab`
- **Root Directory**: `apps/web`
- **Build Command**: Will use nixpacks.toml automatically
- **Environment Variables**:
  ```
  DATABASE_URL=${PostgreSQL.DATABASE_URL}
  NEXTAUTH_URL=${RAILWAY_PUBLIC_DOMAIN}
  NEXTAUTH_SECRET=your-nextauth-secret-here
  NEXT_PUBLIC_API_URL=${api-service.RAILWAY_PUBLIC_DOMAIN}
  ```

### Service 3: API (Backend)
- **Source**: Connect to GitHub repo `emmjayh/XPostLab`  
- **Root Directory**: `apps/api`
- **Build Command**: Will use nixpacks.toml automatically
- **Environment Variables**:
  ```
  DATABASE_URL=${PostgreSQL.DATABASE_URL}
  PORT=8000
  ```

## After Deployment

1. **Run database migration** on the API service:
   ```bash
   pnpm dlx prisma db push
   ```

2. **Test the deployment**:
   - Web app should be accessible at the Railway domain
   - API health check at: `{api-domain}/health`

## Environment Variables Reference

The key thing is connecting the services:
- `DATABASE_URL` → Same PostgreSQL instance for both web and API
- `NEXT_PUBLIC_API_URL` → Points web app to API service
- `NEXTAUTH_URL` → Points auth to web app domain

That's it! Much simpler than the previous 7-service setup.