#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting DHR Local Development Environment${NC}"
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if .env file exists, if not copy from .env.example
if [ ! -f .env ]; then
    echo -e "${YELLOW}📝 Creating .env file from .env.example...${NC}"
    cp .env.example .env
fi

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping any existing containers...${NC}"
docker-compose -f docker-compose.local.yml down

# Build and start services
echo -e "${GREEN}🔨 Building and starting services...${NC}"
docker-compose -f docker-compose.local.yml up -d --build

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"

# Wait for Elasticsearch
echo -n "Waiting for Elasticsearch..."
until curl -s http://localhost:9200/_cluster/health > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}✓${NC}"

# Wait for Backend
echo -n "Waiting for Backend..."
until curl -s http://localhost:3000/health > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}✓${NC}"

# Wait for Frontend
echo -n "Waiting for Frontend..."
until curl -s http://localhost:5173 > /dev/null 2>&1; do
    echo -n "."
    sleep 2
done
echo -e " ${GREEN}✓${NC}"

# Load seed data
echo -e "${GREEN}📊 Loading seed data into Elasticsearch...${NC}"
cd scripts && node seed-data.js
cd ..

echo ""
echo -e "${GREEN}✅ Local development environment is ready!${NC}"
echo "================================================"
echo -e "📱 Frontend:      ${GREEN}http://localhost:5173${NC}"
echo -e "🖥️  Backend API:   ${GREEN}http://localhost:3000${NC}"
echo -e "🔍 Elasticsearch: ${GREEN}http://localhost:9200${NC}"
echo -e "📊 Kibana:        ${GREEN}http://localhost:5601${NC}"
echo "================================================"
echo ""
echo -e "${YELLOW}📝 Useful commands:${NC}"
echo "  View logs:        docker-compose -f docker-compose.local.yml logs -f [service]"
echo "  Stop all:         docker-compose -f docker-compose.local.yml down"
echo "  Restart service:  docker-compose -f docker-compose.local.yml restart [service]"
echo "  Reload seed data: cd scripts && node seed-data.js"
echo ""
echo -e "${YELLOW}Services: elasticsearch, backend, frontend, kibana${NC}"