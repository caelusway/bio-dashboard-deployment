#!/bin/bash

# Deploy script for Railway - builds dashboard and starts API server

echo "🚀 Starting deployment..."

# Build the dashboard
echo "📦 Building dashboard..."
cd apps/bio-dashboard
bun install
bun run build

# Install API dependencies
echo "📦 Installing API dependencies..."
cd ../bio-internal
bun install

echo "✅ Build complete! Starting server..."
