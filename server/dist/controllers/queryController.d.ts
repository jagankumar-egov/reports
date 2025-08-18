import { Request, Response } from 'express';
export declare class QueryController {
    executeQuery(req: Request, res: Response): Promise<void>;
    validateQuery(req: Request, res: Response): Promise<void>;
    getQueryHistory(req: Request, res: Response): Promise<void>;
    private getFieldDefinitionsForIndexes;
}
//# sourceMappingURL=queryController.d.ts.map