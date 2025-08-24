import { Request, Response } from 'express';
import { DirectQueryController } from '../../controllers/directQueryController';
import { elasticsearchService } from '../../services/elasticsearch';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../../services/elasticsearch');
jest.mock('../../utils/logger');

const mockElasticsearchService = elasticsearchService as jest.Mocked<typeof elasticsearchService>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('DirectQueryController', () => {
  let controller: DirectQueryController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    controller = new DirectQueryController();
    
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    mockRequest = {
      body: {},
    };

    jest.clearAllMocks();
  });

  describe('executeDirectQuery', () => {
    it('should execute direct query successfully', async () => {
      const mockQueryResult = {
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          total: { value: 10, relation: 'eq' },
          max_score: 1.0,
          hits: [
            {
              _index: 'test-index',
              _type: '_doc',
              _id: '1',
              _score: 1.0,
              _source: { name: 'test' }
            }
          ]
        },
        aggregations: {}
      };

      mockElasticsearchService.executeDirectQuery.mockResolvedValue(mockQueryResult as any);

      mockRequest.body = {
        index: 'test-index',
        query: { match_all: {} },
        size: 10
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      expect(mockElasticsearchService.executeDirectQuery).toHaveBeenCalledWith({
        index: 'test-index',
        query: { match_all: {} },
        from: 0,
        size: 10,
        _source: undefined
      });

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          took: 5,
          timed_out: false,
          _shards: expect.any(Object),
          hits: expect.objectContaining({
            total: { value: 10, relation: 'eq' },
            hits: expect.any(Array)
          }),
          aggregations: {}
        }),
        meta: expect.objectContaining({
          operationId: expect.any(String),
          totalTime: expect.any(String),
          searchTime: expect.any(String),
          index: 'test-index',
          from: 0,
          size: 10,
          timestamp: expect.any(String)
        })
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Received direct query request'),
        expect.any(Object)
      );
    });

    it('should return error when index is missing', async () => {
      mockRequest.body = {
        query: { match_all: {} }
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_INDEX',
          message: 'Index is required'
        }
      });
    });

    it('should return error when query is missing', async () => {
      mockRequest.body = {
        index: 'test-index'
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'Query is required'
        }
      });
    });

    it('should validate pagination parameters', async () => {
      mockRequest.body = {
        index: 'test-index',
        query: { match_all: {} },
        from: -1
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_FROM',
          message: 'Invalid from parameter. Must be a non-negative number.'
        }
      });
    });

    it('should validate size parameter', async () => {
      mockRequest.body = {
        index: 'test-index',
        query: { match_all: {} },
        size: 1500
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_SIZE',
          message: 'Invalid size parameter. Must be between 1 and 1000.'
        }
      });
    });

    it('should parse JSON string queries', async () => {
      const mockQueryResult = {
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          total: { value: 0, relation: 'eq' },
          max_score: null,
          hits: []
        }
      };

      mockElasticsearchService.executeDirectQuery.mockResolvedValue(mockQueryResult as any);

      mockRequest.body = {
        index: 'test-index',
        query: '{"match_all": {}}',
        size: 10
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      expect(mockElasticsearchService.executeDirectQuery).toHaveBeenCalledWith({
        index: 'test-index',
        query: { match_all: {} },
        from: 0,
        size: 10,
        _source: undefined
      });
    });

    it('should handle invalid JSON query strings', async () => {
      mockRequest.body = {
        index: 'test-index',
        query: '{"invalid": json}',
        size: 10
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INVALID_JSON',
          message: 'Invalid JSON query format',
          details: expect.any(String)
        }
      });
    });

    it('should handle elasticsearch service errors', async () => {
      mockElasticsearchService.executeDirectQuery.mockRejectedValue(
        new Error('Elasticsearch connection failed')
      );

      mockRequest.body = {
        index: 'test-index',
        query: { match_all: {} }
      };

      await expect(
        controller.executeDirectQuery(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow('Elasticsearch connection failed');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Received direct query request'),
        expect.any(Object)
      );
    });

    it('should handle _source parameter', async () => {
      const mockQueryResult = {
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: {
          total: { value: 1, relation: 'eq' },
          max_score: 1.0,
          hits: []
        }
      };

      mockElasticsearchService.executeDirectQuery.mockResolvedValue(mockQueryResult as any);

      mockRequest.body = {
        index: 'test-index',
        query: { match_all: {} },
        _source: ['name', 'id']
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      expect(mockElasticsearchService.executeDirectQuery).toHaveBeenCalledWith({
        index: 'test-index',
        query: { match_all: {} },
        from: 0,
        size: 10,
        _source: ['name', 'id']
      });
    });
  });

  describe('getAvailableIndexes', () => {
    it('should return available indexes successfully', async () => {
      const mockIndexes = ['index1', 'index2', 'index3'];
      mockElasticsearchService.getAllowedIndexes.mockReturnValue(mockIndexes);

      await controller.getAvailableIndexes(mockRequest as Request, mockResponse as Response);

      expect(mockElasticsearchService.getAllowedIndexes).toHaveBeenCalled();
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: mockIndexes,
        meta: expect.objectContaining({
          operationId: expect.any(String),
          totalTime: expect.any(String),
          count: 3,
          timestamp: expect.any(String)
        })
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Getting available indexes')
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Retrieved 3 allowed indexes'),
        expect.any(Object)
      );
    });

    it('should handle empty indexes list', async () => {
      mockElasticsearchService.getAllowedIndexes.mockReturnValue([]);

      await controller.getAvailableIndexes(mockRequest as Request, mockResponse as Response);

      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        data: [],
        meta: expect.objectContaining({
          count: 0
        })
      });
    });
  });

  describe('logging and operation tracking', () => {
    it('should generate unique operation IDs', async () => {
      const mockQueryResult = {
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] }
      };

      mockElasticsearchService.executeDirectQuery.mockResolvedValue(mockQueryResult as any);

      mockRequest.body = {
        index: 'test-index',
        query: { match_all: {} }
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      const logCalls = mockLogger.info.mock.calls;
      const startLogCall = logCalls.find(call => 
        call[0].includes('Received direct query request')
      );
      const endLogCall = logCalls.find(call => 
        call[0].includes('Direct query completed successfully')
      );

      expect(startLogCall).toBeDefined();
      expect(endLogCall).toBeDefined();
      
      if (startLogCall && endLogCall) {
        expect(startLogCall[1]).toHaveProperty('operationId');
        expect(endLogCall[1]).toHaveProperty('operationId');
        expect(startLogCall[1].operationId).toBe(endLogCall[1].operationId);
      }
    });

    it('should log query metadata correctly', async () => {
      const mockQueryResult = {
        took: 5,
        timed_out: false,
        _shards: { total: 1, successful: 1, failed: 0 },
        hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] }
      };

      mockElasticsearchService.executeDirectQuery.mockResolvedValue(mockQueryResult as any);

      mockRequest.body = {
        index: 'test-index',
        query: { match_all: {} },
        from: 5,
        size: 20,
        _source: ['field1', 'field2']
      };

      await controller.executeDirectQuery(mockRequest as Request, mockResponse as Response);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Received direct query request'),
        expect.objectContaining({
          index: 'test-index',
          from: 5,
          size: 20,
          _source: 2, // Array length
          queryType: 'match_all'
        })
      );
    });
  });
});