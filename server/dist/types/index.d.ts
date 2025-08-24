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
export interface SavedQuery {
    id: string;
    name: string;
    description?: string;
    queryType: 'direct' | 'visual' | 'auto';
    targetIndex: string;
    queryData: {
        rawQuery?: any;
        from?: number;
        size?: number;
        _source?: string[] | boolean;
        visualFields?: Array<{
            field: string;
            operator: string;
            value: any;
            type: string;
        }>;
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
//# sourceMappingURL=index.d.ts.map