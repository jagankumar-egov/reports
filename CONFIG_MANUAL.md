# Elasticsearch Reports Tool - Configuration Manual

This manual provides detailed configuration instructions for the Elasticsearch Reports Tool.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Elasticsearch Setup](#elasticsearch-setup)
3. [Server Configuration](#server-configuration)
4. [Client Configuration](#client-configuration)
5. [Security Configuration](#security-configuration)
6. [Production Configuration](#production-configuration)
7. [Sample Configurations](#sample-configurations)
8. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Requirements
- **Node.js**: 18.0.0 or higher
- **NPM**: 8.0.0 or higher
- **Elasticsearch**: 7.10.0 or higher (8.x recommended)
- **Memory**: 4GB RAM minimum
- **Storage**: 1GB available space

### Recommended Requirements
- **Node.js**: 20.x LTS
- **Elasticsearch**: 8.x with security enabled
- **Memory**: 8GB RAM
- **CPU**: 4 cores
- **Storage**: 10GB available space

## Elasticsearch Setup

### 1. Index Permissions

Ensure your Elasticsearch user has the following permissions:

```json
{
  "cluster": ["monitor"],
  "indices": [
    {
      "names": ["logs-*", "metrics-*", "events-*"],
      "privileges": ["read", "view_index_metadata"]
    },
    {
      "names": ["reports_*"],
      "privileges": ["all"]
    }
  ]
}
```

### 2. Required Indices Access

The application needs:
- **Read access** to source data indices
- **Full access** to configuration indices (auto-created)

### 3. Sample Data Setup

#### Option A: Kibana Sample Data
```bash
# Install Kibana sample data through Kibana UI
# Go to: Home → Add sample data
# Install: Sample eCommerce orders, Sample web logs, Sample flight data
```

#### Option B: Create Test Data
```bash
# Create sample events
curl -X POST "localhost:9200/test-events/_doc" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T10:00:00Z",
  "event_type": "page_view",
  "user_id": "user123",
  "page": "/dashboard",
  "session_id": "sess_456",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "response_time": 250,
  "status_code": 200
}'

# Create sample metrics
curl -X POST "localhost:9200/test-metrics/_doc" -H 'Content-Type: application/json' -d'{
  "timestamp": "2024-01-15T10:01:00Z",
  "metric_name": "cpu_usage",
  "value": 75.5,
  "host": "server-01",
  "environment": "production",
  "datacenter": "us-east-1"
}'
```

## Server Configuration

### Environment Variables

Create `server/.env` file:

```env
#=======================
# BASIC CONFIGURATION
#=======================

# Node Environment
NODE_ENV=development

# Server Port
PORT=4000

#=======================
# ELASTICSEARCH CONFIG
#=======================

# Elasticsearch Host (required)
ES_HOST=http://localhost:9200

# Authentication Method 1: Username/Password
ES_USERNAME=elastic
ES_PASSWORD=your_secure_password

# Authentication Method 2: API Key (alternative to username/password)
ES_API_KEY=your_api_key_here

# Allowed Indices (comma-separated, supports wildcards)
ES_ALLOWED_INDICES=kibana_sample_data_*,test-*,logs-*,metrics-*

#=======================
# USER CONFIGURATION
#=======================

# Default User Role (reports-admin | reports-viewer)
DEFAULT_USER_ROLE=reports-admin

#=======================
# SECURITY CONFIGURATION
#=======================

# CORS Origins (comma-separated)
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

#=======================
# PERFORMANCE SETTINGS
#=======================

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Level (error | warn | info | debug)
LOG_LEVEL=info
```

### Configuration Validation

The server validates all configuration on startup:

```typescript
// Required fields
ES_HOST          // Must be valid URL
ES_ALLOWED_INDICES // Must not be empty

// Optional fields with defaults
NODE_ENV         // Default: development
PORT            // Default: 4000
DEFAULT_USER_ROLE // Default: reports-viewer
CORS_ORIGIN     // Default: http://localhost:3000
```

### Index Patterns

The `ES_ALLOWED_INDICES` supports wildcards:

```env
# Examples
ES_ALLOWED_INDICES=logs-*                    # All indices starting with "logs-"
ES_ALLOWED_INDICES=logs-*,metrics-*          # Multiple patterns
ES_ALLOWED_INDICES=specific-index            # Exact index name
ES_ALLOWED_INDICES=kibana_sample_data_*      # Kibana sample data
```

## Client Configuration

### Environment Variables

Create `client/.env` file:

```env
#=======================
# API CONFIGURATION
#=======================

# Backend API URL
VITE_API_URL=http://localhost:4000/api/v1

#=======================
# USER CONFIGURATION
#=======================

# User Role (reports-admin | reports-viewer)
VITE_USER_ROLE=reports-admin

# User Display Name
VITE_USERNAME=admin
```

### Role-Based Features

#### Reports Admin Role
- Access to Data Points management
- Dashboard creation and editing
- Full CRUD operations
- Export functionality

#### Reports Viewer Role
- Dashboard viewing only
- Apply runtime filters
- Export functionality
- No creation/editing capabilities

## Security Configuration

### 1. Elasticsearch Security

#### With Username/Password
```env
ES_HOST=https://your-elasticsearch:9200
ES_USERNAME=reports_user
ES_PASSWORD=secure_password_here
```

#### With API Key
```env
ES_HOST=https://your-elasticsearch:9200
ES_API_KEY=base64_encoded_api_key
```

#### Create API Key in Elasticsearch
```bash
# Create API key with appropriate permissions
curl -X POST "localhost:9200/_security/api_key" -H 'Content-Type: application/json' -d'{
  "name": "reports-tool-key",
  "role_descriptors": {
    "reports_role": {
      "cluster": ["monitor"],
      "indices": [
        {
          "names": ["logs-*", "metrics-*", "events-*"],
          "privileges": ["read", "view_index_metadata"]
        },
        {
          "names": ["reports_*"],
          "privileges": ["all"]
        }
      ]
    }
  }
}'
```

### 2. HTTPS Configuration

For production, use HTTPS:

```env
ES_HOST=https://elasticsearch.company.com:9200
CORS_ORIGIN=https://reports.company.com
```

### 3. Network Security

#### Firewall Rules
- Allow port 4000 for API (internal network only)
- Allow port 3000 for frontend (or use reverse proxy)
- Restrict Elasticsearch access to application server only

#### Reverse Proxy Example (Nginx)
```nginx
server {
    listen 443 ssl;
    server_name reports.company.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Production Configuration

### 1. Environment Variables

```env
#=======================
# PRODUCTION SETTINGS
#=======================

NODE_ENV=production
PORT=4000

# Use HTTPS for Elasticsearch
ES_HOST=https://elasticsearch.company.com:9200
ES_USERNAME=reports_service
ES_PASSWORD=${ES_PASSWORD_FROM_VAULT}

# Production allowed indices
ES_ALLOWED_INDICES=prod-logs-*,prod-metrics-*,prod-events-*

# Production CORS
CORS_ORIGIN=https://reports.company.com

# Enhanced rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=50

# Production logging
LOG_LEVEL=warn
```

### 2. Docker Configuration

#### Server Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]
```

#### Client Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### 3. Docker Compose

```yaml
version: '3.8'
services:
  reports-api:
    build: ./server
    environment:
      - NODE_ENV=production
      - PORT=4000
      - ES_HOST=${ES_HOST}
      - ES_USERNAME=${ES_USERNAME}
      - ES_PASSWORD=${ES_PASSWORD}
      - ES_ALLOWED_INDICES=${ES_ALLOWED_INDICES}
    ports:
      - "4000:4000"
    depends_on:
      - elasticsearch

  reports-ui:
    build: ./client
    environment:
      - VITE_API_URL=http://reports-api:4000/api/v1
    ports:
      - "3000:80"
    depends_on:
      - reports-api

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  elasticsearch_data:
```

## Sample Configurations

### Development Configuration

#### Server (.env)
```env
NODE_ENV=development
PORT=4000
ES_HOST=http://localhost:9200
ES_USERNAME=elastic
ES_PASSWORD=changeme
ES_ALLOWED_INDICES=kibana_sample_data_*,test-*
DEFAULT_USER_ROLE=reports-admin
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=debug
```

#### Client (.env)
```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_USER_ROLE=reports-admin
VITE_USERNAME=developer
```

### Staging Configuration

#### Server (.env)
```env
NODE_ENV=staging
PORT=4000
ES_HOST=https://elasticsearch-staging.company.com:9200
ES_API_KEY=staging_api_key_here
ES_ALLOWED_INDICES=staging-logs-*,staging-metrics-*
DEFAULT_USER_ROLE=reports-viewer
CORS_ORIGIN=https://reports-staging.company.com
RATE_LIMIT_MAX_REQUESTS=75
LOG_LEVEL=info
```

#### Client (.env)
```env
VITE_API_URL=https://reports-staging.company.com/api/v1
VITE_USER_ROLE=reports-viewer
VITE_USERNAME=staging-user
```

### Production Configuration

#### Server (.env)
```env
NODE_ENV=production
PORT=4000
ES_HOST=https://elasticsearch.company.com:9200
ES_API_KEY=${ES_API_KEY}
ES_ALLOWED_INDICES=prod-logs-*,prod-metrics-*,prod-events-*
DEFAULT_USER_ROLE=reports-viewer
CORS_ORIGIN=https://reports.company.com
RATE_LIMIT_MAX_REQUESTS=50
LOG_LEVEL=warn
```

#### Client (.env)
```env
VITE_API_URL=https://reports.company.com/api/v1
VITE_USER_ROLE=reports-viewer
VITE_USERNAME=production-user
```

## Troubleshooting

### Common Configuration Issues

#### 1. Elasticsearch Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:9200
```
**Solutions:**
- Verify `ES_HOST` is correct
- Check Elasticsearch is running
- Verify network connectivity
- Check firewall rules

#### 2. Authentication Failed
```
Error: [security_exception] unable to authenticate user
```
**Solutions:**
- Verify `ES_USERNAME` and `ES_PASSWORD`
- Check API key validity
- Ensure user has required permissions

#### 3. Index Access Denied
```
Error: Access denied to index: logs-2024
```
**Solutions:**
- Add index pattern to `ES_ALLOWED_INDICES`
- Verify Elasticsearch user permissions
- Check index exists and is accessible

#### 4. CORS Errors
```
Error: Access to fetch at 'http://localhost:4000' blocked by CORS policy
```
**Solutions:**
- Add frontend URL to `CORS_ORIGIN`
- Ensure URLs match exactly (including protocol)
- Check for trailing slashes

#### 5. Role Access Issues
```
Error: Admin access required
```
**Solutions:**
- Set `VITE_USER_ROLE=reports-admin` in client
- Verify `DEFAULT_USER_ROLE` in server
- Restart both client and server

### Configuration Validation

#### Test Elasticsearch Connection
```bash
curl -X GET "localhost:9200/_cluster/health" -u elastic:password
```

#### Test API Endpoints
```bash
# Health check
curl http://localhost:4000/health

# List indices
curl -H "X-User-Role: reports-admin" http://localhost:4000/api/v1/indices
```

#### Verify Client Configuration
```bash
# Check environment variables are loaded
console.log(import.meta.env.VITE_API_URL)
```

### Log Analysis

#### Server Logs
```bash
# Monitor server logs
tail -f server/logs/app.log

# Debug connection issues
DEBUG=elasticsearch* npm run dev
```

#### Common Log Messages
```
INFO: Server running on port 4000
INFO: Created configuration index: reports_datapoints
ERROR: Failed to initialize configuration indices
WARN: Rate limit exceeded for IP: 192.168.1.100
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Monitor Elasticsearch Health**
   ```bash
   curl -X GET "localhost:9200/_cluster/health"
   ```

2. **Check Configuration Indices Size**
   ```bash
   curl -X GET "localhost:9200/reports_*/_stats"
   ```

3. **Rotate Log Files**
   ```bash
   # Configure log rotation in production
   logrotate /etc/logrotate.d/reports-tool
   ```

4. **Update Dependencies**
   ```bash
   npm audit fix
   npm update
   ```

### Backup and Recovery

#### Configuration Backup
```bash
# Backup configuration indices
curl -X POST "localhost:9200/reports_*/_snapshot/backup/config_backup"
```

#### Environment Backup
```bash
# Backup environment files
cp server/.env server/.env.backup
cp client/.env client/.env.backup
```

For additional support, refer to the main README.md or create an issue in the repository.