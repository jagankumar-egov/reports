import { ElasticsearchResponse } from '../types';
declare class ElasticsearchService {
    private client;
    private config;
    constructor();
    initialize(): Promise<void>;
    private verifyIndexAccess;
    search(params: {
        index: string | string[];
        query: any;
        from?: number;
        size?: number;
        sort?: any[];
        _source?: string[] | boolean;
    }): Promise<ElasticsearchResponse>;
    getMapping(index: string): Promise<any>;
    getIndicesStats(): Promise<any>;
    private validateIndexAccess;
    getAllowedIndexes(): string[];
    getProjectIndexMapping(): Record<string, string>;
    ping(): Promise<boolean>;
}
export declare const elasticsearchService: ElasticsearchService;
export {};
//# sourceMappingURL=elasticsearch.d.ts.map