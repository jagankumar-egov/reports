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
export interface JQLQuery {
    projects?: string[];
    conditions?: QueryCondition[];
    orderBy?: OrderByClause[];
    limit?: number;
}
export interface QueryCondition {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'between' | 'is_null' | 'is_not_null';
    value: any;
    values?: any[];
}
export interface OrderByClause {
    field: string;
    direction: 'asc' | 'desc';
}
export interface ElasticsearchConfig {
    host: string;
    username: string;
    password: string;
    caCert?: string;
    allowedIndexes: string[];
    projectIndexMapping: Record<string, string>;
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
export interface AuthenticatedRequest extends Express.Request {
    user?: {
        id: string;
        email: string;
        roles: string[];
        tenantId: string;
    };
}
export interface QueryValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: string[];
    estimatedResults?: number;
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
//# sourceMappingURL=index.d.ts.map