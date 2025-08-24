// DHR Frontend Types - Phase 1: Direct Elasticsearch Query

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