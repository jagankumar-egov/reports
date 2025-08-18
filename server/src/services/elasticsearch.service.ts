import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import logger from '../utils/logger';

class ElasticsearchService {
  private client: Client;

  constructor() {
    const clientConfig: any = {
      node: config.elasticsearch.host,
      tls: {
        rejectUnauthorized: false
      }
    };

    if (config.elasticsearch.apiKey) {
      clientConfig.auth = {
        apiKey: config.elasticsearch.apiKey,
      };
    } else if (config.elasticsearch.username && config.elasticsearch.password) {
      clientConfig.auth = {
        username: config.elasticsearch.username,
        password: config.elasticsearch.password,
      };
    }

    this.client = new Client(clientConfig);
    this.initializeConfigIndices();
  }

  private async initializeConfigIndices() {
    try {
      const indices = [
        config.configIndices.datapoints,
        config.configIndices.dashboards,
        config.configIndices.audit,
      ];

      for (const index of indices) {
        const exists = await this.client.indices.exists({ index });
        if (!exists) {
          await this.createConfigIndex(index);
          logger.info(`Created configuration index: ${index}`);
        }
      }
    } catch (error) {
      logger.error('Failed to initialize configuration indices:', error);
      // Continue without config indices for demo purposes
    }
  }

  private async createConfigIndex(indexName: string) {
    const mappings = this.getIndexMappings(indexName);
    await this.client.indices.create({
      index: indexName,
      body: {
        mappings: mappings as any,
        settings: {
          number_of_shards: 1,
          number_of_replicas: 1,
        },
      },
    });
  }

  private getIndexMappings(indexName: string) {
    const baseMappings = {
      properties: {
        name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        slug: { type: 'keyword' },
        description: { type: 'text' },
        tags: { type: 'keyword' },
        version: { type: 'integer' },
        createdBy: { type: 'keyword' },
        createdAt: { type: 'date' },
        updatedBy: { type: 'keyword' },
        updatedAt: { type: 'date' },
        isArchived: { type: 'boolean' },
      },
    };

    if (indexName === config.configIndices.datapoints) {
      return {
        ...baseMappings,
        properties: {
          ...baseMappings.properties,
          source: {
            properties: {
              indices: { type: 'keyword' },
              timeField: { type: 'keyword' },
              defaultTimeRange: { type: 'keyword' },
            },
          },
          query: { type: 'object', enabled: false },
          projections: { type: 'keyword' },
          aggs: { type: 'object', enabled: false },
          sampleColumns: { type: 'keyword' },
        },
      };
    }

    if (indexName === config.configIndices.dashboards) {
      return {
        ...baseMappings,
        properties: {
          ...baseMappings.properties,
          layout: { type: 'object', enabled: false },
          widgets: { type: 'nested', enabled: false },
        },
      };
    }

    return baseMappings;
  }

