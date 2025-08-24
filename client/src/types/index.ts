// DHR Frontend Types - Phase 1

export interface QueryRequest {
  jql: string;
  startAt?: number;
  maxResults?: number;
  fields?: string[];
  allowedIndexes?: string[];
}

export interface QueryResult {
  total: number;
  startAt: number;
  maxResults: number;
  issues: HealthRecord[];
  fields: FieldDefinition[];
  executionTime: number;
}

export interface HealthRecord {
  id: string;
  index: string;
  source: Record<string, any>;
  score?: number;
  fields?: Record<string, any>;
}

export interface FieldDefinition {
  id: string;
  name: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
  description?: string;
  schema?: {
    type: string;
    format?: string;
    enum?: string[];
  };
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description?: string;
  indexName: string;
  fieldCount: number;
  recordCount: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    executionTime: number;
  };
}

export interface QueryValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  estimatedResults?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// UI State Types
export interface QueryState {
  jql: string;
  result: QueryResult | null;
  loading: boolean;
  error: string | null;
  history: QueryHistoryItem[];
  validation: QueryValidationResult | null;
}

export interface QueryHistoryItem {
  id: string;
  jql: string;
  executedAt: string;
  executionTime: number;
  resultCount: number;
}

export interface UiState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  loading: {
    global: boolean;
    query: boolean;
    fields: boolean;
    projects: boolean;
  };
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  autoHide?: boolean;
}

// Component Props Types
export interface QueryBuilderProps {
  value: string;
  onChange: (jql: string) => void;
  onExecute: () => void;
  loading?: boolean;
  error?: string | null;
  availableFields: FieldDefinition[];
  availableProjects: Project[];
}

export interface DataTableProps {
  data: HealthRecord[];
  fields: FieldDefinition[];
  loading?: boolean;
  totalRows: number;
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange?: (sortModel: any[]) => void;
  onSelectionChange?: (selection: string[]) => void;
}

export interface JQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  error?: boolean;
  onValidate?: (isValid: boolean, errors: ValidationError[]) => void;
}

// Redux Store Types
export interface RootState {
  query: QueryState;
  ui: UiState;
  fields: FieldsState;
  projects: ProjectsState;
}

export interface FieldsState {
  items: FieldDefinition[];
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}

export interface ProjectsState {
  items: Project[];
  loading: boolean;
  error: string | null;
  lastFetched: string | null;
}

// API Client Types
export interface ApiClient {
  query: {
    execute: (request: QueryRequest) => Promise<ApiResponse<QueryResult>>;
    validate: (jql: string) => Promise<ApiResponse<QueryValidationResult>>;
    getHistory: () => Promise<ApiResponse<QueryHistoryItem[]>>;
  };
  fields: {
    getAll: (params?: { index?: string; search?: string; type?: string }) => Promise<ApiResponse<FieldDefinition[]>>;
    getForIndex: (index: string) => Promise<ApiResponse<FieldDefinition[]>>;
  };
  projects: {
    getAll: (params?: { search?: string; limit?: number }) => Promise<ApiResponse<Project[]>>;
    getById: (id: string) => Promise<ApiResponse<Project>>;
  };
}

// Form Types
export interface QueryForm {
  jql: string;
  maxResults: number;
  selectedFields: string[];
  selectedProjects: string[];
}

// Table Column Definition
export interface TableColumn {
  field: string;
  headerName: string;
  width?: number;
  type?: 'string' | 'number' | 'date' | 'boolean';
  sortable?: boolean;
  filterable?: boolean;
  renderCell?: (params: any) => React.ReactNode;
  valueGetter?: (params: any) => any;
  valueFormatter?: (params: any) => string;
}

// Direct Query Types
export interface DirectQueryRequest {
  index: string;
  query: any; // Elasticsearch query object
  from?: number;
  size?: number;
}

export interface DirectQueryResponse {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number | null;
    hits: ElasticsearchHit[];
  };
  aggregations?: any;
}

export interface ElasticsearchHit {
  _index: string;
  _type: string;
  _id: string;
  _score: number | null;
  _source: Record<string, any>;
}

export interface DirectQueryState {
  selectedIndex: string | null;
  query: string;
  from: number;
  size: number;
  result: DirectQueryResponse | null;
  loading: boolean;
  error: string | null;
  availableIndexes: string[];
}

export interface DirectQueryProps {
  onQueryExecute?: (result: DirectQueryResponse) => void;
}