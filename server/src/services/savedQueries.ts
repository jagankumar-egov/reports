import { elasticsearchService } from './elasticsearch';
import { logger } from '../utils/logger';
import { SavedQuery, CreateSavedQueryRequest, UpdateSavedQueryRequest } from '../types';

class SavedQueriesService {
  private readonly SAVED_QUERIES_INDEX = 'dhr-saved-queries';

  constructor() {
    // Initialize the saved queries index when the service starts
    this.initializeIndex().catch(error => {
      logger.error('Failed to initialize saved queries index:', error);
    });
  }

  private async initializeIndex(): Promise<void> {
    try {
      // Check if the index exists
      const client = (elasticsearchService as any).client;
      if (!client) {
        logger.warn('Elasticsearch client not available, skipping saved queries index initialization');
        return;
      }

      const indexExists = await client.indices.exists({ index: this.SAVED_QUERIES_INDEX });
      
      if (!indexExists) {
        logger.info('Creating saved queries index with mapping');
        
        await client.indices.create({
          index: this.SAVED_QUERIES_INDEX,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 0
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                name: { 
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword', ignore_above: 256 }
                  }
                },
                description: { type: 'text' },
                queryType: { type: 'keyword' },
                targetIndex: { type: 'keyword' },
                queryData: {
                  type: 'object',
                  enabled: false // Store as-is without indexing nested structure
                },
                metadata: {
                  properties: {
                    createdAt: { type: 'date' },
                    updatedAt: { type: 'date' },
                    createdBy: { type: 'keyword' },
                    tags: { type: 'keyword' },
                    executionCount: { type: 'long' },
                    lastExecutedAt: { type: 'date' }
                  }
                }
              }
            }
          }
        });
        
        logger.info(`Saved queries index '${this.SAVED_QUERIES_INDEX}' created successfully`);
      } else {
        logger.info(`Saved queries index '${this.SAVED_QUERIES_INDEX}' already exists`);
      }
    } catch (error) {
      logger.error('Error initializing saved queries index:', error);
      throw error;
    }
  }

  async createSavedQuery(request: CreateSavedQueryRequest): Promise<SavedQuery> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[SAVED-QUERY-CREATE-${operationId}] Creating saved query`, {
      operationId,
      name: request.name,
      queryType: request.queryType,
      targetIndex: request.targetIndex
    });

    try {
      const now = new Date().toISOString();
      const savedQuery: SavedQuery = {
        id: Math.random().toString(36).substr(2, 16),
        name: request.name,
        description: request.description,
        queryType: request.queryType,
        targetIndex: request.targetIndex,
        queryData: request.queryData,
        metadata: {
          createdAt: now,
          updatedAt: now,
          tags: request.tags || [],
          executionCount: 0
        }
      };

      const client = (elasticsearchService as any).client;
      await client.index({
        index: this.SAVED_QUERIES_INDEX,
        id: savedQuery.id,
        body: savedQuery,
        refresh: true
      });

      const totalTime = Date.now() - operationStartTime;
      logger.info(`[SAVED-QUERY-CREATE-${operationId}] Saved query created successfully`, {
        operationId,
        queryId: savedQuery.id,
        totalTime: `${totalTime}ms`
      });

      return savedQuery;
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-CREATE-${operationId}] Failed to create saved query after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getSavedQuery(queryId: string): Promise<SavedQuery | null> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[SAVED-QUERY-GET-${operationId}] Retrieving saved query`, {
      operationId,
      queryId
    });

    try {
      const client = (elasticsearchService as any).client;
      const response = await client.get({
        index: this.SAVED_QUERIES_INDEX,
        id: queryId
      });

      const totalTime = Date.now() - operationStartTime;
      logger.info(`[SAVED-QUERY-GET-${operationId}] Saved query retrieved successfully`, {
        operationId,
        queryId,
        totalTime: `${totalTime}ms`
      });

      return response._source as SavedQuery;
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      
      if ((error as any)?.meta?.statusCode === 404) {
        logger.info(`[SAVED-QUERY-GET-${operationId}] Saved query not found`, {
          operationId,
          queryId,
          totalTime: `${errorTime}ms`
        });
        return null;
      }
      
      logger.error(`[SAVED-QUERY-GET-${operationId}] Failed to retrieve saved query after ${errorTime}ms`, {
        operationId,
        queryId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getAllSavedQueries(options: {
    queryType?: string;
    targetIndex?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ queries: SavedQuery[]; total: number }> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[SAVED-QUERY-LIST-${operationId}] Listing saved queries`, {
      operationId,
      options
    });

    try {
      const client = (elasticsearchService as any).client;
      
      // Build query filters
      const filters: any[] = [];
      
      if (options.queryType) {
        filters.push({ term: { queryType: options.queryType } });
      }
      
      if (options.targetIndex) {
        filters.push({ term: { targetIndex: options.targetIndex } });
      }
      
      if (options.tags && options.tags.length > 0) {
        filters.push({ terms: { 'metadata.tags': options.tags } });
      }

      const query = filters.length > 0 ? { bool: { must: filters } } : { match_all: {} };
      
      const searchBody: any = {
        query,
        sort: [{ 'metadata.updatedAt': { order: 'desc' } }],
        from: options.offset || 0,
        size: options.limit || 100
      };

      const response = await client.search({
        index: this.SAVED_QUERIES_INDEX,
        body: searchBody
      });

      const queries = response.hits.hits.map((hit: any) => hit._source as SavedQuery);
      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;

      const totalTime = Date.now() - operationStartTime;
      logger.info(`[SAVED-QUERY-LIST-${operationId}] Saved queries listed successfully`, {
        operationId,
        count: queries.length,
        total,
        totalTime: `${totalTime}ms`
      });

      return { queries, total };
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-LIST-${operationId}] Failed to list saved queries after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async updateSavedQuery(queryId: string, updates: UpdateSavedQueryRequest): Promise<SavedQuery | null> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[SAVED-QUERY-UPDATE-${operationId}] Updating saved query`, {
      operationId,
      queryId,
      updates: Object.keys(updates)
    });

    try {
      // First, get the existing query
      const existingQuery = await this.getSavedQuery(queryId);
      if (!existingQuery) {
        logger.info(`[SAVED-QUERY-UPDATE-${operationId}] Saved query not found for update`, {
          operationId,
          queryId
        });
        return null;
      }

      // Apply updates
      const updatedQuery: SavedQuery = {
        ...existingQuery,
        ...updates,
        queryData: updates.queryData ? { ...existingQuery.queryData, ...updates.queryData } : existingQuery.queryData,
        metadata: {
          ...existingQuery.metadata,
          updatedAt: new Date().toISOString(),
          tags: updates.tags !== undefined ? updates.tags : existingQuery.metadata.tags
        }
      };

      const client = (elasticsearchService as any).client;
      await client.index({
        index: this.SAVED_QUERIES_INDEX,
        id: queryId,
        body: updatedQuery,
        refresh: true
      });

      const totalTime = Date.now() - operationStartTime;
      logger.info(`[SAVED-QUERY-UPDATE-${operationId}] Saved query updated successfully`, {
        operationId,
        queryId,
        totalTime: `${totalTime}ms`
      });

      return updatedQuery;
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-UPDATE-${operationId}] Failed to update saved query after ${errorTime}ms`, {
        operationId,
        queryId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async deleteSavedQuery(queryId: string): Promise<boolean> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[SAVED-QUERY-DELETE-${operationId}] Deleting saved query`, {
      operationId,
      queryId
    });

    try {
      const client = (elasticsearchService as any).client;
      await client.delete({
        index: this.SAVED_QUERIES_INDEX,
        id: queryId,
        refresh: true
      });

      const totalTime = Date.now() - operationStartTime;
      logger.info(`[SAVED-QUERY-DELETE-${operationId}] Saved query deleted successfully`, {
        operationId,
        queryId,
        totalTime: `${totalTime}ms`
      });

      return true;
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      
      if ((error as any)?.meta?.statusCode === 404) {
        logger.info(`[SAVED-QUERY-DELETE-${operationId}] Saved query not found for deletion`, {
          operationId,
          queryId,
          totalTime: `${errorTime}ms`
        });
        return false;
      }
      
      logger.error(`[SAVED-QUERY-DELETE-${operationId}] Failed to delete saved query after ${errorTime}ms`, {
        operationId,
        queryId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async incrementExecutionCount(queryId: string): Promise<void> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[SAVED-QUERY-EXEC-${operationId}] Incrementing execution count`, {
      operationId,
      queryId
    });

    try {
      const client = (elasticsearchService as any).client;
      await client.update({
        index: this.SAVED_QUERIES_INDEX,
        id: queryId,
        body: {
          script: {
            source: `
              if (ctx._source.metadata.executionCount == null) {
                ctx._source.metadata.executionCount = 1;
              } else {
                ctx._source.metadata.executionCount++;
              }
              ctx._source.metadata.lastExecutedAt = params.now;
            `,
            params: {
              now: new Date().toISOString()
            }
          }
        },
        refresh: true
      });

      const totalTime = Date.now() - operationStartTime;
      logger.info(`[SAVED-QUERY-EXEC-${operationId}] Execution count incremented successfully`, {
        operationId,
        queryId,
        totalTime: `${totalTime}ms`
      });
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[SAVED-QUERY-EXEC-${operationId}] Failed to increment execution count after ${errorTime}ms`, {
        operationId,
        queryId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw error for execution count updates as it's not critical
    }
  }
}

export const savedQueriesService = new SavedQueriesService();