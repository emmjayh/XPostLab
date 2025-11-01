#!/usr/bin/env node

import { Command } from 'commander'
import { config } from 'dotenv'
import { OllamaRunner } from './runner'
import { OllamaClient } from './ollama-client'

// Load environment variables
config()

const program = new Command()

program
  .name('ollama-runner')
  .description('Ollama Runner CLI for AI Content Coach')
  .version('0.1.0')

program
  .command('start')
  .description('Start the Ollama runner')
  .option('-u, --ollama-url <url>', 'Ollama base URL', process.env.OLLAMA_BASE_URL || 'http://localhost:11434')
  .option('-r, --railway-url <url>', 'Railway API URL', process.env.RAILWAY_API_URL)
  .option('-k, --api-key <key>', 'API key for Railway', process.env.API_KEY)
  .option('-i, --interval <ms>', 'Polling interval in milliseconds', '5000')
  .action(async (options) => {
    if (!options.railwayUrl) {
      console.error('❌ Railway API URL is required. Set RAILWAY_API_URL environment variable or use --railway-url')
      process.exit(1)
    }

    if (!options.apiKey) {
      console.error('❌ API key is required. Set API_KEY environment variable or use --api-key')
      process.exit(1)
    }

    const runner = new OllamaRunner({
      ollamaBaseUrl: options.ollamaUrl,
      railwayApiUrl: options.railwayUrl,
      apiKey: options.apiKey,
      pollInterval: parseInt(options.interval)
    })

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down gracefully...')
      runner.stop()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down gracefully...')
      runner.stop()
      process.exit(0)
    })

    try {
      await runner.start()
    } catch (error) {
      console.error('❌ Failed to start runner:', error)
      process.exit(1)
    }
  })

program
  .command('test')
  .description('Test connection to Ollama')
  .option('-u, --ollama-url <url>', 'Ollama base URL', process.env.OLLAMA_BASE_URL || 'http://localhost:11434')
  .action(async (options) => {
    const client = new OllamaClient(options.ollamaUrl)
    
    console.log(`🔍 Testing connection to ${options.ollamaUrl}...`)
    
    const isAvailable = await client.isAvailable()
    
    if (isAvailable) {
      console.log('✅ Ollama is available!')
      
      const models = await client.listModels()
      console.log(`📋 Available models: ${models.join(', ')}`)
      
      if (models.length === 0) {
        console.log('⚠️  No models found. You may need to pull a model first.')
        console.log('💡 Try: ollama pull llama3.1:8b')
      }
    } else {
      console.log('❌ Ollama is not available')
      console.log('💡 Make sure Ollama is running: ollama serve')
    }
  })

program
  .command('models')
  .description('List and manage models')
  .option('-u, --ollama-url <url>', 'Ollama base URL', process.env.OLLAMA_BASE_URL || 'http://localhost:11434')
  .option('--pull <model>', 'Pull a specific model')
  .action(async (options) => {
    const client = new OllamaClient(options.ollamaUrl)
    
    if (options.pull) {
      console.log(`📥 Pulling model: ${options.pull}...`)
      try {
        await client.pullModel(options.pull)
        console.log('✅ Model pulled successfully!')
      } catch (error) {
        console.error('❌ Failed to pull model:', error)
        process.exit(1)
      }
    } else {
      const models = await client.listModels()
      console.log('📋 Available models:')
      models.forEach(model => console.log(`  - ${model}`))
      
      if (models.length === 0) {
        console.log('⚠️  No models found.')
        console.log('\n💡 Recommended models to pull:')
        const recommended = OllamaClient.getRecommendedModels()
        Object.entries(recommended).forEach(([purpose, model]) => {
          console.log(`  - ${model} (${purpose})`)
        })
      }
    }
  })

program.parse()