import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { validateRequest, fieldValidationSchemas } from '../middleware/validation';
import { FieldController } from '../controllers/fieldController';

const router = Router();
const fieldController = new FieldController();

/**
 * GET /api/fields
 * Get available fields from health data indexes
 */
router.get(
  '/',
  validateRequest(fieldValidationSchemas.getFields),
  asyncHandler(async (req: Request, res: Response) => {
    await fieldController.getFields(req, res);
  })
);

/**
 * GET /api/fields/:index
 * Get fields for a specific index
 */
router.get(
  '/:index',
  asyncHandler(async (req: Request, res: Response) => {
    await fieldController.getFieldsForIndex(req, res);
  })
);

export default router;