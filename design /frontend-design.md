# DHR Frontend Design Document

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Current Implementation Status](#current-implementation-status)
4. [Phase 1: Query Interfaces - COMPLETED](#phase-1-query-interfaces---completed)
5. [Shared Architecture & Components](#shared-architecture--components)
6. [Phase 2: Advanced Features (Planned)](#phase-2-advanced-features-planned)
7. [Implementation Insights](#implementation-insights)
8. [API Documentation](#api-documentation)

---

## Architecture Overview

### Actual Implementation Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                DHR Frontend Application - Phase 1          │
│                     ✅ COMPLETED & DEPLOYED                │
├─────────────────────────────────────────────────────────────┤
│ Direct Query │ Auto Query │ Query Builder │ Multi-Index Join │
│ - Manual ES  │ - URL Param │ - Visual UI   │ - Cross-Index   │
│ - JSON Edit  │ - Auto Exec │ - Field-Based │ - Join Types    │
│ - Columns    │ - Filters   │ - No-Code     │ - Table Export  │
├─────────────────────────────────────────────────────────────┤
│              Shared Component Architecture                  │
│  QueryExecutionCard │ QueryResultsSection │ useElasticsearch│
│  - Index Selection   │ - Table Display     │ - Query Hook    │
│  - Query Execution   │ - Pagination        │ - Pagination    │
│  - ShareableLink     │ - Export Actions    │ - Error Handle  │
└─────────────────────────────────────────────────────────────┘
│
├── Shared Hooks Layer (Custom React Hooks)
│   ├── useElasticsearchQuery     ├── useElasticsearchPagination
│   ├── useMultiIndexJoin        ├── useSavedQueries  
│   ├── Query State Management    ├── Results Formatting
│   └── Error Handling           └── Performance Optimization
│
├── Common Components Layer
│   ├── QueryExecutionCard       ├── QueryResultsSection
│   ├── QueryBuilder            ├── ShareableLink
│   ├── DataTable              ├── IndexSelector
│   └── ErrorDisplay           └── LoadingSpinner
│
├── API Layer (Axios-based)
│   ├── directQueryAPI.execute()        ├── directQueryAPI.getIndexes()
│   ├── directQueryAPI.getIndexMapping()├── Error Response Transformation
│   └── Request/Response Interceptors   └── Structured Error Handling
│
└── Utility Layer
    ├── mappingUtils (ES Field Extraction)  ├── excelExport (Data Export)
    ├── Column Preferences Management       ├── Error Message Enhancement
    └── Performance Optimization Helpers   └── Query Validation
```

---

## Technology Stack

### Core Technologies ✅ **IMPLEMENTED**
```json
{
  "framework": "React 18.x with TypeScript",
  "ui_library": "Material-UI (MUI) v5",
  "routing": "React Router v6",
  "state_management": "React Hooks + Context (Redux removed for simplicity)",
  "styling": "MUI System + Emotion",
  "build_tool": "Vite",
  "api_client": "Axios with custom interceptors"
}
```

### Additional Libraries ✅ **IMPLEMENTED**
```json
{
  "data_export": "xlsx (Excel export)",
  "icons": "@mui/icons-material",
  "notifications": "Custom notification system",
  "file_handling": "Built-in file download",
  "forms": "Native React form handling",
  "query_validation": "JSON parsing with error handling"
}
```

### Project Structure ✅ **ACTUAL IMPLEMENTATION**
```
src/
├── components/
│   ├── common/                 # 14+ Shared Components
│   │   ├── QueryExecutionCard.tsx    # Reusable query interface
│   │   ├── QueryResultsSection.tsx   # Reusable results display
│   │   ├── QueryBuilder.tsx          # Visual query builder
│   │   ├── DataTable.tsx             # Enhanced data grid
│   │   ├── ShareableLink.tsx         # URL generation for Auto Query
│   │   ├── IndexSelector.tsx         # ES index selection
│   │   ├── ExportActions.tsx         # Excel export functionality
│   │   └── ErrorDisplay.tsx          # Structured error handling
│   ├── layout/                # Navigation & App Structure
│   │   ├── AppBar.tsx               # Application header
│   │   └── Sidebar.tsx              # Phase-based navigation
│   └── query/                 # Query-specific Components
│       ├── DirectQuery.tsx          # Manual ES query interface
│       ├── AutoQuery.tsx            # URL-driven queries
│       └── QueryBuilderPage.tsx     # Visual query building
├── hooks/                     # Custom React Hooks
│   ├── useElasticsearchQuery.ts     # Query state & execution
│   └── useElasticsearchPagination.ts # Pagination logic
├── pages/                     # Page Wrappers
│   ├── DirectQueryPage.tsx          # /direct-query route
│   ├── AutoQueryPage.tsx            # /auto-query route
│   └── QueryBuilderPage.tsx         # /query-builder route
├── services/                  # API Services
│   └── api.ts                       # Elasticsearch API client
├── utils/                     # Utility Functions
│   ├── mappingUtils.ts              # ES field mapping extraction
│   └── excelExport.ts               # Excel export functionality
└── types/                     # TypeScript Definitions
    └── index.ts                     # API & component types
```

---

## Current Implementation Status

### ✅ **COMPLETED FEATURES (Phase 1)**

#### **Four Query Interfaces Successfully Deployed:**

1. **Direct Query Interface** (`/direct-query`)
   - ✅ Manual Elasticsearch JSON query editor
   - ✅ Syntax highlighting and validation
   - ✅ Interactive query guidelines with examples
   - ✅ Advanced column filtering and management
   - ✅ Session-based column preferences
   - ✅ Full Excel export with customizable fields
   - ✅ ShareableLink integration for generating Auto Query URLs

2. **Auto Query Interface** (`/auto-query`)  
   - ✅ URL parameter-driven query generation
   - ✅ Automatic query execution on load
   - ✅ Visual filter management with chips
   - ✅ Support for nested field paths (e.g., `Data.boundaryHierarchy.country`)
   - ✅ Smart .keyword suffix handling for text fields
   - ✅ URL copying and sharing functionality
   - ✅ Real-time URL parameter visualization

3. **Visual Query Builder** (`/query-builder`) 🆕
   - ✅ Field discovery from Elasticsearch mappings
   - ✅ Smart operator suggestions based on field types
   - ✅ Visual query construction with AND/OR logic
   - ✅ Real-time Elasticsearch JSON generation
   - ✅ No-code interface for business users
   - ✅ Integration with shared execution engine

4. **Multi-Index Join** (`/multi-index-join`) 🆕
   - ✅ Cross-index data joining with four join types (Inner, Left, Right, Full)
   - ✅ Automatic field discovery with dropdown selectors
   - ✅ Real-time join preview with compatibility checking
   - ✅ Advanced table view with flattened column structure
   - ✅ Smart column merging and index differentiation
   - ✅ WYSIWYG Excel export with pagination support
   - ✅ Debounced requests to prevent API overload

#### **Shared Architecture Achievements:**

- ✅ **Code Deduplication**: ~400+ lines of duplicate code eliminated
- ✅ **useElasticsearchQuery Hook**: Centralized query state management
- ✅ **useElasticsearchPagination Hook**: Reusable pagination logic
- ✅ **QueryExecutionCard Component**: Shared query interface
- ✅ **QueryResultsSection Component**: Shared results display
- ✅ **Consistent Error Handling**: Structured API error messages
- ✅ **Performance Optimization**: `_source` filtering for large datasets

---

## Phase 1: Query Interfaces - ✅ COMPLETED

### 1.1 Direct Query Interface

#### **Architecture & Features**
```typescript
// ✅ IMPLEMENTED - DirectQuery Component
const DirectQuery: React.FC = () => {
  // Shared hooks for consistency
  const query = useElasticsearchQuery({
    onResult: (result) => {
      setLastQueryWasFiltered(queryUsesFiltering);
      pagination.resetPagination();
    },
  });
  const pagination = useElasticsearchPagination(10);
  
  // DirectQuery-specific features
  const [from, setFrom] = useState<number>(0);
  const [size, setSize] = useState<number>(10);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  // ... column management logic
};
```

#### **Key Features:**
- **Manual JSON Editing**: Full Elasticsearch query syntax support
- **Interactive Guidelines**: Tabbed examples (Basic, Filters, Aggregations, Advanced)
- **Advanced Column Management**: Select/deselect columns with session persistence
- **Performance Optimization**: `_source` filtering to reduce payload size
- **Excel Export**: Full dataset export with customizable column selection
- **ShareableLink Integration**: Generate Auto Query URLs from current filters

### 1.2 Auto Query Interface

#### **Architecture & Features**
```typescript
// ✅ IMPLEMENTED - AutoQuery Component
const AutoQuery: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useElasticsearchQuery();
  const pagination = useElasticsearchPagination(10);
  
  // URL parameter parsing with smart field detection
  const defaultFilters = useMemo(() => {
    const filters: DefaultFilter[] = [];
    searchParams.forEach((value, key) => {
      // Handle nested field paths with .keyword suffix logic
      if (key.includes('.')) {
        const fieldNeedsKeyword = !key.endsWith('.keyword') && 
                                 !key.includes('_id') && 
                                 !key.includes('count');
        filters.push({
          field: fieldNeedsKeyword ? `${key}.keyword` : key,
          operator: 'term',
          value: value,
          type: 'term',
          label: `${key}: ${value}`,
        });
      }
      // ... other filter patterns
    });
    return filters;
  }, [searchParams]);
};
```

#### **Key Features:**
- **URL Parameter Parsing**: Automatic filter extraction from URL
- **Smart Field Handling**: Automatic `.keyword` suffix for text fields
- **Auto-Execution**: Queries run automatically when conditions are met
- **Filter Visualization**: Visual chips for applied filters with remove capability
- **Nested Field Support**: Full support for `Data.boundaryHierarchy.country` syntax
- **URL Management**: Copy, modify, and share query URLs

### 1.3 Visual Query Builder 🆕

#### **Architecture & Features**
```typescript
// ✅ IMPLEMENTED - QueryBuilder Component
interface QueryBuilderProps {
  fields: FieldInfo[];
  loading?: boolean;
  onQueryGenerated: (query: any) => void;
}

// Field extraction from Elasticsearch mappings
export function extractFieldsFromMapping(mapping: any): FieldInfo[] {
  const fields: FieldInfo[] = [];
  
  function traverseMapping(properties: any, path = '') {
    Object.entries(properties).forEach(([fieldName, fieldDef]: [string, any]) => {
      const fullPath = path ? `${path}.${fieldName}` : fieldName;
      
      if (fieldDef.type) {
        const fieldInfo: FieldInfo = {
          name: fieldName,
          type: fieldDef.type,
          fullPath,
          isAnalyzed: fieldDef.type === 'text',
          isKeyword: fieldDef.type === 'keyword',
          isNumeric: ['integer', 'long', 'double', 'float'].includes(fieldDef.type),
          isDate: fieldDef.type === 'date',
          hasKeywordVariant: fieldDef.fields?.keyword ? true : false,
        };
        fields.push(fieldInfo);
      }
    });
  }
  
  return fields.sort((a, b) => a.fullPath.localeCompare(b.fullPath));
}
```

#### **Key Features:**
- **Field Discovery**: Automatic field extraction from ES index mappings
- **Smart Operators**: Context-aware operator suggestions (term, match, range, etc.)
- **Visual Construction**: Drag-and-drop interface with AND/OR logic
- **Real-time Preview**: Live Elasticsearch JSON generation
- **Type Safety**: Full TypeScript support with field type detection
- **No-Code Experience**: Business users can build queries without JSON knowledge

### 1.4 Multi-Index Join 🆕

#### **Architecture & Features**
```typescript
// ✅ IMPLEMENTED - Multi-Index Join System
interface JoinConfiguration {
  leftIndex: string;
  rightIndex: string; 
  joinField: { left: string; right: string; };
  joinType: 'inner' | 'left' | 'right' | 'full';
  fieldsToReturn?: { left: string[]; right: string[]; };
}

// Backend Service - In-Memory Join Processing
class MultiIndexJoinService {
  async performJoin(joins: JoinConfiguration[]): Promise<MultiIndexJoinResponse>;
  async getJoinPreview(leftIndex: string, rightIndex: string, 
                       leftField: string, rightField: string): Promise<JoinPreviewResponse>;
}

// Frontend Hook
const useMultiIndexJoin = (): UseMultiIndexJoinResult => {
  const [result, setResult] = useState<MultiIndexJoinResponse | null>(null);
  const [preview, setPreview] = useState<JoinPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  
  const executeJoin = useCallback(async (request: MultiIndexJoinRequest) => {
    // Debounced execution with loading states
    const joinResult = await multiIndexJoinService.executeJoin(request);
    setResult(joinResult);
  }, []);
  
  const getPreview = useCallback(async (...args) => {
    // Auto-preview with 500ms debouncing to prevent excessive requests
    const previewResult = await multiIndexJoinService.getJoinPreview(...args);
    setPreview(previewResult);
  }, []);
};
```

#### **Key Features:**

**🔗 Join Operations**
- **Four Join Types**: Inner, Left, Right, Full Outer joins
- **Cross-Index Queries**: Join data from any two Elasticsearch indices
- **Field Path Support**: Full nested field support (`Data.projectId`, `Data.location.country`)
- **Join Preview**: Test compatibility before executing full join

**🎨 Advanced Table View**
- **Flattened Columns**: All nested fields become individual columns
- **Smart Column Merging**: 
  - **Merged View**: Common fields combined into single columns
  - **Separated View**: All fields with index-specific prefixes
- **Index Differentiation**: Color-coded columns (Blue: left index, Red: right index)
- **Column Tooltips**: Hover to see source index information

**📊 Data Processing**
- **In-Memory Joins**: Backend processes joins for up to 1000 records per index
- **Field Auto-Discovery**: Dropdown selectors populated from index mappings
- **Type-Safe Processing**: Proper handling of arrays, objects, dates, and primitives
- **Real-time Preview**: Debounced preview updates (500ms) prevent request storms

**📈 Export & Pagination**
- **WYSIWYG Export**: Download exactly what's visible in table
- **Export Options**: 
  - Current page only
  - All data 
- **Smart Filename**: `join_leftindex_rightindex_merged_page1_2025-01-24.csv`
- **Pagination**: 5/10/25/50 rows per page with sticky headers

**🚀 Performance Features**
- **Debounced Requests**: 500ms debouncing prevents excessive API calls
- **Efficient Field Loading**: Parallel mapping API calls for both indices
- **Lazy Column Processing**: Data flattening only when switching to table view
- **Memory Management**: Proper cleanup of large result sets

#### **User Experience Flow**
1. **Index Selection**: Choose left and right indices from available options
2. **Field Discovery**: Fields automatically populate as dropdowns from index mappings  
3. **Join Configuration**: Select join fields and join type (Inner/Left/Right/Full)
4. **Auto-Preview**: Real-time compatibility check with sample results
5. **Join Execution**: Full join with configurable result limits
6. **Table Analysis**: Switch between preview and structured table view
7. **Export Options**: Download current page or all data as CSV

#### **Technical Implementation**
```typescript
// Smart field flattening for table view
const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
  const flattened: Record<string, any> = {};
  Object.keys(obj || {}).forEach(key => {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = formatCellValue(value);
    }
  });
  return flattened;
};

// Export with exact table representation
const handleExcelExport = async (exportAll = false) => {
  const { columns, rows } = processTableData(join.result.results);
  const dataToExport = exportAll ? rows : rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  
  exportToExcel({
    columns: columns.map(col => col.label),
    rows: dataToExport.map(row => {
      const exportRow: any = {};
      columns.forEach(col => exportRow[col.label] = row[col.id] || '');
      return exportRow;
    })
  }, filename);
};
```

---

## Shared Architecture & Components

### 2.1 Custom Hooks Architecture

#### **useElasticsearchQuery Hook** ✅ **IMPLEMENTED**
```typescript
export interface ElasticsearchQueryResult {
  // State
  selectedIndex: string;
  queryText: string;
  result: DirectQueryResponse | null;
  loading: boolean;
  error: string | null;
  availableIndexes: string[];
  indexesLoading: boolean;

  // Actions
  setSelectedIndex: (index: string) => void;
  setQueryText: (text: string) => void;
  executeQuery: (customFrom?: number, customSize?: number, customSourceFilter?: string[] | boolean) => Promise<void>;
  clearResults: () => void;
  formatResultsForTable: (hits: any[]) => { columns: string[]; rows: any[] };
}

// Centralized query logic used by all three interfaces
export const useElasticsearchQuery = (options: UseElasticsearchQueryOptions = {}): ElasticsearchQueryResult => {
  // ... 200+ lines of shared query logic
};
```

#### **useElasticsearchPagination Hook** ✅ **IMPLEMENTED**
```typescript
export interface ElasticsearchPaginationResult {
  page: number;
  rowsPerPage: number;
  handleChangePage: (event: unknown, newPage: number) => void;
  handleChangeRowsPerPage: (event: React.ChangeEvent<HTMLInputElement>) => void;
  getPaginatedHits: (result: DirectQueryResponse | null) => any[];
  resetPagination: () => void;
}

// Reusable pagination logic across all interfaces
export const useElasticsearchPagination = (initialRowsPerPage: number = 10): ElasticsearchPaginationResult => {
  // ... pagination state and handlers
};
```

### 2.2 Shared Component Architecture

#### **QueryExecutionCard Component** ✅ **IMPLEMENTED**
```typescript
export interface QueryExecutionCardProps {
  // Index selection
  selectedIndex: string;
  availableIndexes: string[];
  onIndexChange: (index: string) => void;
  indexesLoading: boolean;

  // Query configuration  
  queryText: string;
  onQueryChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  
  // Execution
  onExecute: () => void;
  onClear: () => void;
  loading: boolean;

  // Optional DirectQuery specific props
  showFromSize?: boolean;
  from?: number;
  size?: number;
  onFromChange?: (from: number) => void;
  onSizeChange?: (size: number) => void;

  // Customization
  title?: string;
  showQueryGuidelines?: boolean;
  showShareableLink?: boolean;
  children?: React.ReactNode; // For additional buttons
}

// Reusable query interface used by all three pages
const QueryExecutionCard: React.FC<QueryExecutionCardProps> = ({ ... }) => {
  // Unified query execution interface
};
```

#### **QueryResultsSection Component** ✅ **IMPLEMENTED**
```typescript
export interface QueryResultsSectionProps {
  // Data
  result: DirectQueryResponse | null;
  error: string | null;
  loading: boolean;

  // Table data
  columns: string[];
  rows: TableRow[];
  page: number;
  rowsPerPage: number;
  totalHits: number;

  // Event handlers
  onPageChange: (event: unknown, newPage: number) => void;
  onRowsPerPageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRetryError?: () => void;

  // Configuration
  selectedIndex: string;
  emptyMessage?: string;
  showAggregations?: boolean;
  
  // Additional custom content
  additionalActions?: React.ReactNode;
  children?: React.ReactNode;
}

// Unified results display with aggregations, table, and export
const QueryResultsSection: React.FC<QueryResultsSectionProps> = ({ ... }) => {
  // Shared results rendering logic
};
```

### 2.3 API Architecture

#### **Elasticsearch API Client** ✅ **IMPLEMENTED**
```typescript
// Enhanced API service with structured error handling
class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor for tracking and metadata
    this.client.interceptors.request.use((config) => {
      config.headers['X-Request-ID'] = this.generateRequestId();
      config.metadata = { startTime: Date.now() };
      return config;
    });

    // Response interceptor for error transformation
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const apiError = {
          message: error.response?.data?.error?.message || error.message,
          code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
          status: error.response?.status || 500,
          details: error.response?.data?.error?.details,
        };
        return Promise.reject(apiError);
      }
    );
  }

  // Direct query execution
  async executeDirectQuery(request: DirectQueryRequest): Promise<DirectQueryResponse> {
    const response = await this.client.post<ApiResponse<DirectQueryResponse>>('/direct-query', request);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Direct query execution failed');
    }
    return response.data.data;
  }

  // Index discovery
  async getAvailableIndexes(): Promise<string[]> {
    const response = await this.client.get<ApiResponse<string[]>>('/direct-query/indexes');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get available indexes');
    }
    return response.data.data;
  }

  // ✅ NEW - Field mapping discovery for QueryBuilder
  async getIndexMapping(indexName: string): Promise<any> {
    const response = await this.client.get<ApiResponse<any>>(`/direct-query/indexes/${indexName}/mapping`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to get index mapping');
    }
    return response.data.data;
  }
}

