import { Request, Response } from 'express';
import { savedQueriesService } from '../services/savedQueries';
import { logger } from '../utils/logger';
import { CreateSavedQueryRequest, UpdateSavedQueryRequest } from '../types';

export class SavedQueriesController {
  async createSavedQuery(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);

    const { name, description, queryType, targetIndex, queryData, tags } = req.body;

    logger.info(`[SAVED-QUERY-CREATE-${operationId}] Received create saved query request`, {
      operationId,
      name,
      queryType,
      targetIndex,
      hasDescription: !!description,
      tagCount: tags?.length || 0
    });

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_NAME',
          message: 'Query name is required and must be a non-empty string'
        }
      });
      return;
    }

    if (!queryType || !['direct', 'visual', 'auto'].includes(queryType)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUERY_TYPE',
          message: 'Query type must be one of: direct, visual, auto'
        }
      });
      return;
    }

    if (!targetIndex || typeof targetIndex !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TARGET_INDEX',
          message: 'Target index is required'
        }
      });
      return;
    }

    if (!queryData || typeof queryData !== 'object') {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY_DATA',
          message: 'Query data is required'
        }
      });
      return;
    }

    try {
      const request: CreateSavedQueryRequest = {
        name: name.trim(),
        description: description?.trim(),
        queryType,
        targetIndex,
        queryData,
        tags
      };

      const savedQuery = await savedQueriesService.createSavedQuery(request);
      const totalTime = Date.now() - operationStartTime;

      logger.info(`[SAVED-QUERY-CREATE-${operationId}] Saved query created successfully`, {
        operationId,
        queryId: savedQuery.id,
        totalTime: `${totalTime}ms`
      });

      res.status(201).json({
        success: true,
        data: savedQuery,
        meta: {
          operationId,
          totalTime: `${totalTime}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-CREATE-${operationId}] Failed to create saved query after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_CREATE_ERROR',
          message: 'Failed to create saved query',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async getSavedQuery(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    const { queryId } = req.params;

    logger.info(`[SAVED-QUERY-GET-${operationId}] Received get saved query request`, {
      operationId,
      queryId
    });

    if (!queryId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY_ID',
          message: 'Query ID is required'
        }
      });
      return;
    }

    try {
      const savedQuery = await savedQueriesService.getSavedQuery(queryId);
      const totalTime = Date.now() - operationStartTime;

      if (!savedQuery) {
        logger.info(`[SAVED-QUERY-GET-${operationId}] Saved query not found`, {
          operationId,
          queryId,
          totalTime: `${totalTime}ms`
        });

        res.status(404).json({
          success: false,
          error: {
            code: 'QUERY_NOT_FOUND',
            message: 'Saved query not found'
          }
        });
        return;
      }

      logger.info(`[SAVED-QUERY-GET-${operationId}] Saved query retrieved successfully`, {
        operationId,
        queryId,
        totalTime: `${totalTime}ms`
      });

      res.json({
        success: true,
        data: savedQuery,
        meta: {
          operationId,
          totalTime: `${totalTime}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-GET-${operationId}] Failed to retrieve saved query after ${errorTime}ms`, {
        operationId,
        queryId,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_RETRIEVE_ERROR',
          message: 'Failed to retrieve saved query',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async getAllSavedQueries(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);

    const {
      queryType,
      targetIndex,
      tags,
      limit = '100',
      offset = '0'
    } = req.query;

    const parsedTags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(t => t) : undefined;
    const parsedLimit = parseInt(limit as string, 10);
    const parsedOffset = parseInt(offset as string, 10);

    logger.info(`[SAVED-QUERY-LIST-${operationId}] Received list saved queries request`, {
      operationId,
      queryType,
      targetIndex,
      tags: parsedTags,
      limit: parsedLimit,
      offset: parsedOffset
    });

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 1000'
        }
      });
      return;
    }

    if (isNaN(parsedOffset) || parsedOffset < 0) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OFFSET',
          message: 'Offset must be non-negative'
        }
      });
      return;
    }

    try {
      const options = {
        queryType: queryType as string,
        targetIndex: targetIndex as string,
        tags: parsedTags,
        limit: parsedLimit,
        offset: parsedOffset
      };

      const result = await savedQueriesService.getAllSavedQueries(options);
      const totalTime = Date.now() - operationStartTime;

      logger.info(`[SAVED-QUERY-LIST-${operationId}] Saved queries listed successfully`, {
        operationId,
        count: result.queries.length,
        total: result.total,
        totalTime: `${totalTime}ms`
      });

      res.json({
        success: true,
        data: {
          queries: result.queries,
          pagination: {
            total: result.total,
            limit: parsedLimit,
            offset: parsedOffset,
            hasMore: parsedOffset + result.queries.length < result.total
          }
        },
        meta: {
          operationId,
          totalTime: `${totalTime}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-LIST-${operationId}] Failed to list saved queries after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_LIST_ERROR',
          message: 'Failed to list saved queries',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async updateSavedQuery(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    const { queryId } = req.params;
    const { name, description, queryData, tags } = req.body;

    logger.info(`[SAVED-QUERY-UPDATE-${operationId}] Received update saved query request`, {
      operationId,
      queryId,
      updates: Object.keys(req.body)
    });

    if (!queryId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY_ID',
          message: 'Query ID is required'
        }
      });
      return;
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_NAME',
          message: 'Query name must be a non-empty string'
        }
      });
      return;
    }

    try {
      const updates: UpdateSavedQueryRequest = {};
      
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description?.trim();
      if (queryData !== undefined) updates.queryData = queryData;
      if (tags !== undefined) updates.tags = tags;

      const updatedQuery = await savedQueriesService.updateSavedQuery(queryId, updates);
      const totalTime = Date.now() - operationStartTime;

      if (!updatedQuery) {
        logger.info(`[SAVED-QUERY-UPDATE-${operationId}] Saved query not found for update`, {
          operationId,
          queryId,
          totalTime: `${totalTime}ms`
        });

        res.status(404).json({
          success: false,
          error: {
            code: 'QUERY_NOT_FOUND',
            message: 'Saved query not found'
          }
        });
        return;
      }

      logger.info(`[SAVED-QUERY-UPDATE-${operationId}] Saved query updated successfully`, {
        operationId,
        queryId,
        totalTime: `${totalTime}ms`
      });

      res.json({
        success: true,
        data: updatedQuery,
        meta: {
          operationId,
          totalTime: `${totalTime}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-UPDATE-${operationId}] Failed to update saved query after ${errorTime}ms`, {
        operationId,
        queryId,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_UPDATE_ERROR',
          message: 'Failed to update saved query',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async deleteSavedQuery(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    const { queryId } = req.params;

    logger.info(`[SAVED-QUERY-DELETE-${operationId}] Received delete saved query request`, {
      operationId,
      queryId
    });

    if (!queryId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY_ID',
          message: 'Query ID is required'
        }
      });
      return;
    }

    try {
      const deleted = await savedQueriesService.deleteSavedQuery(queryId);
      const totalTime = Date.now() - operationStartTime;

      if (!deleted) {
        logger.info(`[SAVED-QUERY-DELETE-${operationId}] Saved query not found for deletion`, {
          operationId,
          queryId,
          totalTime: `${totalTime}ms`
        });

        res.status(404).json({
          success: false,
          error: {
            code: 'QUERY_NOT_FOUND',
            message: 'Saved query not found'
          }
        });
        return;
      }

      logger.info(`[SAVED-QUERY-DELETE-${operationId}] Saved query deleted successfully`, {
        operationId,
        queryId,
        totalTime: `${totalTime}ms`
      });

      res.json({
        success: true,
        data: {
          deleted: true,
          queryId
        },
        meta: {
          operationId,
          totalTime: `${totalTime}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-DELETE-${operationId}] Failed to delete saved query after ${errorTime}ms`, {
        operationId,
        queryId,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_DELETE_ERROR',
          message: 'Failed to delete saved query',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  async executeAndTrackSavedQuery(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    const { queryId } = req.params;

    logger.info(`[SAVED-QUERY-EXECUTE-${operationId}] Received execute saved query request`, {
      operationId,
      queryId
    });

    if (!queryId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY_ID',
          message: 'Query ID is required'
        }
      });
      return;
    }

    try {
      // Get the saved query
      const savedQuery = await savedQueriesService.getSavedQuery(queryId);
      
      if (!savedQuery) {
        res.status(404).json({
          success: false,
          error: {
            code: 'QUERY_NOT_FOUND',
            message: 'Saved query not found'
          }
        });
        return;
      }

      // Increment execution count (async, don't wait)
      savedQueriesService.incrementExecutionCount(queryId).catch(error => {
        logger.warn(`Failed to increment execution count for query ${queryId}:`, error);
      });

      // Return the saved query data for frontend execution
      const totalTime = Date.now() - operationStartTime;

      logger.info(`[SAVED-QUERY-EXECUTE-${operationId}] Saved query data retrieved for execution`, {
        operationId,
        queryId,
        queryType: savedQuery.queryType,
        targetIndex: savedQuery.targetIndex,
        totalTime: `${totalTime}ms`
      });

      res.json({
        success: true,
        data: {
          query: savedQuery,
          message: 'Query data retrieved successfully. Execute using the appropriate query interface.'
        },
        meta: {
          operationId,
          totalTime: `${totalTime}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-EXECUTE-${operationId}] Failed to execute saved query after ${errorTime}ms`, {
        operationId,
        queryId,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'QUERY_EXECUTE_ERROR',
          message: 'Failed to execute saved query',
          details: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
}