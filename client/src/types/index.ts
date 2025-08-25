// DHR Frontend Types - Phase 1: Direct Elasticsearch Query

// Field Information Types
export interface FieldInfo {
  name: string;
  type: string;
  fullPath: string;
  isAnalyzed: boolean;
  isKeyword: boolean;
  isNumeric: boolean;
  isDate: boolean;
  isBoolean: boolean;
  hasKeywordVariant: boolean;
}

// API Response Types
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

// Direct Query Types
export interface DirectQueryRequest {
  index: string;
  query: any; // Elasticsearch query object
  from?: number;
  size?: number;
  _source?: string[] | boolean; // Fields to include in response
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

// UI State Types
export interface UiState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  notifications: Notification[];
  loading: {
    global: boolean;
    query?: boolean;
    fields?: boolean;
    projects?: boolean;
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

// Redux Store Types
export interface RootState {
  ui: UiState;
}

// Component Props Types
export interface DirectQueryProps {
  onQueryExecute?: (result: DirectQueryResponse) => void;
}

// Saved Queries Types
export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  queryType: 'direct' | 'visual' | 'auto';
  targetIndex: string;
  queryData: {
    // For direct queries
    rawQuery?: any;
    from?: number;
    size?: number;
    _source?: string[] | boolean;
    
    // For visual queries
    visualFields?: Array<{
      field: string;
      operator: string;
      value: any;
      type: string;
    }>;
    
    // For auto queries
    urlParams?: Record<string, string>;
  };
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    tags?: string[];
    executionCount?: number;
    lastExecutedAt?: string;
  };
}

export interface CreateSavedQueryRequest {
  name: string;
  description?: string;
  queryType: 'direct' | 'visual' | 'auto';
  targetIndex: string;
  queryData: SavedQuery['queryData'];
  tags?: string[];
}

export interface UpdateSavedQueryRequest {
  name?: string;
  description?: string;
  queryData?: SavedQuery['queryData'];
  tags?: string[];
}

export interface SavedQueriesListResponse {
  queries: SavedQuery[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Multi-Index Join Types
export interface JoinConfiguration {
  leftIndex: string;
  rightIndex: string;
  joinField: {
    left: string;    // Field name in left index
    right: string;   // Field name in right index
  };
  joinType: 'inner' | 'left' | 'right' | 'full';
  fieldsToReturn?: {
    left: string[];  // Fields to return from left index
    right: string[]; // Fields to return from right index
  };
  leftQuery?: any;   // Optional query to filter left index
  rightQuery?: any;  // Optional query to filter right index
  limit?: number;    // Optional limit for results
}

export interface MultiIndexJoinRequest {
  joins: JoinConfiguration[];  // Support for multiple joins
  consolidatedFields?: string[]; // Optional field selection for final result
  from?: number;
  size?: number;
}

export interface JoinedRecord {
  joinKey: string;
  leftRecord?: any;
  rightRecord?: any;
  consolidatedRecord: any;
  joinType: string;
}

export interface MultiIndexJoinResponse {
  took: number;
  totalResults: number;
  joinSummary: {
    leftIndexTotal: number;
    rightIndexTotal: number;
    joinedRecords: number;
    leftOnlyRecords: number;
    rightOnlyRecords: number;
  };
  results: JoinedRecord[];
  aggregations?: {
    joinFieldDistribution?: any;
    indexDistribution?: any;
  };
}

export interface JoinPreviewResponse {
  preview: JoinedRecord[];
  joinSummary: {
    leftIndexTotal: number;
    rightIndexTotal: number;
    joinedRecords: number;
    leftOnlyRecords: number;
    rightOnlyRecords: number;
  };
  possibleMatches: number;
  sampleJoinKeys: Record<string, number>;
}