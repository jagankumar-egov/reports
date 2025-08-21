import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import { logger } from '../utils/logger';
import { ElasticsearchConfig, ElasticsearchResponse } from '../types';

class ElasticsearchService {
  private client: Client | null = null;
  private config!: ElasticsearchConfig;

  constructor() {
    // Config will be loaded in initialize() after dotenv.config() has been called
  }

  async initialize(): Promise<void> {
    try {
      // Load config from environment variables
      const projectIndexMapping: Record<string, string> = {};
      if (process.env.PROJECT_INDEX_MAPPING) {
        const mappingPairs = process.env.PROJECT_INDEX_MAPPING.split(',');
        for (const pair of mappingPairs) {
          const [project, index] = pair.trim().split(':');
          if (project && index) {
            projectIndexMapping[project.toLowerCase()] = index;
          }
        }
      }

      this.config = {
        host: process.env.ELASTICSEARCH_HOST!,
        username: process.env.ELASTICSEARCH_USERNAME!,
        password: process.env.ELASTICSEARCH_PASSWORD!,
        caCert: process.env.ELASTICSEARCH_CA_CERT,
        allowedIndexes: process.env.ALLOWED_HEALTH_INDEXES?.split(',') || [],
        projectIndexMapping: projectIndexMapping,
        requestTimeout: 30000,
        maxRetries: 3,
      };

      logger.info('Elasticsearch configuration:', {
        host: this.config.host,
        hasUsername: !!this.config.username,
        hasPassword: !!this.config.password,
        allowedIndexes: this.config.allowedIndexes,
      });

      const clientConfig: any = {
        node: this.config.host,
        requestTimeout: this.config.requestTimeout,
        maxRetries: this.config.maxRetries,
      };

      // Only add auth if credentials are provided
      if (this.config.username && this.config.password) {
        clientConfig.auth = {
          username: this.config.username,
          password: this.config.password,
        };
      }

      // Add SSL configuration if CA cert is provided
      if (this.config.caCert && fs.existsSync(this.config.caCert)) {
        clientConfig.tls = {
          ca: fs.readFileSync(this.config.caCert),
          rejectUnauthorized: true,
        };
      }

      logger.info('Elasticsearch client config:', JSON.stringify(clientConfig, null, 2));

      this.client = new Client(clientConfig);

      // Test connection (skip in development if configured)
      if (process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK === 'true') {
        logger.info('Skipping Elasticsearch health check (development mode)');
      } else {
        const health = await this.client.cluster.health();
        logger.info('Elasticsearch cluster health:', health);

        // Verify access to allowed indexes
        await this.verifyIndexAccess();
      }

    } catch (error) {
      logger.error('Failed to initialize Elasticsearch client:', error);
      throw error;
    }
  }

  private async verifyIndexAccess(): Promise<void> {
    if (!this.client) throw new Error('Elasticsearch client not initialized');

    try {
      for (const indexPattern of this.config.allowedIndexes) {
        const exists = await this.client.indices.exists({ index: indexPattern });
        if (!exists) {
          logger.warn(`Index pattern '${indexPattern}' does not exist`);
        } else {
          logger.info(`Verified access to index pattern: ${indexPattern}`);
        }
      }
    } catch (error) {
      logger.error('Failed to verify index access:', error);
      throw error;
    }
  }