// Exported API interface
export const directQueryAPI = {
  execute: (request: DirectQueryRequest) => apiService.executeDirectQuery(request),
  getIndexes: () => apiService.getAvailableIndexes(),
  getIndexMapping: (indexName: string) => apiService.getIndexMapping(indexName), // ✅ NEW
};
```

---

## Phase 2: Advanced Features (Planned)

### 2.1 Filter Management System
- **Filter Library**: Save and organize frequently used queries
- **Filter Sharing**: Team collaboration on query filters  
- **Filter Templates**: Pre-built industry-specific filters
- **Advanced Search**: Full-text search across saved filters

### 2.2 Dashboard & Visualization System
- **Dashboard Builder**: Drag-and-drop dashboard creation
- **Chart Library**: Apache ECharts integration for data visualization
- **Real-time Updates**: Live dashboard refresh capabilities
- **Responsive Layouts**: Mobile-friendly dashboard viewing

### 2.3 Enhanced Export System
- **Multiple Formats**: CSV, Excel, JSON, PDF export options
- **Scheduled Exports**: Automated report generation
- **Export Templates**: Pre-configured export settings
- **Bulk Operations**: Mass export capabilities

### 2.4 Advanced User Experience
- **Interactive Tutorials**: Step-by-step onboarding guides
- **Contextual Help**: In-app help system and documentation
- **Keyboard Shortcuts**: Power user productivity features
- **Accessibility**: WCAG 2.1 AA compliance enhancements

---

## Implementation Insights

### Architecture Decisions ✅ **PROVEN SUCCESSFUL**

#### **1. Shared Hook Architecture**
**Decision**: Extract common query logic into reusable hooks
**Result**: 
- ✅ ~400+ lines of duplicate code eliminated
- ✅ Consistent behavior across all three interfaces
- ✅ Easier maintenance and bug fixes
- ✅ Improved code reusability

#### **2. Component Composition Pattern**
**Decision**: Build reusable component cards instead of monolithic pages
**Result**:
- ✅ QueryExecutionCard: Reused across 3 interfaces with different configurations
- ✅ QueryResultsSection: Consistent results display with customization options
- ✅ Flexible composition allowing interface-specific features

#### **3. URL-Driven Architecture for Auto Query**
**Decision**: Use URL parameters as the single source of truth
**Result**:
- ✅ Bookmarkable queries with full state preservation
- ✅ Easy sharing of complex filtered queries
- ✅ Dashboard integration capability through URLs
- ✅ Automatic query execution for embedded use cases

#### **4. Field Discovery Through Elasticsearch Mappings**
**Decision**: Dynamically fetch field information from ES instead of hardcoding
**Result**:
- ✅ Automatic adaptation to different index structures
- ✅ Smart operator suggestions based on actual field types
- ✅ Support for nested fields and complex data structures
- ✅ No manual configuration required for new indices

### Performance Optimizations ✅ **IMPLEMENTED**

#### **1. `_source` Field Filtering**
```typescript
// DirectQuery optimization: Only fetch selected columns
const sourceFilter = selectedColumns.length > 0 
  ? selectedColumns.filter(col => !col.startsWith('_'))
  : true;

