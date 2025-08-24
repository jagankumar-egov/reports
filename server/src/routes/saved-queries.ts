import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { SavedQueriesController } from '../controllers/savedQueriesController';

const router = Router();
const savedQueriesController = new SavedQueriesController();

/**
 * POST /api/saved-queries
 * Create a new saved query
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    await savedQueriesController.createSavedQuery(req, res);
  })
);

/**
 * GET /api/saved-queries
 * Get all saved queries with optional filtering
 * Query parameters:
 * - queryType: Filter by query type (direct, visual, auto)
 * - targetIndex: Filter by target index
 * - tags: Comma-separated list of tags to filter by
 * - limit: Maximum number of results (default: 100, max: 1000)
 * - offset: Number of results to skip (default: 0)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    await savedQueriesController.getAllSavedQueries(req, res);
  })
);

/**
 * GET /api/saved-queries/:queryId
 * Get a specific saved query by ID
 */
router.get(
  '/:queryId',
  asyncHandler(async (req: Request, res: Response) => {
    await savedQueriesController.getSavedQuery(req, res);
  })
);

/**
 * PUT /api/saved-queries/:queryId
 * Update a saved query
 */
router.put(
  '/:queryId',
  asyncHandler(async (req: Request, res: Response) => {
    await savedQueriesController.updateSavedQuery(req, res);
  })
);

/**
 * DELETE /api/saved-queries/:queryId
 * Delete a saved query
 */
router.delete(
  '/:queryId',
  asyncHandler(async (req: Request, res: Response) => {
    await savedQueriesController.deleteSavedQuery(req, res);
  })
);

/**
 * POST /api/saved-queries/:queryId/execute
 * Get saved query data for execution (and increment execution count)
 * This endpoint returns the saved query data for the frontend to execute
 */
router.post(
  '/:queryId/execute',
  asyncHandler(async (req: Request, res: Response) => {
    await savedQueriesController.executeAndTrackSavedQuery(req, res);
  })
);

export default router;