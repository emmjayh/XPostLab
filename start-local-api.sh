#!/bin/bash

echo "🚀 Starting AI Content Coach - Local API Setup"
echo ""

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "❌ Ollama is not running on localhost:11434"
    echo "Please start Ollama first"
    exit 1
fi

echo "✅ Ollama is running"

# Show available models
echo "📚 Available Ollama models:"
curl -s http://localhost:11434/api/tags | jq -r '.models[].name' | head -5
echo ""

# Set up environment for API
cd apps/api

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file for local API..."
    cat > .env << EOF
# Database - use Railway PostgreSQL URL
DATABASE_URL="your-railway-postgres-url-here"

# Ollama configuration
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.1:8b"

# API configuration
PORT=8000
NODE_ENV=development
LOG_LEVEL=info
EOF
    echo "⚠️  Please update DATABASE_URL in apps/api/.env with your Railway PostgreSQL URL"
fi

echo "🔧 Installing dependencies..."
npm install

echo "🏗️  Building API..."
npm run build

echo "🚀 Starting API on http://localhost:8000"
echo "🌐 Your Railway frontend can now connect to this local API"
echo ""
npm start