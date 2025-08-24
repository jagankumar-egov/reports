import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { MultiIndexJoinController } from '../controllers/multiIndexJoinController';

const router = Router();
const multiIndexJoinController = new MultiIndexJoinController();

/**
 * POST /api/multi-index-join
 * Execute a multi-index join query
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    await multiIndexJoinController.executeJoin(req, res);
  })
);

/**
 * GET /api/multi-index-join/preview
 * Get a preview of potential join results to help users configure the join
 * Query parameters:
 * - leftIndex: Name of the left index
 * - rightIndex: Name of the right index  
 * - leftField: Field name in the left index for joining
 * - rightField: Field name in the right index for joining
 */
router.get(
  '/preview',
  asyncHandler(async (req: Request, res: Response) => {
    await multiIndexJoinController.getJoinPreview(req, res);
  })
);

export default router;