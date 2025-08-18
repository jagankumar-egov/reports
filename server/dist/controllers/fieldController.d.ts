import { Request, Response } from 'express';
export declare class FieldController {
    getFields(req: Request, res: Response): Promise<void>;
    getFieldsForIndex(req: Request, res: Response): Promise<void>;
    private extractFieldsFromMapping;
    private processProperties;
    private mapElasticsearchType;
    private isSearchable;
    private isAggregatable;
    private getFieldDescription;
    private deduplicateFields;
}
//# sourceMappingURL=fieldController.d.ts.map