const request: DirectQueryRequest = {
  index: selectedIndex,
  query: parsedQuery,
  _source: sourceFilter, // ✅ Reduces response payload size
};
```

#### **2. Session-Based Column Preferences**
```typescript
// Column preferences persist across sessions per index
const savedColumns = getSelectedColumnsForIndex(selectedIndex);
if (savedColumns && savedColumns.length > 0) {
  setSelectedColumns(savedColumns);
}
```

#### **3. Smart Pagination**
```typescript
// Client-side pagination for small datasets, server-side ready
const getPaginatedHits = useCallback(() => {
  if (!result?.hits?.hits) return [];
  const start = page * rowsPerPage;
  const end = start + rowsPerPage;
  return result.hits.hits.slice(start, end);
}, [result, page, rowsPerPage]);
```

### User Experience Achievements ✅ **DELIVERED**

#### **1. Progressive Complexity**
- **QueryBuilder**: Visual, no-code interface for beginners
- **AutoQuery**: URL-driven for dashboard embedding and sharing
- **DirectQuery**: Full JSON control for power users

#### **2. Consistent Error Handling**
```typescript
// Structured error messages with actionable suggestions
if (err.details && err.details.includes('index_not_found_exception')) {
  const indexMatch = err.details.match(/no such index \[([^\]]+)\]/);
  if (indexMatch) {
    errorMessage = `Index '${indexMatch[1]}' not found. Please check if the index exists and try again.`;
  }
}
```

#### **3. Real-time Feedback**
- **QueryBuilder**: Live JSON generation as users build queries
- **AutoQuery**: Real-time URL parameter visualization
- **DirectQuery**: Immediate syntax validation and error highlighting

---

## API Documentation

### Current API Endpoints ✅ **IMPLEMENTED**

#### **1. Execute Elasticsearch Query**
```http
POST /api/direct-query
Content-Type: application/json

