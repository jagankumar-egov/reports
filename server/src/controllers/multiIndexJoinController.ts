import { Request, Response } from 'express';
import { multiIndexJoinService } from '../services/multiIndexJoin';
import { logger } from '../utils/logger';
import { MultiIndexJoinRequest } from '../types';

export class MultiIndexJoinController {
  async executeJoin(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);

    const { joins, consolidatedFields, from = 0, size = 100 } = req.body;

    logger.info(`[JOIN-CONTROLLER-${operationId}] Received multi-index join request`, {
      operationId,
      joinsCount: joins?.length || 0,
      from,
      size,
      hasConsolidatedFields: !!consolidatedFields
    });

    // Validate required fields
    if (!joins || !Array.isArray(joins) || joins.length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_JOINS',
          message: 'At least one join configuration is required'
        }
      });
      return;
    }

    // Validate join configurations
    for (let i = 0; i < joins.length; i++) {
      const join = joins[i];
      
      if (!join.leftIndex || typeof join.leftIndex !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_LEFT_INDEX',
            message: `Join ${i}: leftIndex is required and must be a string`
          }
        });
        return;
      }

      if (!join.rightIndex || typeof join.rightIndex !== 'string') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RIGHT_INDEX',
            message: `Join ${i}: rightIndex is required and must be a string`
          }
        });
        return;
      }

      if (!join.joinField || !join.joinField.left || !join.joinField.right) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_JOIN_FIELD',
            message: `Join ${i}: joinField with left and right properties is required`
          }
        });
        return;
      }

      if (!['inner', 'left', 'right', 'full'].includes(join.joinType)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_JOIN_TYPE',
            message: `Join ${i}: joinType must be one of: inner, left, right, full`
          }
        });
        return;
      }
    }

    // Validate pagination parameters
    const fromNum = parseInt(from as string, 10);
    const sizeNum = parseInt(size as string, 10);

    if (isNaN(fromNum) || fromNum < 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FROM',
          message: 'Invalid from parameter. Must be a non-negative number.'
        }
      });
      return;
    }

    if (isNaN(sizeNum) || sizeNum < 1 || sizeNum > 1000) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SIZE',
          message: 'Invalid size parameter. Must be between 1 and 1000.'
        }
      });
      return;
    }

    try {
      const request: MultiIndexJoinRequest = {
        joins,
        consolidatedFields,
        from: fromNum,
        size: sizeNum
      };

      const result = await multiIndexJoinService.executeJoin(request);
      const totalTime = Date.now() - operationStartTime;

      logger.info(`[JOIN-CONTROLLER-${operationId}] Multi-index join completed successfully`, {
        operationId,
        totalTime: `${totalTime}ms`,
        totalResults: result.totalResults,
        returnedResults: result.results.length,
        joinSummary: result.joinSummary
      });

      res.json({
        success: true,
        data: result,
        meta: {
          operationId,
          totalTime: `${totalTime}ms`,
          joinType: 'multi_index',
          joinConfiguration: {
            joinsCount: joins.length,
            from: fromNum,
            size: sizeNum
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[JOIN-CONTROLLER-${operationId}] Multi-index join failed after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : 'UnknownError'
      });

      // Handle specific error cases
      if (error instanceof Error && error.message.includes('Access denied')) {
        res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied to one or more requested indices',
            details: error.message
          }
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'JOIN_EXECUTION_ERROR',
          message: 'Failed to execute multi-index join',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async getJoinPreview(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);

    const { leftIndex, rightIndex, leftField, rightField } = req.query;

    logger.info(`[JOIN-PREVIEW-${operationId}] Received join preview request`, {
      operationId,
      leftIndex,
      rightIndex,
      leftField,
      rightField
    });

    if (!leftIndex || !rightIndex || !leftField || !rightField) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PREVIEW_PARAMS',
          message: 'leftIndex, rightIndex, leftField, and rightField are required for join preview'
        }
      });
      return;
    }

    try {
      // Create a small preview join to show potential matches
      const previewRequest: MultiIndexJoinRequest = {
        joins: [{
          leftIndex: leftIndex as string,
          rightIndex: rightIndex as string,
          joinField: {
            left: leftField as string,
            right: rightField as string
          },
          joinType: 'inner',
          limit: 10
        }],
        from: 0,
        size: 5
      };

      const result = await multiIndexJoinService.executeJoin(previewRequest);
      const totalTime = Date.now() - operationStartTime;

      logger.info(`[JOIN-PREVIEW-${operationId}] Join preview completed successfully`, {
        operationId,
        totalTime: `${totalTime}ms`,
        previewResults: result.results.length,
        joinSummary: result.joinSummary
      });

      res.json({
        success: true,
        data: {
          preview: result.results.slice(0, 3), // Show only first 3 records
          joinSummary: result.joinSummary,
          possibleMatches: result.totalResults,
          sampleJoinKeys: result.aggregations?.joinFieldDistribution?.distribution || {}
        },
        meta: {
          operationId,
          totalTime: `${totalTime}ms`,
          previewType: 'join_compatibility',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[JOIN-PREVIEW-${operationId}] Join preview failed after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'JOIN_PREVIEW_ERROR',
          message: 'Failed to generate join preview',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}