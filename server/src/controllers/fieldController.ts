import { Request, Response } from 'express';
import { elasticsearchService } from '../services/elasticsearch';
import { logger } from '../utils/logger';
import { FieldDefinition, ApiResponse } from '../types';

export class FieldController {
  async getFields(req: Request, res: Response): Promise<void> {
    const { index, search, type } = req.query;

    try {
      const allowedIndexes = elasticsearchService.getAllowedIndexes();
      const indexesToQuery = index ? [index as string] : allowedIndexes;
      
      // Validate index access
      for (const idx of indexesToQuery) {
        if (!allowedIndexes.some(allowed => 
          allowed.endsWith('*') 
            ? idx.startsWith(allowed.slice(0, -1))
            : idx === allowed
        )) {
          throw new Error(`Access denied to index: ${idx}`);
        }
      }

      const allFields: FieldDefinition[] = [];

      // Get field mappings for all specified indexes
      for (const indexName of indexesToQuery) {
        try {
          const mapping = await elasticsearchService.getMapping(indexName);
          const fields = this.extractFieldsFromMapping(mapping, indexName);
          allFields.push(...fields);
        } catch (error) {
          logger.warn(`Failed to get mapping for index ${indexName}:`, error);
        }
      }

      // Remove duplicates and apply filters
      let uniqueFields = this.deduplicateFields(allFields);

      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        uniqueFields = uniqueFields.filter(field =>
          field.name.toLowerCase().includes(searchTerm) ||
          field.description?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply type filter
      if (type) {
        uniqueFields = uniqueFields.filter(field => field.type === type);
      }

      // Sort by name
      uniqueFields.sort((a, b) => a.name.localeCompare(b.name));

      const response: ApiResponse<FieldDefinition[]> = {
        success: true,
        data: uniqueFields,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
          executionTime: 0,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get fields:', error);
      throw error;
    }
  }

  async getFieldsForIndex(req: Request, res: Response): Promise<void> {
    const { index } = req.params;

    try {
      const allowedIndexes = elasticsearchService.getAllowedIndexes();
      
      // Validate index access
      const hasAccess = allowedIndexes.some(allowed => 
        allowed.endsWith('*') 
          ? index.startsWith(allowed.slice(0, -1))
          : index === allowed
      );

      if (!hasAccess) {
        throw new Error(`Access denied to index: ${index}`);
      }

      const mapping = await elasticsearchService.getMapping(index);
      const fields = this.extractFieldsFromMapping(mapping, index);

      // Sort by name
      fields.sort((a, b) => a.name.localeCompare(b.name));

      const response: ApiResponse<FieldDefinition[]> = {
        success: true,
        data: fields,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
          executionTime: 0,
        },
      };

      res.json(response);
    } catch (error) {
      logger.error(`Failed to get fields for index ${index}:`, error);
      throw error;
    }
  }

  private extractFieldsFromMapping(mapping: any, indexName: string): FieldDefinition[] {
    const fields: FieldDefinition[] = [];
    
    // Navigate to the properties section of the mapping
    const indexMapping = mapping[indexName] || mapping[Object.keys(mapping)[0]];
    const properties = indexMapping?.mappings?.properties || {};

    this.processProperties(properties, '', fields, indexName);

    return fields;
  }

  private processProperties(
    properties: any,
    prefix: string,
    fields: FieldDefinition[],
    indexName: string,
    maxDepth: number = 3,
    currentDepth: number = 0
  ): void {
    if (currentDepth >= maxDepth) return;

    for (const [fieldName, fieldConfig] of Object.entries(properties)) {
      const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName;
      const config: any = fieldConfig;

      // Add the field itself
      fields.push({
        id: `${indexName}.${fullFieldName}`,
        name: fullFieldName,
        type: this.mapElasticsearchType(config.type),
        searchable: this.isSearchable(config),
        aggregatable: this.isAggregatable(config),
        description: `${this.getFieldDescription(config)} from ${indexName}`,
        schema: {
          type: config.type || 'unknown',
          format: config.format,
          enum: config.enum,
        },
      });

      // Process nested properties
      if (config.properties) {
        this.processProperties(
          config.properties,
          fullFieldName,
          fields,
          indexName,
          maxDepth,
          currentDepth + 1
        );
      }

      // Process multi-field mappings (e.g., text field with keyword subfield)
      if (config.fields) {
        for (const [subFieldName, subFieldConfig] of Object.entries(config.fields)) {
          const subConfig: any = subFieldConfig;
          fields.push({
            id: `${indexName}.${fullFieldName}.${subFieldName}`,
            name: `${fullFieldName}.${subFieldName}`,
            type: this.mapElasticsearchType(subConfig.type),
            searchable: this.isSearchable(subConfig),
            aggregatable: this.isAggregatable(subConfig),
            description: `${this.getFieldDescription(subConfig)} (${subFieldName}) from ${indexName}`,
            schema: {
              type: subConfig.type || 'unknown',
              format: subConfig.format,
            },
          });
        }
      }
    }
  }

  private mapElasticsearchType(esType: string): string {
    const typeMapping: Record<string, string> = {
      'text': 'string',
      'keyword': 'string',
      'long': 'number',
      'integer': 'number',
      'short': 'number',
      'byte': 'number',
      'double': 'number',
      'float': 'number',
      'half_float': 'number',
      'scaled_float': 'number',
      'date': 'date',
      'boolean': 'boolean',
      'binary': 'binary',
      'object': 'object',
      'nested': 'object',
      'geo_point': 'geo_point',
      'geo_shape': 'geo_shape',
      'ip': 'ip',
    };

    return typeMapping[esType] || esType || 'unknown';
  }

  private isSearchable(fieldConfig: any): boolean {
    const type = fieldConfig.type;
    return type && !['object', 'nested', 'binary'].includes(type);
  }

  private isAggregatable(fieldConfig: any): boolean {
    const type = fieldConfig.type;
    return type && ['keyword', 'long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date', 'boolean', 'ip'].includes(type);
  }

  private getFieldDescription(fieldConfig: any): string {
    const type = fieldConfig.type;
    switch (type) {
      case 'text':
        return 'Full-text searchable field';
      case 'keyword':
        return 'Exact-match field for filtering and aggregations';
      case 'date':
        return 'Date/time field';
      case 'boolean':
        return 'Boolean field (true/false)';
      case 'object':
        return 'Complex object field';
      case 'nested':
        return 'Nested object field';
      default:
        return `${type} field`;
    }
  }

  private deduplicateFields(fields: FieldDefinition[]): FieldDefinition[] {
    const uniqueFields = new Map<string, FieldDefinition>();

    for (const field of fields) {
      const key = field.name;
      if (!uniqueFields.has(key)) {
        uniqueFields.set(key, field);
      }
    }

    return Array.from(uniqueFields.values());
  }
}