{
  "index": "health-data-index-v1",
  "query": {
    "query": { "match_all": {} },
    "size": 10,
    "from": 0
  },
  "from": 0,
  "size": 10,
  "_source": ["field1", "field2"] // Optional: field filtering
}

Response:
{
  "success": true,
  "data": {
    "took": 15,
    "timed_out": false,
    "_shards": { "total": 1, "successful": 1, "skipped": 0, "failed": 0 },
    "hits": {
      "total": { "value": 1000, "relation": "eq" },
      "hits": [...] // Elasticsearch hit objects
    },
    "aggregations": { ... } // Optional aggregations
  }
}
```

#### **2. Get Available Indexes**
```http
GET /api/direct-query/indexes

Response:
{
  "success": true,
  "data": [
    "health-data-index-v1",
    "project-index-v1", 
    "household-index-v1"
  ]
}
```

#### **3. Get Index Field Mapping** 🆕
```http
GET /api/direct-query/indexes/{indexName}/mapping

Response:
{
  "success": true,
  "data": {
    "mappings": {
      "properties": {
        "Data": {
          "properties": {
            "boundaryHierarchy": {
              "properties": {
                "country": { "type": "text", "fields": { "keyword": { "type": "keyword" } } },
                "state": { "type": "text", "fields": { "keyword": { "type": "keyword" } } }
              }
            }
          }
        },
        "id": { "type": "keyword" },
        "timestamp": { "type": "date" }
      }
    }
  }
}
```

#### **4. Multi-Index Join Preview** 🆕
```http
GET /api/multi-index-join/preview?leftIndex={leftIndex}&rightIndex={rightIndex}&leftField={leftField}&rightField={rightField}

