import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { DirectQueryController } from '../controllers/directQueryController';

const router = Router();
const directQueryController = new DirectQueryController();

/**
 * POST /api/direct-query
 * Execute a direct Elasticsearch query
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    await directQueryController.executeDirectQuery(req, res);
  })
);

/**
 * GET /api/direct-query/indexes
 * Get available indexes for direct querying
 */
router.get(
  '/indexes',
  asyncHandler(async (req: Request, res: Response) => {
    await directQueryController.getAvailableIndexes(req, res);
  })
);

/**
 * GET /api/direct-query/indexes/:indexName/mapping
 * Get field mapping for a specific index
 */
router.get(
  '/indexes/:indexName/mapping',
  asyncHandler(async (req: Request, res: Response) => {
    await directQueryController.getIndexMapping(req, res);
  })
);

export default router;