# DHR - Digit Health Reports Platform

## 🎯 Overview

DHR (Digit Health Reports) is a comprehensive Elasticsearch query interface platform that provides multiple ways to query and analyze health data. The platform offers three distinct user interfaces designed for different user types and use cases.

## 📋 Current Status: **Production Ready - Phase 1 Complete** ✅

### ✅ **Implemented Features**
- **Direct Query Interface** - Raw Elasticsearch JSON query editor
- **Visual Query Builder** - No-code query construction interface  
- **Auto Query Interface** - URL parameter-driven query execution
- **Shared Component Architecture** - Reusable hooks and components
- **Excel Export** - Common export functionality across all interfaces
- **Field Discovery** - Dynamic field mapping from Elasticsearch indices
- **Smart Query Generation** - Type-aware operator suggestions
- **URL Sharing** - Generate shareable query URLs
- **Column Management** - Advanced filtering and selection
- **Error Handling** - Comprehensive error messages and validation

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ 
- Elasticsearch 7.x or 8.x cluster
- Yarn package manager

### **Environment Setup**

#### **Backend Configuration**
```bash
# server/.env
ELASTICSEARCH_HOST=http://localhost:9200
ELASTICSEARCH_USERNAME=<your_username>
ELASTICSEARCH_PASSWORD=<your_password>
ALLOWED_HEALTH_INDEXES=project-index-v1,project-task-index-v1,household-index-v1,stock-index-v1
CORS_ORIGIN=http://localhost:3000
PORT=3004
NODE_ENV=development
SKIP_ELASTICSEARCH_HEALTH_CHECK=true
```

### **Installation & Running**

#### **Backend**
```bash
cd server
npm install
npm run build
npm start
# Server runs on http://localhost:3004
```

#### **Frontend**  
```bash
cd client
yarn install
yarn start
# Client runs on http://localhost:3000
# API proxy: http://localhost:3000/api -> http://localhost:3004/api
```

---

## 💻 User Interfaces

### 1. **Direct Query Interface** `/direct-query`
**Target Users**: Technical users, developers, data analysts  
**Purpose**: Full control over Elasticsearch query DSL

**Features**:
- ✅ Raw JSON query editor with syntax highlighting
- ✅ Interactive query guidelines and examples  
- ✅ Advanced column filtering and management
- ✅ Session-based column preferences
- ✅ Full Excel export with field selection
- ✅ ShareableLink generation for Auto Query URLs
- ✅ Real-time query validation
- ✅ Pagination controls (from/size parameters)

### 2. **Visual Query Builder** `/query-builder` 
**Target Users**: Business users, non-technical analysts  
**Purpose**: No-code query construction

**Features**:
- ✅ Field discovery from Elasticsearch mappings
- ✅ Smart operator suggestions based on field types
- ✅ Visual query construction with AND/OR logic
- ✅ Real-time Elasticsearch JSON generation (toggleable preview)
- ✅ Type-safe field selection with autocomplete
- ✅ Query summary with visual chips
- ✅ Excel export of results
- ✅ ShareableLink generation

**Supported Field Types & Operators**:
- **Text fields**: match, match_phrase, wildcard, prefix, regex
- **Keyword fields**: term, terms, prefix, wildcard, regex  
- **Numeric fields**: term, range, gt, gte, lt, lte
- **Date fields**: term, range, gt, gte, lt, lte
- **All fields**: exists, missing

### 3. **Auto Query Interface** `/auto-query` (Hidden from Navigation)
**Target Users**: Embedded applications, shared URLs  
**Purpose**: URL parameter-driven query execution

**Features**:
- ✅ URL parameter parsing with smart field detection
- ✅ Automatic query execution on load
- ✅ Support for nested field paths (e.g., `Data.boundaryHierarchy.country`)
- ✅ Smart `.keyword` suffix handling for text fields
- ✅ Visual filter chips with remove capability
- ✅ Excel export functionality
- ✅ Real-time URL parameter visualization

---

## 🏗️ Architecture

### **Frontend Architecture**
```
┌─────────────────────────────────────────────────────────────┐
│                DHR Frontend Application                    │
├─────────────────────────────────────────────────────────────┤
│  Direct Query     │  Query Builder   │  Auto Query (hidden) │
│  - JSON Editor    │  - Visual Fields │  - URL Parameters    │
│  - Manual Query   │  - No-Code UI    │  - Auto Execution    │
│  - Column Filter  │  - Field Types   │  - Shareable Links   │
├─────────────────────────────────────────────────────────────┤
│              Shared Component Architecture                  │
│  useElasticsearchQuery │ useExcelExport │ QueryExecutionCard │
│  - State Management    │ - Excel Export │ - Index Selection   │
│  - Query Execution     │ - Data Format  │ - Query Interface   │
│  - Error Handling      │ - File Download│ - Share Links       │
└─────────────────────────────────────────────────────────────┘
```

### **Technology Stack**
#### **Frontend (React + TypeScript)**
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **Routing**: React Router v6
- **State Management**: React Hooks + Context (Redux removed for simplicity)
- **Build Tool**: Vite
- **Export**: xlsx library for Excel export

#### **Backend (Node.js + Express)**
- **Runtime**: Node.js with Express.js
- **Database**: Elasticsearch 7.x/8.x
- **Language**: TypeScript
- **Logging**: Winston structured logging
- **Security**: Index access control, query validation, CORS

---

## 🔧 Technical Implementation

