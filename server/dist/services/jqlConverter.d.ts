import { QueryValidationResult } from '../types';
declare class JQLConverterService {
    convertJQLToElasticsearch(jql: string, allowedIndexes: string[]): {
        query: any;
        indexes: string[];
        sort?: any[];
    };
    private parseJQL;
    private parseConditions;
    private parseOrderBy;
    private buildElasticsearchQuery;
    private extractIndexes;
    private buildSortClause;
    validateJQL(jql: string, allowedIndexes: string[]): QueryValidationResult;
}
export declare const jqlConverterService: JQLConverterService;
export {};
//# sourceMappingURL=jqlConverter.d.ts.map