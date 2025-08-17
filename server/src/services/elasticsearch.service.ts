import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import logger from '../utils/logger';

class ElasticsearchService {
  private client: Client;

  constructor() {
    const clientConfig: any = {
      node: config.elasticsearch.host,
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

    const mapping = await this.client.indices.getMapping({ index });
    return mapping;
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

    const result = await this.client.search({
      index,
      body,
    });
    return result;
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

  async getDataPoint(id: string) {
    try {
      const result = await this.client.get({
        index: config.configIndices.datapoints,
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

  async listDataPoints() {
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
}

export default new ElasticsearchService();