  validateIndexAccess(indices: string[]): boolean {
    const allowedIndices = config.elasticsearch.allowedIndices;
    
    for (const index of indices) {
      let isAllowed = false;
      for (const allowedPattern of allowedIndices) {
        const pattern = allowedPattern.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(index)) {
          isAllowed = true;
          break;
        }
      }
      if (!isAllowed) {
        return false;
      }
    }
    return true;
  }

  async getFieldMappings(index: string) {
    if (!this.validateIndexAccess([index])) {
      throw new Error(`Access denied to index: ${index}`);
    }

    try {
      const mapping = await this.client.indices.getMapping({ index });
      return mapping;
    } catch (error) {
      // Return demo mapping when ES is unavailable
      return this.getDemoMapping(index);
    }
  }

  async getFieldCaps(indices: string[], fields: string[] = ['*']) {
    if (!this.validateIndexAccess(indices)) {
      throw new Error('Access denied to one or more indices');
    }

    const fieldCaps = await this.client.fieldCaps({
      index: indices,
      fields,
    });
    return fieldCaps;
  }

  async search(index: string | string[], body: any) {
    const indices = Array.isArray(index) ? index : [index];
    if (!this.validateIndexAccess(indices)) {
      throw new Error('Access denied to one or more indices');
    }

    try {
      const result = await this.client.search({
        index,
        body,
      });
      return result;
    } catch (error) {
      // Return demo search results when ES is unavailable
      return this.getDemoSearchResults(indices[0], body);
    }
  }

  async saveDataPoint(dataPoint: any) {
    const id = dataPoint.slug;
    const result = await this.client.index({
      index: config.configIndices.datapoints,
      id,
      body: {
        ...dataPoint,
        updatedAt: new Date().toISOString(),
      },
    });
    return result;
  }


  async listDataPoints() {
    try {
      const result = await this.client.search({
        index: config.configIndices.datapoints,
        body: {
          query: {
            bool: {
              must_not: {
                term: { isArchived: true },
              },
            },
          },
          size: 1000,
        },
      });
      return result.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      // Return demo data points when ES is unavailable
      return this.getDemoDataPoints();
    }
  }

  async deleteDataPoint(id: string) {
    const result = await this.client.update({
      index: config.configIndices.datapoints,
      id,
      body: {
        doc: {
          isArchived: true,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return result;
  }

  async saveDashboard(dashboard: any) {
    const id = dashboard.slug;
    const result = await this.client.index({
      index: config.configIndices.dashboards,
      id,
      body: {
        ...dashboard,
        updatedAt: new Date().toISOString(),
      },
    });
    return result;
  }

  async getDashboard(id: string) {
    try {
      const result = await this.client.get({
        index: config.configIndices.dashboards,
        id,
      });
      return result._source;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async listDashboards() {
    const result = await this.client.search({
      index: config.configIndices.dashboards,
      body: {
        query: {
          bool: {
            must_not: {
              term: { isArchived: true },
            },
          },
        },
        size: 1000,
      },
    });
    return result.hits.hits.map((hit: any) => hit._source);
  }

  async deleteDashboard(id: string) {
    const result = await this.client.update({
      index: config.configIndices.dashboards,
      id,
      body: {
        doc: {
          isArchived: true,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return result;
  }

  async logAudit(action: string, entity: string, entityId: string, user: string, details?: any) {
    await this.client.index({
      index: config.configIndices.audit,
      body: {
        action,
        entity,
        entityId,
        user,
        timestamp: new Date().toISOString(),
        details,
      },
    });
  }

  private getDemoDataPoints() {
    return [
      {
        slug: 'demo-sales-overview',
        name: 'Sales Overview',
        description: 'Overview of sales data with product categories and revenue',
        source: {
          indices: ['demo-sales'],
          timeField: 'timestamp',
          defaultTimeRange: 'now-30d'
        },
        projections: ['product', 'category', 'price', 'quantity', 'revenue', 'timestamp'],
        tags: ['sales', 'revenue', 'demo'],
        version: 1,
        createdBy: 'demo',
        createdAt: '2025-08-18T00:00:00.000Z',
        updatedBy: 'demo',
        updatedAt: '2025-08-18T00:00:00.000Z',
        isArchived: false,
        aggs: {
          category_breakdown: {
            terms: {
              field: 'category.keyword',
              size: 10
            },
            aggs: {
              total_revenue: {
                sum: {
                  field: 'revenue'
                }
              }
            }
          }
        }
      },
      {
        slug: 'demo-analytics-events',
        name: 'Analytics Events',
        description: 'User behavior analytics and page views',
        source: {
          indices: ['demo-analytics'],
          timeField: 'timestamp',
          defaultTimeRange: 'now-7d'
        },
        projections: ['event_type', 'page', 'user_id', 'session_id', 'timestamp'],
        tags: ['analytics', 'events', 'demo'],
        version: 1,
        createdBy: 'demo',
        createdAt: '2025-08-18T00:00:00.000Z',
        updatedBy: 'demo',
        updatedAt: '2025-08-18T00:00:00.000Z',
        isArchived: false,
        aggs: {
          event_types: {
            terms: {
              field: 'event_type.keyword',
              size: 5
            }
          }
        }
      }
    ];
  }

  async getDataPoint(id: string) {
    try {
      const result = await this.client.get({
        index: config.configIndices.datapoints,
        id,
      });
      return result._source;
    } catch (error: any) {
      // Return demo data point if available (for any error, not just 404)
      const demoDataPoints = this.getDemoDataPoints();
      return demoDataPoints.find(dp => dp.slug === id) || null;
    }
  }

  private getDemoSearchResults(index: string, body: any) {
    const now = new Date();
    
    if (index === 'demo-sales') {
      const salesData = [
        {
          product: 'Laptop Pro',
          category: 'Electronics',
          price: 1299.99,
          quantity: 2,
          revenue: 2599.98,
          timestamp: new Date(now.getTime() - 86400000 * 1).toISOString() // 1 day ago
        },
        {
          product: 'Wireless Mouse',
          category: 'Electronics',
          price: 49.99,
          quantity: 5,
          revenue: 249.95,
          timestamp: new Date(now.getTime() - 86400000 * 2).toISOString() // 2 days ago
        },
        {
          product: 'Office Chair',
          category: 'Furniture',
          price: 299.99,
          quantity: 1,
          revenue: 299.99,
          timestamp: new Date(now.getTime() - 86400000 * 3).toISOString() // 3 days ago
        },
        {
          product: 'Desk Lamp',
          category: 'Furniture',
          price: 79.99,
          quantity: 3,
          revenue: 239.97,
          timestamp: new Date(now.getTime() - 86400000 * 4).toISOString() // 4 days ago
        }
      ];

      const categoryAggs = salesData.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.revenue;
        return acc;
      }, {} as Record<string, number>);

      return {
        hits: {
          total: { value: salesData.length },
          hits: salesData.map((item, index) => ({ _source: item, _id: index.toString() }))
        },
        aggregations: body.aggs ? {
          category_breakdown: {
            buckets: Object.entries(categoryAggs).map(([key, value]) => ({
              key,
              doc_count: salesData.filter(s => s.category === key).length,
              total_revenue: { value }
            }))
          }
        } : undefined
      };
    }

    if (index === 'demo-analytics') {
      const analyticsData = [
        {
          event_type: 'page_view',
          page: '/home',
          user_id: 'user_123',
          session_id: 'session_abc',
          timestamp: new Date(now.getTime() - 3600000 * 1).toISOString() // 1 hour ago
        },
        {
          event_type: 'click',
          page: '/products',
          user_id: 'user_456',
          session_id: 'session_def',
          timestamp: new Date(now.getTime() - 3600000 * 2).toISOString() // 2 hours ago
        },
        {
          event_type: 'page_view',
          page: '/about',
          user_id: 'user_789',
          session_id: 'session_ghi',
          timestamp: new Date(now.getTime() - 3600000 * 3).toISOString() // 3 hours ago
        }
      ];

      return {
        hits: {
          total: { value: analyticsData.length },
          hits: analyticsData.map((item, index) => ({ _source: item, _id: index.toString() }))
        },
        aggregations: body.aggs ? {
          event_types: {
            buckets: [
              { key: 'page_view', doc_count: 2 },
              { key: 'click', doc_count: 1 }
            ]
          }
        } : undefined
      };
    }

    return {
      hits: {
        total: { value: 0 },
        hits: []
      }
    };
  }

  async getMapping(index: string) {
    try {
      const result = await this.client.indices.getMapping({ index });
      return result;
    } catch (error) {
      // Return demo mapping when ES is unavailable
      return this.getDemoMapping(index);
    }
  }

  private getDemoMapping(index: string) {
    if (index === 'demo-sales') {
      return {
        'demo-sales': {
          mappings: {
            properties: {
              product: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              category: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              price: { type: 'float' },
              quantity: { type: 'integer' },
              revenue: { type: 'float' },
              timestamp: { type: 'date' }
            }
          }
        }
      };
    }

    if (index === 'demo-analytics') {
      return {
        'demo-analytics': {
          mappings: {
            properties: {
              event_type: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              page: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              user_id: { type: 'keyword' },
              session_id: { type: 'keyword' },
              timestamp: { type: 'date' }
            }
          }
        }
      };
    }

    return {};
  }
}

export default new ElasticsearchService();