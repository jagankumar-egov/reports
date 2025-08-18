import { Request, Response } from 'express';
export declare class ProjectController {
    getProjects(req: Request, res: Response): Promise<void>;
    getProject(req: Request, res: Response): Promise<void>;
    private getMatchingIndexes;
    private generateProjectKey;
    private generateProjectName;
    private getFieldCount;
    private countFields;
}
//# sourceMappingURL=projectController.d.ts.map