Example:
GET /api/multi-index-join/preview?leftIndex=project-index-v1&rightIndex=project-task-index-v1&leftField=Data.projectId&rightField=Data.projectId

Response:
{
  "success": true,
  "data": {
    "joinSummary": {
      "leftIndexTotal": 6,
      "rightIndexTotal": 3,
      "joinedRecords": 0,
      "leftOnlyRecords": 6,
      "rightOnlyRecords": 3
    },
    "preview": [
      {
        "joinKey": "P001",
        "joinType": "left_only",
        "leftRecord": {
          "Data": {
            "projectId": "P001",
            "projectName": "Health Campaign 2024"
          }
        },
        "rightRecord": null
      }
    ],
    "sampleJoinKeys": {
      "P001": 1,
      "P002": 1
    }
  }
}
```

#### **5. Execute Multi-Index Join** 🆕
```http
POST /api/multi-index-join
Content-Type: application/json

{
  "joins": [
    {
      "leftIndex": "project-index-v1",
      "rightIndex": "project-task-index-v1",
      "joinField": {
        "left": "Data.projectId",
        "right": "Data.projectId"
      },
      "joinType": "full",
      "limit": 1000
    }
  ],
  "from": 0,
  "size": 50
}

Response:
{
  "success": true,
  "data": {
    "totalResults": 9,
    "results": [
      {
        "joinKey": "P001",
        "joinType": "left_only",
        "leftRecord": {
          "Data": {
            "projectId": "P001",
            "projectName": "Health Campaign 2024",
            "status": "active"
          }
        },
        "rightRecord": null
      },
      {
        "joinKey": "TASK001",
        "joinType": "right_only",
        "leftRecord": null,
        "rightRecord": {
          "Data": {
            "projectId": "TASK001",
            "taskName": "Survey Collection",
            "status": "completed"
          }
        }
      }
    ],
    "joinSummary": {
      "leftIndexTotal": 6,
      "rightIndexTotal": 3,
      "joinedRecords": 0,
      "leftOnlyRecords": 6,
      "rightOnlyRecords": 3
    }
  }
}
```

### URL Patterns for Auto Query ✅ **IMPLEMENTED**

#### **Basic Filtered Query**
```
/auto-query?index=health-data&status=active&autoExecute=true
```

#### **Nested Field Query**
```
/auto-query?index=project-data&Data.boundaryHierarchy.country=Mozambique&autoExecute=true
```

#### **Complex Query with Pagination**
```
/auto-query?index=household-data&status=active&from=0&size=50&date_from=2024-01-01&date_to=2024-12-31&autoExecute=true
```

#### **Custom Query Parameter**
```
/auto-query?index=my-index&query=%7B%22query%22%3A%7B%22match_all%22%3A%7B%7D%7D%7D&autoExecute=true
```

---

## Summary

### ✅ **Successfully Delivered (Phase 1)**
1. **Four Complete Query Interfaces**: DirectQuery, AutoQuery, QueryBuilder, and Multi-Index Join
2. **Shared Architecture**: Reusable hooks and components eliminating code duplication
3. **Advanced Features**: Column management, Excel export, URL sharing, field discovery
4. **Performance Optimizations**: Source filtering, pagination, session management
5. **Comprehensive Error Handling**: Structured API errors with user-friendly messages
6. **TypeScript Integration**: Full type safety across the entire application

### 🎯 **Business Value Delivered**
- **Technical Users**: Full JSON query control via DirectQuery
- **Business Users**: No-code query building via QueryBuilder  
- **Dashboard Integration**: URL-driven queries via AutoQuery
- **Data Analysis**: Advanced column filtering and Excel export
- **Cross-Index Analytics**: Multi-index data joining and consolidation
- **Team Collaboration**: Shareable query URLs and consistent interfaces

### 🚀 **Technical Excellence Achieved**
- **Code Quality**: Shared architecture with ~400+ lines of duplicate code eliminated
- **Performance**: Optimized queries with field filtering and smart caching
- **User Experience**: Progressive complexity from visual to code-based interfaces
- **Maintainability**: Centralized logic in reusable hooks and components
- **Scalability**: API-driven field discovery supporting any Elasticsearch index structure

**Phase 1 represents a complete, production-ready Elasticsearch query interface system with four distinct user experience paths, built on a shared, maintainable architecture foundation.**