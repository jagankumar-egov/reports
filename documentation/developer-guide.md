# DHR Phase 1 - Developer Guide

## Overview

DHR (Digit Health Reports) Phase 1 provides direct Elasticsearch querying capabilities with a clean web interface. This document covers setup, configuration, and development details.

## Architecture

### Backend (Node.js + TypeScript)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Elasticsearch
- **Port**: 3001 (configurable)

### Frontend (React + TypeScript)
- **Framework**: React 18
- **Language**: TypeScript
- **UI Library**: Material-UI (MUI)
- **State Management**: Redux Toolkit
- **Port**: 3000 (configurable)

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `server/` directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=3001

# Elasticsearch Configuration
ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_password
ELASTICSEARCH_CA_CERT=/path/to/ca-cert.pem  # Optional for SSL

# Allowed Health Indexes (comma-separated)
ALLOWED_HEALTH_INDEXES=project-index-v1,household-index-v1,project-task-index-v1,stock-index-v1

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Development Options
SKIP_ELASTICSEARCH_HEALTH_CHECK=false  # Set to 'true' to skip ES health check
```

### Frontend Environment Variables

Create a `.env` file in the `client/` directory:

```bash
# Development server
VITE_API_BASE_URL=http://localhost:3001/api
VITE_DEV_PORT=3000
```

## Installation & Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Elasticsearch 8.x running
- Git

### Backend Setup

```bash
cd server/
npm install
cp .env.example .env  # Configure your environment
npm run dev          # Development mode
npm run build        # Production build
npm start           # Production mode
```

### Frontend Setup

```bash
cd client/
npm install
cp .env.example .env  # Configure your environment
npm run dev          # Development mode (Vite)
npm run build        # Production build
npm run preview      # Preview production build
```

## Development Commands

### Backend
```bash
npm run dev          # Start with nodemon (auto-reload)
npm run build        # Compile TypeScript
npm run start        # Start compiled JS
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

### Frontend
```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run preview      # Preview build
npm run lint         # ESLint check
npm run type-check   # TypeScript check
```

## API Endpoints

### Health Check
- **GET** `/health` - Server health status

### Direct Query
- **GET** `/api/direct-query/indexes` - Get available Elasticsearch indexes
- **POST** `/api/direct-query` - Execute direct Elasticsearch query

#### Direct Query Request Body
```json
{
  "index": "project-index-v1",
  "query": {
    "query": {
      "match_all": {}
    },
    "size": 10
  },
  "from": 0,
  "size": 10,
  "_source": ["field1", "field2"]  // Optional: field filtering
}
```

## Configuration Details

### Elasticsearch Configuration

The system supports the following Elasticsearch configurations:

1. **Connection Settings**
   - Host URL with protocol
   - Basic authentication (username/password)
   - SSL/TLS with custom CA certificate
   - Request timeout and retry settings

2. **Index Security**
   - Whitelist of allowed indexes via `ALLOWED_HEALTH_INDEXES`
   - Automatic index access validation
   - Pattern matching support (e.g., `project-*`)

3. **Performance Settings**
   - Request timeouts (default: 30s)
   - Maximum retries (default: 3)
   - Connection pooling

### Rate Limiting

- **Window**: 15 minutes (configurable)
- **Max Requests**: 100 per window (configurable)
- **Headers**: Includes standard rate limit headers

### CORS Policy

- **Origins**: Configurable allowed origins
- **Credentials**: Enabled for authenticated requests
- **Methods**: GET, POST, PUT, DELETE, OPTIONS

## Security Features

1. **Input Validation**
   - Request body validation
   - Query parameter sanitization
   - JSON structure validation

2. **Access Control**
   - Index whitelist enforcement
   - Query size limits (max 1000 documents)
   - Rate limiting per IP

3. **Error Handling**
   - Structured error responses
   - No sensitive data exposure
   - Comprehensive logging

## Logging

### Log Levels
- **info**: Normal operations, requests
- **warn**: Non-critical issues, missing indexes
- **error**: Critical errors, failures

### Log Format
```json
{
  "timestamp": "2025-08-24T13:47:15.123Z",
  "level": "info",
  "service": "dhr-backend",
  "operationId": "abc123def",
  "message": "Operation completed",
  "metadata": {
    "duration": "150ms",
    "hits": 42
  }
}
```

## Database Schema

### Expected Elasticsearch Index Structure

The system works with any valid Elasticsearch index, but optimal performance is achieved with:

```json
{
  "mappings": {
    "properties": {
      "@timestamp": {
        "type": "date"
      },
      "id": {
        "type": "keyword"
      },
      "data": {
        "type": "object",
        "properties": {
          "projectName": {
            "type": "text",
            "fields": {
              "keyword": {
                "type": "keyword"
              }
            }
          }
        }
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Elasticsearch Connection Failed**
   ```bash
   # Check Elasticsearch is running
   curl -u elastic:password http://localhost:9200/_cluster/health
   
   # Verify credentials in .env
   echo $ELASTICSEARCH_USERNAME
   ```

2. **Index Not Found Errors**
   ```bash
   # List available indexes
   curl -u elastic:password http://localhost:9200/_cat/indices
   
   # Update ALLOWED_HEALTH_INDEXES in .env
   ```

3. **CORS Issues**
   ```bash
   # Update CORS_ORIGINS in server .env
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **TypeScript Compilation Errors**
   ```bash
   # Clear build cache
   rm -rf dist/ node_modules/.cache/
   npm run build
   ```

### Debug Mode

Enable detailed logging:

```bash
# Backend
NODE_ENV=development npm run dev

# Frontend  
VITE_DEBUG=true npm run dev
```

## Performance Optimization

1. **Elasticsearch Queries**
   - Use `_source` filtering for large documents
   - Implement pagination with `from`/`size`
   - Add appropriate indexes for filtering fields

2. **Frontend**
   - Implement virtual scrolling for large result sets
   - Use React.memo for expensive components
   - Lazy load non-critical components

3. **Backend**
   - Connection pooling enabled by default
   - Request timeouts to prevent hanging
   - Structured logging for monitoring

## Development Workflow

1. **Feature Development**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   npm run lint && npm run type-check
   npm run test  # If tests are available
   git commit -m "feat: add new feature"
   ```

2. **Testing**
   - Unit tests: Individual component testing
   - Integration tests: API endpoint testing
   - E2E tests: Full user workflow testing

3. **Deployment**
   - Build production assets
   - Configure production environment variables
   - Set up reverse proxy (nginx recommended)
   - Configure SSL certificates
   - Set up monitoring and logging

## Monitoring

### Health Endpoints
- **Backend**: `GET /health`
- **Frontend**: Served at root path

### Metrics to Monitor
- Response times
- Error rates
- Elasticsearch connection status
- Memory usage
- Request volume

### Recommended Tools
- **Logging**: Winston + ELK Stack
- **Monitoring**: Prometheus + Grafana  
- **APM**: New Relic or DataDog
- **Uptime**: Pingdom or similar

## Contributing

1. Follow TypeScript strict mode
2. Use ESLint configuration provided
3. Write meaningful commit messages
4. Update documentation for new features
5. Add error handling for all new endpoints

## Support

For technical issues:
1. Check logs in `/server/logs/` directory
2. Verify Elasticsearch connectivity
3. Review environment configuration
4. Check network connectivity between services