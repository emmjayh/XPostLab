#!/bin/bash
# Database migration script for Railway

echo "Running Prisma migrations..."
npx prisma migrate deploy

echo "Migration complete!"
