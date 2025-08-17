#!/bin/bash

# Elasticsearch Reports Tool - Quick Start Script

echo "🚀 Starting Elasticsearch Reports Tool..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Install dependencies if node_modules don't exist
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

# Check if .env files exist
if [ ! -f "server/.env" ]; then
    echo "⚠️  Server .env file not found. Creating from example..."
    cp server/.env.example server/.env
    echo "📝 Please edit server/.env with your Elasticsearch configuration"
fi

if [ ! -f "client/.env" ]; then
    echo "⚠️  Client .env file not found. Creating from example..."
    cp client/.env.example client/.env
fi

echo "🔧 Configuration files ready"

# Start the application
echo "🌟 Starting development servers..."
echo ""
echo "📊 Client will be available at: http://localhost:3000"
echo "🔌 Server will be available at: http://localhost:4000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

npm run dev