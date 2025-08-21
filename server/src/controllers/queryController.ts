import { Request, Response } from 'express';
import { elasticsearchService } from '../services/elasticsearch';
import { jqlConverterService } from '../services/jqlConverter';
import { logger } from '../utils/logger';
import { QueryRequest, QueryResult, HealthRecord, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class QueryController {
  async executeQuery(req: Request, res: Response): Promise<void> {
    const requestStartTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    const { jql, startAt = 0, maxResults = 50, fields }: QueryRequest = req.body;

    logger.info(`[API-QUERY-${requestId}] Starting query execution`, {
      requestId,
      jql,
      startAt,
      maxResults,
      fields: fields ? fields.length : 'all',
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    });

    try {
      // Get allowed indexes
      const indexStartTime = Date.now();
      const allowedIndexes = elasticsearchService.getAllowedIndexes();
      const indexTime = Date.now() - indexStartTime;
      
      logger.info(`[API-QUERY-${requestId}] Retrieved allowed indexes in ${indexTime}ms`, {
        requestId,
        allowedIndexes,
        count: allowedIndexes.length,
      });

      // Validate JQL
      const validationStartTime = Date.now();
      const validation = jqlConverterService.validateJQL(jql, allowedIndexes);
      const validationTime = Date.now() - validationStartTime;
      
      logger.info(`[API-QUERY-${requestId}] JQL validation completed in ${validationTime}ms`, {
        requestId,
        isValid: validation.isValid,
        errorCount: validation.errors.length,
        warningCount: validation.warnings.length,
      });

      if (!validation.isValid) {
        const totalTime = Date.now() - requestStartTime;
        logger.warn(`[API-QUERY-${requestId}] JQL validation failed after ${totalTime}ms`, {
          requestId,
          errors: validation.errors,
        });
        throw new AppError(
          `Invalid JQL: ${validation.errors.map(e => e.message).join(', ')}`,
          400,
          'INVALID_JQL'
        );
      }

      // Convert JQL to Elasticsearch query
      const conversionStartTime = Date.now();
      const { query, indexes, sort } = jqlConverterService.convertJQLToElasticsearch(jql, allowedIndexes);
      const conversionTime = Date.now() - conversionStartTime;
      
      logger.info(`[API-QUERY-${requestId}] JQL to Elasticsearch conversion completed in ${conversionTime}ms`, {
        requestId,
        resultingIndexes: indexes,
        queryType: query?.bool ? 'bool' : query?.match_all ? 'match_all' : 'other',
        hasSorting: !!sort,
      });

      if (indexes.length === 0) {
        const totalTime = Date.now() - requestStartTime;
        logger.warn(`[API-QUERY-${requestId}] No accessible indexes found after ${totalTime}ms`, {
          requestId,
          allowedIndexes,
        });
        throw new AppError('No accessible indexes found for this query', 403, 'NO_INDEXES');
      }

      // Execute Elasticsearch query
      const searchParams = {
        index: indexes,
        query,
        from: startAt,
        size: Math.min(maxResults, 1000), // Cap at 1000 results
        sort,
        _source: fields || true,
      };

      logger.info(`[API-QUERY-${requestId}] Executing Elasticsearch search`, {
        requestId,
        searchParams: {
          indexes: searchParams.index,
          from: searchParams.from,
          size: searchParams.size,
          hasSort: !!searchParams.sort,
          sourceFields: Array.isArray(searchParams._source) ? searchParams._source.length : searchParams._source,
        },
      });

      const searchStartTime = Date.now();
      const esResponse = await elasticsearchService.search(searchParams);
      const searchTime = Date.now() - searchStartTime;
      
      logger.info(`[API-QUERY-${requestId}] Elasticsearch search completed in ${searchTime}ms`, {
        requestId,
        took: esResponse.took,
        hits: typeof esResponse.hits.total === 'number' ? esResponse.hits.total : esResponse.hits.total?.value || 0,
        shards: esResponse._shards,
      });

      // Transform results
      const transformStartTime = Date.now();
      const issues: HealthRecord[] = esResponse.hits.hits.map(hit => ({
        id: hit._id,
        index: hit._index,
        source: hit._source,
        score: hit._score,
        fields: hit._source,
      }));
      const transformTime = Date.now() - transformStartTime;
      
      logger.info(`[API-QUERY-${requestId}] Result transformation completed in ${transformTime}ms`, {
        requestId,
        hitCount: esResponse.hits.hits.length,
        transformedCount: issues.length,
      });

      // Get field definitions (simplified for Phase 1)
      const fieldStartTime = Date.now();
      const fieldDefinitions = await this.getFieldDefinitionsForIndexes(indexes);
      const fieldTime = Date.now() - fieldStartTime;
      
      logger.info(`[API-QUERY-${requestId}] Field definitions retrieved in ${fieldTime}ms`, {
        requestId,
        fieldCount: fieldDefinitions.length,
        indexes,
      });

      const totalExecutionTime = Date.now() - requestStartTime;
      const result: QueryResult = {
        total: esResponse.hits.total.value,
        startAt,
        maxResults,
        issues,
        fields: fieldDefinitions,
        executionTime: totalExecutionTime,
      };

      logger.info(`[API-QUERY-${requestId}] Query executed successfully in ${totalExecutionTime}ms`, {
        requestId,
        jql,
        indexes,
        totalHits: result.total,
        returnedHits: issues.length,
        timingBreakdown: {
          indexRetrieval: `${indexTime}ms`,
          validation: `${validationTime}ms`,
          conversion: `${conversionTime}ms`,
          search: `${searchTime}ms`,
          transform: `${transformTime}ms`,
          fieldDefinitions: `${fieldTime}ms`,
          total: `${totalExecutionTime}ms`,
        },
        executionTime: result.executionTime,
      });

      const response: ApiResponse<QueryResult> = {
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
          executionTime: result.executionTime,
        },
      };

      res.json(response);
    } catch (error) {
      const errorTime = Date.now() - requestStartTime;
      logger.error(`[API-QUERY-${requestId}] Query execution failed after ${errorTime}ms`, {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : 'UnknownError',
        statusCode: (error as any)?.statusCode,
        jql,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      throw error;
    }
  }

  async validateQuery(req: Request, res: Response): Promise<void> {
    const { jql } = req.body;

    try {
      const allowedIndexes = elasticsearchService.getAllowedIndexes();
      const validation = jqlConverterService.validateJQL(jql, allowedIndexes);

      const response: ApiResponse = {
        success: true,
        data: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          estimatedResults: validation.estimatedResults,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
          executionTime: 0,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Query validation failed:', error);
      throw error;
    }
  }

  async getQueryHistory(req: Request, res: Response): Promise<void> {
    // Placeholder for Phase 1 - will be implemented in Phase 2 with filter management
    const response: ApiResponse = {
      success: true,
      data: {
        history: [],
        message: 'Query history will be available in Phase 2',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || 'unknown',
        executionTime: 0,
      },
    };

    res.json(response);
  }

  private async getFieldDefinitionsForIndexes(indexes: string[]) {
    try {
      const fieldDefinitions = [];
      
      // Get mappings for all indexes
      for (const index of indexes) {
        try {
          const mapping = await elasticsearchService.getMapping(index);
          const indexMappings = mapping[index]?.mappings?.properties || {};
          
          for (const [fieldName, fieldConfig] of Object.entries(indexMappings)) {
            const fieldDef: any = fieldConfig;
            fieldDefinitions.push({
              id: `${index}.${fieldName}`,
              name: fieldName,
              type: fieldDef.type || 'unknown',
              searchable: fieldDef.type !== 'object',
              aggregatable: fieldDef.type === 'keyword' || fieldDef.type === 'numeric',
              description: `Field from ${index}`,
              schema: {
                type: fieldDef.type || 'unknown',
                format: fieldDef.format,
              },
            });
          }
        } catch (error) {
          logger.warn(`Failed to get mapping for index ${index}:`, error);
        }
      }

      return fieldDefinitions;
    } catch (error) {
      logger.error('Failed to get field definitions:', error);
      return [];
    }
  }
}