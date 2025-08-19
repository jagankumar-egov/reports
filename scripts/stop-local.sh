#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🛑 Stopping DHR Local Development Environment${NC}"
echo "================================================"

# Stop and remove containers
docker-compose -f docker-compose.local.yml down

echo -e "${GREEN}✅ All services stopped${NC}"

# Ask if user wants to remove volumes
read -p "Do you want to remove data volumes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose -f docker-compose.local.yml down -v
    echo -e "${GREEN}✅ Data volumes removed${NC}"
fi