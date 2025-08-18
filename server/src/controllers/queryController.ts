import { Request, Response } from 'express';
import { elasticsearchService } from '../services/elasticsearch';
import { jqlConverterService } from '../services/jqlConverter';
import { logger } from '../utils/logger';
import { QueryRequest, QueryResult, HealthRecord, ApiResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

export class QueryController {
  async executeQuery(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    const { jql, startAt = 0, maxResults = 50, fields }: QueryRequest = req.body;

    try {
      // Get allowed indexes
      const allowedIndexes = elasticsearchService.getAllowedIndexes();

      // Validate JQL
      const validation = jqlConverterService.validateJQL(jql, allowedIndexes);
      if (!validation.isValid) {
        throw new AppError(
          `Invalid JQL: ${validation.errors.map(e => e.message).join(', ')}`,
          400,
          'INVALID_JQL'
        );
      }

      // Convert JQL to Elasticsearch query
      const { query, indexes, sort } = jqlConverterService.convertJQLToElasticsearch(jql, allowedIndexes);

      if (indexes.length === 0) {
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

      const esResponse = await elasticsearchService.search(searchParams);

      // Transform results
      const issues: HealthRecord[] = esResponse.hits.hits.map(hit => ({
        id: hit._id,
        index: hit._index,
        source: hit._source,
        score: hit._score,
        fields: hit._source,
      }));

      // Get field definitions (simplified for Phase 1)
      const fieldDefinitions = await this.getFieldDefinitionsForIndexes(indexes);

      const result: QueryResult = {
        total: esResponse.hits.total.value,
        startAt,
        maxResults,
        issues,
        fields: fieldDefinitions,
        executionTime: Date.now() - startTime,
      };

      logger.info('Query executed successfully', {
        jql,
        indexes,
        totalHits: result.total,
        returnedHits: issues.length,
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
      logger.error('Query execution failed:', error);
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