### **Shared Component Architecture**

#### **Custom Hooks**
- **`useElasticsearchQuery`** - Centralized query state management and execution
- **`useElasticsearchPagination`** - Reusable pagination logic
- **`useExcelExport`** - Common Excel export functionality

#### **Reusable Components**
- **`QueryExecutionCard`** - Shared query interface (index selection, execution)
- **`QueryResultsSection`** - Unified results display with aggregations
- **`QueryBuilder`** - Visual query construction component
- **`ShareableLink`** - Auto Query URL generation
- **`ExportActions`** - Excel export with column filtering

#### **Utility Functions**
- **`mappingUtils.ts`** - Elasticsearch field extraction and query generation
- **`excelExport.ts`** - Excel file creation and download
- **Column preferences** - Session-based column selection persistence

### **Performance Optimizations**
- ✅ **`_source` field filtering** - Reduces response payload size
- ✅ **Client-side pagination** - Efficient data handling
- ✅ **Session-based preferences** - Maintains user column selections
- ✅ **Smart caching** - Avoids redundant field mapping requests
- ✅ **Real-time validation** - Prevents invalid queries

### **Code Quality Achievements**
- ✅ **~400+ lines of duplicate code eliminated** through shared architecture
- ✅ **Consistent error handling** across all interfaces
- ✅ **Type-safe implementation** with comprehensive TypeScript support
- ✅ **Modular architecture** with reusable components and hooks

---

## 📊 API Endpoints

### **Core Endpoints**
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/direct-query` | Execute Elasticsearch queries |
| `GET` | `/api/direct-query/indexes` | Get available indexes |
| `GET` | `/api/direct-query/indexes/{index}/mapping` | Get field mappings |

### **Request/Response Format**
All API responses follow a consistent structure:
```json
{
  "success": true,
  "data": <response_data>,
  "meta": {
    "operationId": "abc123",
    "totalTime": "150ms", 
    "timestamp": "2025-08-24T11:30:00.000Z"
  }
}
```

**📚 Full API Documentation**: [docs/API_SPECIFICATION.md](docs/API_SPECIFICATION.md)

---

## 🗂️ Project Structure

```
reports/
├── server/                 # Backend API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript definitions
│   ├── dist/               # Compiled JavaScript
│   └── package.json
├── client/                 # Frontend React App
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── common/     # Shared components
│   │   │   ├── layout/     # Layout components
│   │   │   └── query/      # Query-specific components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API services
│   │   ├── utils/          # Utility functions
│   │   ├── pages/          # Page components
│   │   └── types/          # TypeScript definitions
│   ├── dist/               # Built assets
│   └── package.json
├── docs/                   # Documentation
│   ├── API_SPECIFICATION.md
│   └── ARCHITECTURE.md
└── README.md
```

---

## 🔒 Security & Access Control

### **Index Access Control**
- Only pre-configured indexes accessible via `ALLOWED_HEALTH_INDEXES`
- All requests validate index permissions before execution
- No arbitrary index access or system index exposure

### **Query Validation**
- JSON query syntax validation
- Parameter sanitization and bounds checking
- Elasticsearch injection prevention

---

## 🎯 Business Value Delivered

### **Multi-User Support**
- **Technical Users**: Full JSON query control via DirectQuery
- **Business Users**: No-code query building via QueryBuilder  
- **Dashboard Integration**: URL-driven queries via AutoQuery

### **Operational Efficiency**  
- **Shared Architecture**: ~400+ lines of code elimination
- **Consistent Interface**: Same export/sharing across all query types
- **Session Management**: Persistent user preferences
- **Error Handling**: Clear, actionable error messages

### **Data Analysis Capabilities**
- **Flexible Querying**: From simple filters to complex aggregations
- **Data Export**: Excel export with column filtering
- **Query Sharing**: Generate URLs for collaboration
- **Real-time Feedback**: Live query validation and results

---

## 🧪 Testing & Development

### **Development Workflow**
```bash
# Backend development
cd server
npm run dev          # Development mode with auto-reload
npm run build        # Production build
npm test            # Run tests (when available)

# Frontend development  
cd client
yarn dev            # Development mode with HMR
yarn build          # Production build
yarn test           # Run tests (when available)
```

### **API Testing**
```bash
# Test basic connectivity
curl http://localhost:3004/api/direct-query/indexes

# Test query execution
curl -X POST http://localhost:3004/api/direct-query \
  -H "Content-Type: application/json" \
  -d '{"index":"project-index-v1","query":{"query":{"match_all":{}}}}'
```

---

## 🔮 Future Roadmap (Planned Features)

### **Phase 2: Advanced Features**
- **Filter Library**: Save and organize frequently used queries
- **Dashboard System**: Interactive data visualization with Apache ECharts
- **Scheduled Reports**: Automated query execution and export
- **Advanced Export**: Multiple formats (CSV, JSON, PDF)

### **Phase 3: Enterprise Features**
- **User Authentication & Authorization**
- **Query Performance Analytics** 
- **Advanced Caching Layer**
- **Multi-tenant Support**

---

## 📞 Support & Contact

For questions, issues, or feature requests:
- **Technical Issues**: Check server logs and API responses
- **Feature Requests**: Document requirements and use cases
- **Bug Reports**: Include `operationId` from API responses

---

**Last Updated**: August 2025  
**Version**: 1.0.0 - Phase 1 Complete ✅

*This README reflects the current state of the DHR platform with all implemented features and functionality.*