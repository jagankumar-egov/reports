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
export interface JoinConfiguration {
    leftIndex: string;
    rightIndex: string;
    joinField: {
        left: string;
        right: string;
    };
    joinType: 'inner' | 'left' | 'right' | 'full';
    fieldsToReturn?: {
        left: string[];
        right: string[];
    };
    leftQuery?: any;
    rightQuery?: any;
    limit?: number;
}
export interface MultiIndexJoinRequest {
    joins: JoinConfiguration[];
    consolidatedFields?: string[];
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
//# sourceMappingURL=index.d.ts.map