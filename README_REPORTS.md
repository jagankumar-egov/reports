# Elasticsearch Reports Tool

A web-based reporting tool that connects to Elasticsearch indices, allowing users to create data points, build dashboards, and export data. Built with React, Material UI, ECharts, and Node.js.

## Features

- 📊 **Dashboard Creation**: Build interactive dashboards with multiple visualization types
- 📈 **Data Visualization**: Support for bar, line, area, pie charts, tables, and KPIs using ECharts
- 🔍 **Data Points**: Define reusable queries and aggregations
- 📁 **Export Functionality**: Export dashboard data to CSV format
- 🔒 **Secure Access**: Environment-based role configuration (Admin/Viewer)
- 🎨 **Material Design**: Clean, modern UI using Material UI components
- ⚡ **Real-time Data**: Query live Elasticsearch data

## Architecture

```
├── client/          # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   └── theme/       # Material UI theme configuration
│   └── package.json
│
├── server/          # Node.js backend API
│   ├── src/
│   │   ├── config/      # Configuration management
│   │   ├── controllers/ # Request handlers
│   │   ├── services/    # Business logic
│   │   └── middleware/  # Express middleware
│   └── package.json
│
└── docs/            # Documentation
```

## Prerequisites

- Node.js 18+ and npm/yarn
- Elasticsearch 7.10+ or 8.x cluster
- Access to Elasticsearch indices with read permissions
- Write permissions for configuration indices (reports_datapoints, reports_dashboards, reports_audit)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd reports
```

### 2. Server Setup

```bash
cd server
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your Elasticsearch configuration

# Start the server
npm run dev
```

### 3. Client Setup

```bash
cd client
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the client
npm run dev
```

### 4. Access the Application

Open your browser and navigate to:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## Configuration

### Server Configuration (.env)

```env
# Server Configuration
NODE_ENV=development
PORT=4000

# Elasticsearch Configuration
ES_HOST=http://localhost:9200
ES_USERNAME=elastic
ES_PASSWORD=your_password
# OR use API key instead of username/password
ES_API_KEY=your_api_key

# Allowed Indices (comma-separated, supports wildcards)
ES_ALLOWED_INDICES=logs-*,metrics-*,events-*

# User Role Configuration
DEFAULT_USER_ROLE=reports-admin  # or reports-viewer

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
```

### Client Configuration (.env)

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_USER_ROLE=reports-admin  # or reports-viewer
VITE_USERNAME=admin
```

## User Roles

The system supports two roles configured at the environment level:

### Reports Admin
- Full access to all features
- Can create, edit, and delete data points
- Can create, edit, and delete dashboards
- Can view and export data

### Reports Viewer
- Read-only access
- Can view dashboards
- Can apply runtime filters
- Can export data
- Cannot modify configurations

## Using Test Data

### Option 1: Kibana Sample Data

1. Install Kibana sample data sets:
   - Go to Kibana → Home → Add sample data
   - Install "Sample eCommerce orders", "Sample web logs", or "Sample flight data"

2. Configure allowed indices:
   ```env
   ES_ALLOWED_INDICES=kibana_sample_data_*
   ```

### Option 2: Create Test Index

```bash
# Create a test index with sample data
curl -X POST "localhost:9200/test-events/_doc" -H 'Content-Type: application/json' -d'
{
  "timestamp": "2024-01-15T10:00:00Z",
  "event_type": "login",
  "user": "john.doe",
  "location": "New York",
  "status": "success",
  "response_time": 125
}'

# Add more sample documents as needed
```

Configure allowed indices:
```env
ES_ALLOWED_INDICES=test-*
```

## Creating Your First Dashboard

### Step 1: Create a Data Point

1. Navigate to **Data Points** (Admin only)
2. Click the **+** button
3. Fill in:
   - **Name**: "User Events"
   - **Slug**: "user-events"
   - **Source Indices**: Select your test index
   - **Time Field**: "timestamp" (if applicable)
4. Click **Save**

### Step 2: Create a Dashboard

1. Navigate to **Dashboards**
2. Click the **+** button
3. Fill in:
   - **Name**: "Activity Dashboard"
   - **Slug**: "activity-dashboard"
4. Add widgets:
   - Click **Add Widget**
   - Configure widget type (Bar, Line, Table, etc.)
   - Select the data point created earlier
5. Click **Save**

### Step 3: View Dashboard

1. Go to **Dashboards**
2. Click **View** on your dashboard
3. Apply filters and time ranges as needed
4. Export data using the **Export** button

## API Endpoints

### Indices
- `GET /api/v1/indices` - List allowed indices
- `GET /api/v1/indices/:index/mapping` - Get field mappings

### Data Points
- `GET /api/v1/datapoints` - List all data points
- `POST /api/v1/datapoints` - Create data point (Admin)
- `GET /api/v1/datapoints/:id` - Get data point
- `PUT /api/v1/datapoints/:id` - Update data point (Admin)
- `DELETE /api/v1/datapoints/:id` - Archive data point (Admin)
- `POST /api/v1/datapoints/:id/run` - Execute data point query
- `POST /api/v1/datapoints/:id/export` - Export data point results

### Dashboards
- `GET /api/v1/dashboards` - List all dashboards
- `POST /api/v1/dashboards` - Create dashboard (Admin)
- `GET /api/v1/dashboards/:id` - Get dashboard
- `PUT /api/v1/dashboards/:id` - Update dashboard (Admin)
- `DELETE /api/v1/dashboards/:id` - Archive dashboard (Admin)
- `POST /api/v1/dashboards/:id/run` - Execute dashboard queries
- `POST /api/v1/dashboards/:id/export` - Export dashboard data

## Production Deployment

### Using Docker

```dockerfile
# Server Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

### Environment Variables

For production, ensure you:
1. Set `NODE_ENV=production`
2. Use secure passwords and API keys
3. Configure CORS origins properly
4. Use HTTPS for all connections
5. Set appropriate rate limits

### Build Commands

```bash
# Build server
cd server
npm run build

# Build client
cd client
npm run build
```

## Troubleshooting

### Common Issues

1. **Cannot connect to Elasticsearch**
   - Verify ES_HOST is correct
   - Check network connectivity
   - Ensure credentials are valid

2. **Access denied to indices**
   - Check ES_ALLOWED_INDICES configuration
   - Ensure indices exist and are accessible
   - Verify Elasticsearch permissions

3. **CORS errors**
   - Update CORS_ORIGIN in server .env
   - Ensure frontend URL is allowed

4. **Role-based access not working**
   - Check VITE_USER_ROLE in client .env
   - Verify DEFAULT_USER_ROLE in server .env

## Security Considerations

- **No Direct Queries**: The system doesn't allow arbitrary Elasticsearch queries
- **Index Access Control**: Only configured indices are accessible
- **Read-Only Data Access**: Source indices are never modified
- **Configuration Isolation**: All configurations stored in dedicated indices
- **Environment-Based Security**: Sensitive configuration kept in environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions, please create an issue in the repository.