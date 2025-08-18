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
      this.config = {
        host: process.env.ELASTICSEARCH_HOST!,
        username: process.env.ELASTICSEARCH_USERNAME!,
        password: process.env.ELASTICSEARCH_PASSWORD!,
        caCert: process.env.ELASTICSEARCH_CA_CERT,
        allowedIndexes: process.env.ALLOWED_HEALTH_INDEXES?.split(',') || [],
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
    if (!this.client) throw new Error('Elasticsearch client not initialized');

    // Validate index access
    const requestedIndexes = Array.isArray(params.index) ? params.index : [params.index];
    this.validateIndexAccess(requestedIndexes);

    try {
      const startTime = Date.now();
      
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

      const executionTime = Date.now() - startTime;
      logger.info(`Elasticsearch query executed in ${executionTime}ms`, {
        index: params.index,
        took: response.took,
        hits: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
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
      logger.error('Elasticsearch search failed:', error);
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
    if (!this.client) throw new Error('Elasticsearch client not initialized');

    try {
      const response = await this.client.indices.stats({
        index: this.config.allowedIndexes.join(','),
        metric: ['docs', 'store'],
      });
      return response;
    } catch (error) {
      logger.error('Failed to get indices stats:', error);
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

  async ping(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Elasticsearch ping failed:', error);
      return false;
    }
  }
}

export const elasticsearchService = new ElasticsearchService();