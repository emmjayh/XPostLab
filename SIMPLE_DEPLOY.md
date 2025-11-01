# SUPER SIMPLE Railway Deployment

## Step 1: Delete All Existing Services
- Go to Railway dashboard
- Delete any existing services to start fresh

## Step 2: Create New Project
- Click "New Project" 
- Connect to GitHub repo: `emmjayh/XPostLab`

## Step 3: Add 3 Services

### Service 1: PostgreSQL
- Click "Add Service" → "Database" → "PostgreSQL"  
- That's it!

### Service 2: Web App
- Click "Add Service" → "GitHub Repo"
- Select your repo
- **Root Directory**: `apps/web`
- Deploy!

### Service 3: API  
- Click "Add Service" → "GitHub Repo"
- Select your repo  
- **Root Directory**: `apps/api`
- Deploy!

## Step 4: Set Environment Variables

### For Web App:
```
DATABASE_URL=${{PostgreSQL.DATABASE_URL}}
NEXTAUTH_URL=${{RAILWAY_PUBLIC_DOMAIN}}
NEXTAUTH_SECRET=any-random-string-here
NEXT_PUBLIC_API_URL=${{api-service.RAILWAY_PUBLIC_DOMAIN}}
```

### For API:
```  
DATABASE_URL=${{PostgreSQL.DATABASE_URL}}
PORT=8000
```

## Step 5: Run Database Migration
- In API service terminal: `npx prisma db push`

## Done!
Your app should be deployed and working!