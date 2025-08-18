import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest, queryValidationSchemas } from '../middleware/validation';
import { QueryController } from '../controllers/queryController';

const router = Router();
const queryController = new QueryController();

/**
 * POST /api/query/execute
 * Execute a JQL query and return results
 */
router.post(
  '/execute',
  validateRequest(queryValidationSchemas.executeQuery),
  asyncHandler(async (req: Request, res: Response) => {
    await queryController.executeQuery(req, res);
  })
);

/**
 * POST /api/query/validate
 * Validate a JQL query without executing it
 */
router.post(
  '/validate',
  validateRequest(queryValidationSchemas.validateQuery),
  asyncHandler(async (req: Request, res: Response) => {
    await queryController.validateQuery(req, res);
  })
);

/**
 * GET /api/query/history
 * Get query execution history (placeholder for future implementation)
 */
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    await queryController.getQueryHistory(req, res);
  })
);

export default router;