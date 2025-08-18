import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest, projectValidationSchemas } from '../middleware/validation';
import { ProjectController } from '../controllers/projectController';

const router = Router();
const projectController = new ProjectController();

/**
 * GET /api/projects
 * Get available projects (data indexes)
 */
router.get(
  '/',
  validateRequest(projectValidationSchemas.getProjects),
  asyncHandler(async (req: Request, res: Response) => {
    await projectController.getProjects(req, res);
  })
);

/**
 * GET /api/projects/:id
 * Get specific project details
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await projectController.getProject(req, res);
  })
);

export default router;