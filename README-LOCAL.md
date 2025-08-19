# DHR Local Development Setup

This guide helps you run the entire DHR (Digit Health Reports) stack locally using Docker Compose.

## Prerequisites

- Docker Desktop installed and running
- Node.js (for running seed scripts)
- At least 4GB of free RAM for Elasticsearch

## Quick Start

1. **Start all services with sample data:**
   ```bash
   ./scripts/start-local.sh
   ```

   This script will:
   - Build and start all containers (Elasticsearch, Backend, Frontend, Kibana)
   - Wait for services to be ready
   - Load sample health data into Elasticsearch
   - Display service URLs

2. **Access the services:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Elasticsearch: http://localhost:9200
   - Kibana: http://localhost:5601

## Available Scripts

### Start Services
```bash
./scripts/start-local.sh
```

### Stop Services
```bash
./scripts/stop-local.sh
```

### Reload Sample Data
```bash
cd scripts && node seed-data.js
```

### View Logs
```bash
# All services
docker-compose -f docker-compose.local.yml logs -f

# Specific service
docker-compose -f docker-compose.local.yml logs -f backend
docker-compose -f docker-compose.local.yml logs -f frontend
docker-compose -f docker-compose.local.yml logs -f elasticsearch
```

### Restart a Service
```bash
docker-compose -f docker-compose.local.yml restart [service-name]
```

## Sample Data

The seed script creates the following indices with sample data:

1. **health_facilities** (100 records)
   - Facility information across Indian states
   - Types: PHC, CHC, District Hospitals, etc.
   - Includes location, services, bed count, staff count

2. **patient_records** (500 records)
   - Patient admission and treatment data
   - Diagnosis, treatment outcomes, costs
   - Insurance coverage information

3. **health_programs** (50 records)
   - Government health programs
   - Budget allocation and utilization
   - Beneficiary targets and achievements

4. **disease_surveillance** (200 records)
   - Disease outbreak reporting
   - Cases and deaths by region
   - Age groups and severity levels

## Development Workflow

1. **Frontend Development:**
   - Changes in `client/src` are hot-reloaded
   - Access at http://localhost:5173

2. **Backend Development:**
   - Changes in `server/src` trigger auto-restart via nodemon
   - API available at http://localhost:3000

3. **Elasticsearch Queries:**
   - Use Kibana Dev Tools at http://localhost:5601
   - Direct API access at http://localhost:9200

## Environment Variables

Copy `.env.example` to `.env` to customize:

```bash
cp .env.example .env
```

Key variables:
- `ELASTICSEARCH_URL`: Elasticsearch connection
- `CORS_ORIGIN`: Frontend URL for CORS
- `VITE_API_URL`: Backend API URL for frontend

## Troubleshooting

### Elasticsearch won't start
- Ensure Docker has at least 4GB RAM allocated
- Check if port 9200 is already in use

### Services can't connect
- Wait for Elasticsearch to be fully ready (yellow/green status)
- Check Docker network: `docker network ls`

### Data not loading
- Check Elasticsearch health: `curl http://localhost:9200/_cluster/health`
- Manually run seed script: `cd scripts && node seed-data.js`

### Port conflicts
- Stop conflicting services or change ports in docker-compose.local.yml

## Clean Up

To completely remove all containers and data:

```bash
docker-compose -f docker-compose.local.yml down -v
```