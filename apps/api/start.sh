#!/bin/bash

# Start Ollama in background
echo "Starting Ollama..."
ollama serve &

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
sleep 10

# Pull the model
echo "Pulling gemma3:12b model..."
ollama pull gemma3:12b

# Start the API
echo "Starting API..."
cd /app
NODE_ENV=production node dist/index.js