  async search(params: {
    index: string | string[];
    query: any;
    from?: number;
    size?: number;
    sort?: any[];
    _source?: string[] | boolean;
  }): Promise<ElasticsearchResponse> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[ES-SEARCH-${operationId}] Starting Elasticsearch search operation`, {
      operationId,
      index: params.index,
      queryType: params.query?.bool ? 'bool' : params.query?.match_all ? 'match_all' : 'other',
      from: params.from || 0,
      size: params.size || 50,
    });

    if (!this.client) {
      logger.error(`[ES-SEARCH-${operationId}] Elasticsearch client not initialized`);
      throw new Error('Elasticsearch client not initialized');
    }

    // Validate index access
    const requestedIndexes = Array.isArray(params.index) ? params.index : [params.index];
    logger.debug(`[ES-SEARCH-${operationId}] Validating access to indexes:`, requestedIndexes);
    
    const validationStartTime = Date.now();
    this.validateIndexAccess(requestedIndexes);
    const validationTime = Date.now() - validationStartTime;
    logger.debug(`[ES-SEARCH-${operationId}] Index validation completed in ${validationTime}ms`);

    try {
      const searchStartTime = Date.now();
      
      logger.info(`[ES-SEARCH-${operationId}] Executing Elasticsearch search`, {
        operationId,
        host: this.config.host,
        indexes: requestedIndexes,
        query: JSON.stringify(params.query),
      });
      
      const response = await this.client.search({
        index: params.index,
        body: {
          query: params.query,
          from: params.from || 0,
          size: params.size || 50,
          sort: params.sort,
          _source: params._source,
        },
      });

      const searchTime = Date.now() - searchStartTime;
      const totalTime = Date.now() - operationStartTime;
      
      logger.info(`[ES-SEARCH-${operationId}] Elasticsearch search completed successfully`, {
        operationId,
        searchTime: `${searchTime}ms`,
        totalTime: `${totalTime}ms`,
        esTook: `${response.took}ms`,
        hits: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
        shards: response._shards,
      });

      // Transform response to match our interface
      const transformedResponse = {
        ...response,
        _shards: {
          ...response._shards,
          skipped: response._shards.skipped || 0,
        }
      };

      return transformedResponse as any;
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[ES-SEARCH-${operationId}] Elasticsearch search failed after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        host: this.config.host,
        indexes: requestedIndexes,
        errorType: error instanceof Error ? error.name : 'UnknownError',
        statusCode: (error as any)?.meta?.statusCode,
      });
      throw error;
    }
  }

  async getMapping(index: string): Promise<any> {
    if (!this.client) throw new Error('Elasticsearch client not initialized');

    this.validateIndexAccess([index]);

    try {
      const response = await this.client.indices.getMapping({ index });
      return response;
    } catch (error) {
      logger.error(`Failed to get mapping for index ${index}:`, error);
      throw error;
    }
  }

  async getIndicesStats(): Promise<any> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[ES-STATS-${operationId}] Starting indices stats operation`, {
      operationId,
      configuredIndexes: this.config.allowedIndexes,
    });

    if (!this.client) {
      logger.error(`[ES-STATS-${operationId}] Elasticsearch client not initialized`);
      throw new Error('Elasticsearch client not initialized');
    }

    try {
      // First check which indexes actually exist
      const existingIndexes = [];
      const checkStartTime = Date.now();
      
      logger.info(`[ES-STATS-${operationId}] Checking existence of ${this.config.allowedIndexes.length} configured indexes`);
      
      for (const index of this.config.allowedIndexes) {
        const indexCheckStart = Date.now();
        try {
          logger.debug(`[ES-STATS-${operationId}] Checking existence of index: ${index}`);
          const exists = await this.client.indices.exists({ index });
          const indexCheckTime = Date.now() - indexCheckStart;
          
          if (exists) {
            existingIndexes.push(index);
            logger.info(`[ES-STATS-${operationId}] Index '${index}' exists (checked in ${indexCheckTime}ms)`);
          } else {
            logger.warn(`[ES-STATS-${operationId}] Index '${index}' does not exist (checked in ${indexCheckTime}ms)`);
          }
        } catch (error) {
          const indexCheckTime = Date.now() - indexCheckStart;
          logger.warn(`[ES-STATS-${operationId}] Failed to check existence of index '${index}' after ${indexCheckTime}ms:`, {
            error: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.name : 'UnknownError',
            statusCode: (error as any)?.meta?.statusCode,
          });
        }
      }

      const checkTime = Date.now() - checkStartTime;
      logger.info(`[ES-STATS-${operationId}] Index existence check completed in ${checkTime}ms`, {
        operationId,
        totalConfigured: this.config.allowedIndexes.length,
        existingCount: existingIndexes.length,
        existingIndexes,
      });

      if (existingIndexes.length === 0) {
        const totalTime = Date.now() - operationStartTime;
        logger.warn(`[ES-STATS-${operationId}] No existing indexes found, returning empty stats after ${totalTime}ms`);
        return { indices: {} };
      }

      const statsStartTime = Date.now();
      logger.info(`[ES-STATS-${operationId}] Getting stats for existing indexes`, {
        operationId,
        indexes: existingIndexes,
      });

      const response = await this.client.indices.stats({
        index: existingIndexes.join(','),
        metric: ['docs', 'store'],
      });

      const statsTime = Date.now() - statsStartTime;
      const totalTime = Date.now() - operationStartTime;
      
      logger.info(`[ES-STATS-${operationId}] Indices stats completed successfully`, {
        operationId,
        statsTime: `${statsTime}ms`,
        totalTime: `${totalTime}ms`,
        indexCount: existingIndexes.length,
        responseIndexes: Object.keys(response.indices || {}),
      });

      return response;
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[ES-STATS-${operationId}] Failed to get indices stats after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : 'UnknownError',
        statusCode: (error as any)?.meta?.statusCode,
        host: this.config.host,
      });
      throw error;
    }
  }

  private validateIndexAccess(requestedIndexes: string[]): void {
    const allowedPatterns = this.config.allowedIndexes;
    
    for (const requestedIndex of requestedIndexes) {
      const isAllowed = allowedPatterns.some(pattern => {
        // Simple pattern matching - can be enhanced with proper glob matching
        if (pattern.endsWith('*')) {
          return requestedIndex.startsWith(pattern.slice(0, -1));
        }
        return requestedIndex === pattern;
      });

      if (!isAllowed) {
        throw new Error(`Access denied to index: ${requestedIndex}`);
      }
    }
  }

  getAllowedIndexes(): string[] {
    return [...this.config.allowedIndexes];
  }

  getProjectIndexMapping(): Record<string, string> {
    return { ...this.config.projectIndexMapping };
  }

  async ping(): Promise<boolean> {
    const operationStartTime = Date.now();
    const operationId = Math.random().toString(36).substr(2, 9);
    
    logger.info(`[ES-PING-${operationId}] Starting Elasticsearch ping operation`, {
      operationId,
      host: this.config?.host || 'unknown',
    });

    if (!this.client) {
      logger.warn(`[ES-PING-${operationId}] Elasticsearch client not initialized, returning false`);
      return false;
    }

    try {
      const pingStartTime = Date.now();
      await this.client.ping();
      const pingTime = Date.now() - pingStartTime;
      const totalTime = Date.now() - operationStartTime;
      
      logger.info(`[ES-PING-${operationId}] Elasticsearch ping successful`, {
        operationId,
        pingTime: `${pingTime}ms`,
        totalTime: `${totalTime}ms`,
        host: this.config.host,
      });
      return true;
    } catch (error) {
      const errorTime = Date.now() - operationStartTime;
      logger.error(`[ES-PING-${operationId}] Elasticsearch ping failed after ${errorTime}ms`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.name : 'UnknownError',
        statusCode: (error as any)?.meta?.statusCode,
        host: this.config?.host || 'unknown',
      });
      return false;
    }
  }
}

export const elasticsearchService = new ElasticsearchService();