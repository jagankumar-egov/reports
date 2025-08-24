import { Client } from '@elastic/elasticsearch';
import { elasticsearchService } from '../../services/elasticsearch';
import { logger } from '../../utils/logger';
import fs from 'fs';

// Mock dependencies
jest.mock('@elastic/elasticsearch');
jest.mock('../../utils/logger');
jest.mock('fs');

const MockClient = Client as jest.MockedClass<typeof Client>;
const mockLogger = logger as jest.Mocked<typeof logger>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ElasticsearchService', () => {
  let mockClientInstance: jest.Mocked<Client>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClientInstance = {
      search: jest.fn(),
      ping: jest.fn(),
      cluster: {
        health: jest.fn(),
      },
      indices: {
        exists: jest.fn(),
        getMapping: jest.fn(),
        stats: jest.fn(),
      },
    } as any;

    MockClient.mockImplementation(() => mockClientInstance);

    // Reset environment variables
    delete process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK;
    process.env.ELASTICSEARCH_HOST = 'http://localhost:9200';
    process.env.ELASTICSEARCH_USERNAME = 'elastic';
    process.env.ELASTICSEARCH_PASSWORD = 'password';
    process.env.ALLOWED_HEALTH_INDEXES = 'index1,index2,index3';
  });

  afterEach(() => {
    // Clean up any modifications to the service
    (elasticsearchService as any).client = null;
    (elasticsearchService as any).config = undefined;
  });

  describe('initialize', () => {
    it('should initialize successfully with basic configuration', async () => {
      mockClientInstance.cluster.health.mockResolvedValue({
        status: 'green',
        number_of_nodes: 1
      } as any);

      mockClientInstance.indices.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await elasticsearchService.initialize();

      expect(MockClient).toHaveBeenCalledWith({
        node: 'http://localhost:9200',
        requestTimeout: 30000,
        maxRetries: 3,
        auth: {
          username: 'elastic',
          password: 'password'
        }
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Elasticsearch configuration:',
        expect.objectContaining({
          host: 'http://localhost:9200',
          hasUsername: true,
          hasPassword: true,
          allowedIndexes: ['index1', 'index2', 'index3']
        })
      );
    });

    it('should skip health check in development mode', async () => {
      process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK = 'true';

      await elasticsearchService.initialize();

      expect(mockClientInstance.cluster.health).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Skipping Elasticsearch health check (development mode)'
      );
    });

    it('should configure SSL when CA cert is provided', async () => {
      process.env.ELASTICSEARCH_CA_CERT = '/path/to/ca.crt';
      process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK = 'true';
      
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(Buffer.from('cert-content'));

      await elasticsearchService.initialize();

      expect(MockClient).toHaveBeenCalledWith(
        expect.objectContaining({
          tls: {
            ca: Buffer.from('cert-content'),
            rejectUnauthorized: true
          }
        })
      );
    });

    it('should initialize without auth when credentials are not provided', async () => {
      delete process.env.ELASTICSEARCH_USERNAME;
      delete process.env.ELASTICSEARCH_PASSWORD;
      process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK = 'true';

      await elasticsearchService.initialize();

      expect(MockClient).toHaveBeenCalledWith(
        expect.not.objectContaining({
          auth: expect.anything()
        })
      );
    });

    it('should handle initialization errors', async () => {
      mockClientInstance.cluster.health.mockRejectedValue(
        new Error('Connection failed')
      );

      await expect(elasticsearchService.initialize()).rejects.toThrow(
        'Connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize Elasticsearch client:',
        expect.any(Error)
      );
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK = 'true';
      await elasticsearchService.initialize();
    });

    it('should execute search successfully', async () => {
      const mockSearchResult = {
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          total: { value: 10, relation: 'eq' },
          max_score: 1.0,
          hits: []
        }
      };

      mockClientInstance.search.mockResolvedValue(mockSearchResult as any);

      const result = await elasticsearchService.search({
        index: 'index1',
        query: { match_all: {} },
        from: 0,
        size: 10
      });

      expect(mockClientInstance.search).toHaveBeenCalledWith({
        index: 'index1',
        body: {
          query: { match_all: {} },
          from: 0,
          size: 50, // Default size
          sort: undefined,
          _source: undefined
        }
      });

      expect(result).toEqual(expect.objectContaining({
        took: 5,
        timed_out: false,
        _shards: expect.objectContaining({
          total: 1,
          successful: 1,
          failed: 0,
          skipped: 0
        }),
        hits: expect.any(Object)
      }));
    });

    it('should validate index access', async () => {
      await expect(
        elasticsearchService.search({
          index: 'unauthorized-index',
          query: { match_all: {} }
        })
      ).rejects.toThrow('Access denied to index: unauthorized-index');
    });

    it('should handle multiple indexes', async () => {
      const mockSearchResult = {
        took: 5,
        _shards: { total: 2, successful: 2, failed: 0 },
        hits: { total: { value: 0 }, hits: [] }
      };

      mockClientInstance.search.mockResolvedValue(mockSearchResult as any);

      await elasticsearchService.search({
        index: ['index1', 'index2'],
        query: { match_all: {} }
      });

      expect(mockClientInstance.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: ['index1', 'index2']
        })
      );
    });

    it('should throw error when client is not initialized', async () => {
      (elasticsearchService as any).client = null;

      await expect(
        elasticsearchService.search({
          index: 'index1',
          query: { match_all: {} }
        })
      ).rejects.toThrow('Elasticsearch client not initialized');
    });

    it('should handle elasticsearch errors', async () => {
      mockClientInstance.search.mockRejectedValue(
        new Error('Search failed')
      );

      await expect(
        elasticsearchService.search({
          index: 'index1',
          query: { match_all: {} }
        })
      ).rejects.toThrow('Search failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Elasticsearch search failed'),
        expect.objectContaining({
          error: 'Search failed'
        })
      );
    });
  });

  describe('executeDirectQuery', () => {
    beforeEach(async () => {
      process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK = 'true';
      await elasticsearchService.initialize();
    });

    it('should execute direct query successfully', async () => {
      const mockSearchResult = {
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          total: { value: 5, relation: 'eq' },
          max_score: 1.0,
          hits: []
        }
      };

      mockClientInstance.search.mockResolvedValue(mockSearchResult as any);

      const result = await elasticsearchService.executeDirectQuery({
        index: 'index1',
        query: { query: { match_all: {} }, size: 20 },
        from: 10,
        size: 20
      });

      expect(mockClientInstance.search).toHaveBeenCalledWith({
        index: 'index1',
        body: {
          query: { match_all: {} },
          size: 20,
          from: 10
        }
      });

      expect(result).toEqual(mockSearchResult);
    });

    it('should handle _source parameter', async () => {
      const mockSearchResult = {
        took: 5,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: { total: { value: 0 }, hits: [] }
      };

      mockClientInstance.search.mockResolvedValue(mockSearchResult as any);

      await elasticsearchService.executeDirectQuery({
        index: 'index1',
        query: { query: { match_all: {} } },
        _source: ['field1', 'field2']
      });

      expect(mockClientInstance.search).toHaveBeenCalledWith({
        index: 'index1',
        body: {
          query: { match_all: {} },
          from: 0,
          size: 10,
          _source: ['field1', 'field2']
        }
      });
    });

    it('should validate index access for direct queries', async () => {
      await expect(
        elasticsearchService.executeDirectQuery({
          index: 'unauthorized-index',
          query: { query: { match_all: {} } }
        })
      ).rejects.toThrow('Access denied to index: unauthorized-index');
    });
  });

  describe('getIndicesStats', () => {
    beforeEach(async () => {
      process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK = 'true';
      await elasticsearchService.initialize();
    });

    it('should get stats for existing indices', async () => {
      mockClientInstance.indices.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const mockStatsResult = {
        indices: {
          'index1': { docs: { count: 100 }, store: { size_in_bytes: 1024 } },
          'index2': { docs: { count: 200 }, store: { size_in_bytes: 2048 } }
        }
      };

      mockClientInstance.indices.stats.mockResolvedValue(mockStatsResult as any);

      const result = await elasticsearchService.getIndicesStats();

      expect(mockClientInstance.indices.exists).toHaveBeenCalledTimes(3);
      expect(mockClientInstance.indices.stats).toHaveBeenCalledWith({
        index: 'index1,index2',
        metric: ['docs', 'store']
      });

      expect(result).toEqual(mockStatsResult);
    });

    it('should return empty stats when no indices exist', async () => {
      mockClientInstance.indices.exists
        .mockResolvedValue(false);

      const result = await elasticsearchService.getIndicesStats();

      expect(result).toEqual({ indices: {} });
      expect(mockClientInstance.indices.stats).not.toHaveBeenCalled();
    });
  });

  describe('validateIndexAccess', () => {
    beforeEach(async () => {
      process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK = 'true';
      await elasticsearchService.initialize();
    });

    it('should allow access to configured indexes', () => {
      expect(() => {
        (elasticsearchService as any).validateIndexAccess(['index1', 'index2']);
      }).not.toThrow();
    });

    it('should support wildcard patterns', () => {
      process.env.ALLOWED_HEALTH_INDEXES = 'test-*,production-index';
      
      // Re-initialize with new config
      (elasticsearchService as any).config = {
        allowedIndexes: ['test-*', 'production-index']
      };

      expect(() => {
        (elasticsearchService as any).validateIndexAccess(['test-123', 'test-abc']);
      }).not.toThrow();

      expect(() => {
        (elasticsearchService as any).validateIndexAccess(['production-index']);
      }).not.toThrow();
    });

    it('should deny access to unauthorized indexes', () => {
      expect(() => {
        (elasticsearchService as any).validateIndexAccess(['unauthorized-index']);
      }).toThrow('Access denied to index: unauthorized-index');
    });
  });

  describe('ping', () => {
    beforeEach(async () => {
      process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK = 'true';
      await elasticsearchService.initialize();
    });

    it('should return true when ping succeeds', async () => {
      mockClientInstance.ping.mockResolvedValue({} as any);

      const result = await elasticsearchService.ping();

      expect(result).toBe(true);
      expect(mockClientInstance.ping).toHaveBeenCalled();
    });

    it('should return false when ping fails', async () => {
      mockClientInstance.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await elasticsearchService.ping();

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Elasticsearch ping failed'),
        expect.objectContaining({
          error: 'Connection failed'
        })
      );
    });

    it('should return false when client is not initialized', async () => {
      (elasticsearchService as any).client = null;

      const result = await elasticsearchService.ping();

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Elasticsearch client not initialized')
      );
    });
  });

  describe('getAllowedIndexes', () => {
    beforeEach(async () => {
      process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK = 'true';
      await elasticsearchService.initialize();
    });

    it('should return copy of allowed indexes', () => {
      const indexes = elasticsearchService.getAllowedIndexes();

      expect(indexes).toEqual(['index1', 'index2', 'index3']);
      
      // Should return a copy, not the original array
      indexes.push('new-index');
      expect(elasticsearchService.getAllowedIndexes()).toEqual(['index1', 'index2', 'index3']);
    });
  });
});