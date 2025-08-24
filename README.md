# DHR (Digit Health Reports) - Phase 1

A comprehensive health reporting dashboard built with React and Elasticsearch, providing direct query capabilities and data visualization.

## Architecture Overview

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: Redux Toolkit
- **Charts**: ECharts for data visualization
- **Code Editor**: Monaco Editor for query input
- **Build Tool**: Vite

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express.js
- **Database**: Elasticsearch 8.x
- **Language**: TypeScript
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

## Recent Updates

### QueryGuidelines Component Refactoring

The QueryGuidelines component has been refactored to use a configuration-driven approach:

#### Changes Made:
1. **Configuration File**: Created `client/src/configs/queryGuidelines.json` containing:
   - Dynamic tab categories and labels
   - Query examples with titles and code snippets
   - Configurable tips and help text

2. **Component Updates**: 
   - Removed hardcoded query examples
   - Added TypeScript interfaces for type safety
   - Made tabs and content dynamically generated from JSON config

#### Benefits:
- **Maintainability**: Easy to add/remove/modify query examples without touching component code
- **Flexibility**: Number of tabs and content automatically adjusts based on configuration
- **Consistency**: Centralized configuration ensures consistent formatting
- **Extensibility**: Easy to add new query categories or modify existing ones

## Project Structure

```
reports/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── common/     # Shared UI components
│   │   │   ├── layout/     # Layout components
│   │   │   └── query/      # Query-specific components
│   │   ├── configs/        # Configuration files
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── store/          # Redux store
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── controllers/    # Route controllers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- Elasticsearch 8.x
- npm or yarn

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd reports
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd server
   npm install
   
   # Frontend
   cd ../client
   npm install
   ```

3. **Environment Configuration**
   
   Configure server environment in `server/.env`:
   ```env
   NODE_ENV=development
   PORT=3002
   ELASTICSEARCH_HOST=http://localhost:9200
   ELASTICSEARCH_USERNAME=elastic
   ELASTICSEARCH_PASSWORD=your_password
   ALLOWED_HEALTH_INDEXES=project-index-v1,household-index-v1,project-task-index-v1
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

4. **Start Services**
   
   **Option 1: Development Mode**
   ```bash
   # Terminal 1: Start backend
   cd server
   npm run dev
   
   # Terminal 2: Start frontend
   cd client
   npm run dev
   ```
   
   **Option 2: Port Forward Elasticsearch (if using Kubernetes)**
   ```bash
   kubectl port-forward svc/elasticsearch 9200:9200
   ```

### Testing

```bash
# Frontend tests
cd client
npm test

# Backend tests
cd server
npm test

# Run with coverage
npm test -- --coverage
```

### Building for Production

```bash
# Build backend
cd server
npm run build

# Build frontend
cd client
npm run build
```

## Features

- **Direct Query Interface**: Monaco editor with Elasticsearch query support
- **Dynamic Query Guidelines**: Configurable query examples and help
- **Data Visualization**: Interactive charts and tables
- **Export Functionality**: Excel export capabilities
- **Index Management**: Multi-index query support
- **Error Handling**: Comprehensive error display and handling
- **Responsive Design**: Mobile-friendly interface

## API Documentation

### Query Endpoints

#### POST /api/query/direct
Execute direct Elasticsearch queries

**Request Body:**
```json
{
  "index": "project-index-v1",
  "query": {
    "match_all": {}
  },
  "size": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "hits": [...],
    "total": 1234,
    "aggregations": {...}
  }
}
```

## Configuration

### Query Guidelines Configuration

The query guidelines are now configurable via JSON. Edit `client/src/configs/queryGuidelines.json`:

```json
{
  "title": "Query Examples & Guidelines",
  "categories": [
    {
      "label": "Basic Queries",
      "examples": [
        {
          "title": "Match All Documents:",
          "code": "{\n  \"query\": {\n    \"match_all\": {}\n  },\n  \"size\": 10\n}"
        }
      ]
    }
  ],
  "tips": "💡 Tip: Modify field names to match your index schema."
}
```

## Contributing

1. Follow the existing code style and patterns
2. Add unit tests for new components/functions
3. Update documentation for any configuration changes
4. Ensure TypeScript types are properly defined

## License

MIT License