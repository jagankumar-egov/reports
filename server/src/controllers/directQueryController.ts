import { Request, Response } from 'express';
import { elasticsearchService } from '../services/elasticsearch';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export class DirectQueryController {
  async executeDirectQuery(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);

    const { index, query, from = 0, size = 10, _source, enableFielddata = false } = req.body;

    logger.info(`[DIRECT-QUERY-${operationId}] Received direct query request`, {
      operationId,
      index,
      from,
      size,
      _source: _source ? (_source === true ? 'all' : _source.length) : 'all',
      queryType: query?.query ? Object.keys(query.query)[0] : 'unknown',
      enableFielddata,
    });

    // Validate required fields
    if (!index) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_INDEX',
          message: 'Index is required'
        }
      });
      return;
    }

    if (!query) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'Query is required'
        }
      });
      return;
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

    // Validate JSON query structure
    let parsedQuery;
    if (typeof query === 'string') {
      try {
        parsedQuery = JSON.parse(query);
      } catch (error) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON query format',
            details: error instanceof Error ? error.message : String(error),
          }
        });
        return;
      }
    } else {
      parsedQuery = query;
    }

    // Execute the query
    const searchStartTime = Date.now();
    const response = await elasticsearchService.executeDirectQuery({
      index,
      query: parsedQuery,
      from: fromNum,
      size: sizeNum,
      _source: _source,
      enableFielddata: enableFielddata,
    });

    const searchTime = Date.now() - searchStartTime;
    const totalTime = Date.now() - operationStartTime;

    logger.info(`[DIRECT-QUERY-${operationId}] Direct query completed successfully`, {
      operationId,
      searchTime: `${searchTime}ms`,
      totalTime: `${totalTime}ms`,
      hits: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
      index,
    });

    // Transform the response for the frontend
    const transformedResponse = {
      took: response.took,
      timed_out: response.timed_out,
      _shards: response._shards,
      hits: {
        total: response.hits.total,
        max_score: response.hits.max_score,
        hits: response.hits.hits.map((hit: any) => ({
          _index: hit._index,
          _type: hit._type,
          _id: hit._id,
          _score: hit._score,
          _source: hit._source,
        })),
      },
      aggregations: response.aggregations,
    };

    res.json({
      success: true,
      data: transformedResponse,
      meta: {
        operationId,
        totalTime: `${totalTime}ms`,
        searchTime: `${searchTime}ms`,
        index,
        from: fromNum,
        size: sizeNum,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async getAvailableIndexes(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);

    logger.info(`[DIRECT-QUERY-INDEXES-${operationId}] Getting available indexes`);

    const allowedIndexes = elasticsearchService.getAllowedIndexes();
    const totalTime = Date.now() - operationStartTime;

    logger.info(`[DIRECT-QUERY-INDEXES-${operationId}] Retrieved ${allowedIndexes.length} allowed indexes in ${totalTime}ms`);

    res.json({
      success: true,
      data: allowedIndexes,
      meta: {
        operationId,
        totalTime: `${totalTime}ms`,
        count: allowedIndexes.length,
        timestamp: new Date().toISOString(),
      },
    });
  }

  async getIndexMapping(req: Request, res: Response): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    const { indexName } = req.params;

    logger.info(`[DIRECT-QUERY-MAPPING-${operationId}] Getting mapping for index: ${indexName}`);

    // Validate index name
    if (!indexName) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_INDEX_NAME',
          message: 'Index name is required'
        }
      });
      return;
    }

    try {
      const mappingStartTime = Date.now();
      const response = await elasticsearchService.getMapping(indexName);
      const mappingTime = Date.now() - mappingStartTime;
      const totalTime = Date.now() - operationStartTime;

      logger.info(`[DIRECT-QUERY-MAPPING-${operationId}] Retrieved mapping for index ${indexName} in ${totalTime}ms`);

      res.json({
        success: true,
        data: response,
        meta: {
          operationId,
          totalTime: `${totalTime}ms`,
          mappingTime: `${mappingTime}ms`,
          indexName,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[DIRECT-QUERY-MAPPING-${operationId}] Failed to get mapping for index ${indexName} after ${errorTime}ms`, {
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'MAPPING_FETCH_ERROR',
          message: `Failed to get mapping for index: ${indexName}`,
          details: error instanceof Error ? error.message : String(error),
        }
      });
    }
  }
}