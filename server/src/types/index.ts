// DHR Backend Types - Phase 1: Direct Elasticsearch Query

export interface ElasticsearchConfig {
  host: string;
  username: string;
  password: string;
  caCert?: string;
  allowedIndexes: string[];
  requestTimeout: number;
  maxRetries: number;
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

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ElasticsearchResponse {
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
    max_score: number;
    hits: Array<{
      _index: string;
      _type: string;
      _id: string;
      _score: number;
      _source: Record<string, any>;
    }>;
  };
  aggregations?: Record<string, any>;
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
    left: string[];  // Fields to return from left index (with optional prefix)
    right: string[]; // Fields to return from right index (with optional prefix)
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