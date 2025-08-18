"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldController = void 0;
const elasticsearch_1 = require("../services/elasticsearch");
const logger_1 = require("../utils/logger");
class FieldController {
    async getFields(req, res) {
        const { index, search, type } = req.query;
        try {
            const allowedIndexes = elasticsearch_1.elasticsearchService.getAllowedIndexes();
            const indexesToQuery = index ? [index] : allowedIndexes;
            for (const idx of indexesToQuery) {
                if (!allowedIndexes.some(allowed => allowed.endsWith('*')
                    ? idx.startsWith(allowed.slice(0, -1))
                    : idx === allowed)) {
                    throw new Error(`Access denied to index: ${idx}`);
                }
            }
            const allFields = [];
            for (const indexName of indexesToQuery) {
                try {
                    const mapping = await elasticsearch_1.elasticsearchService.getMapping(indexName);
                    const fields = this.extractFieldsFromMapping(mapping, indexName);
                    allFields.push(...fields);
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to get mapping for index ${indexName}:`, error);
                }
            }
            let uniqueFields = this.deduplicateFields(allFields);
            if (search) {
                const searchTerm = search.toLowerCase();
                uniqueFields = uniqueFields.filter(field => field.name.toLowerCase().includes(searchTerm) ||
                    field.description?.toLowerCase().includes(searchTerm));
            }
            if (type) {
                uniqueFields = uniqueFields.filter(field => field.type === type);
            }
            uniqueFields.sort((a, b) => a.name.localeCompare(b.name));
            const response = {
                success: true,
                data: uniqueFields,
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.get('X-Request-ID') || 'unknown',
                    executionTime: 0,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Failed to get fields:', error);
            throw error;
        }
    }
    async getFieldsForIndex(req, res) {
        const { index } = req.params;
        try {
            const allowedIndexes = elasticsearch_1.elasticsearchService.getAllowedIndexes();
            const hasAccess = allowedIndexes.some(allowed => allowed.endsWith('*')
                ? index.startsWith(allowed.slice(0, -1))
                : index === allowed);
            if (!hasAccess) {
                throw new Error(`Access denied to index: ${index}`);
            }
            const mapping = await elasticsearch_1.elasticsearchService.getMapping(index);
            const fields = this.extractFieldsFromMapping(mapping, index);
            fields.sort((a, b) => a.name.localeCompare(b.name));
            const response = {
                success: true,
                data: fields,
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.get('X-Request-ID') || 'unknown',
                    executionTime: 0,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error(`Failed to get fields for index ${index}:`, error);
            throw error;
        }
    }
    extractFieldsFromMapping(mapping, indexName) {
        const fields = [];
        const indexMapping = mapping[indexName] || mapping[Object.keys(mapping)[0]];
        const properties = indexMapping?.mappings?.properties || {};
        this.processProperties(properties, '', fields, indexName);
        return fields;
    }
    processProperties(properties, prefix, fields, indexName, maxDepth = 3, currentDepth = 0) {
        if (currentDepth >= maxDepth)
            return;
        for (const [fieldName, fieldConfig] of Object.entries(properties)) {
            const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName;
            const config = fieldConfig;
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
            if (config.properties) {
                this.processProperties(config.properties, fullFieldName, fields, indexName, maxDepth, currentDepth + 1);
            }
            if (config.fields) {
                for (const [subFieldName, subFieldConfig] of Object.entries(config.fields)) {
                    const subConfig = subFieldConfig;
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
    mapElasticsearchType(esType) {
        const typeMapping = {
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
    isSearchable(fieldConfig) {
        const type = fieldConfig.type;
        return type && !['object', 'nested', 'binary'].includes(type);
    }
    isAggregatable(fieldConfig) {
        const type = fieldConfig.type;
        return type && ['keyword', 'long', 'integer', 'short', 'byte', 'double', 'float', 'half_float', 'scaled_float', 'date', 'boolean', 'ip'].includes(type);
    }
    getFieldDescription(fieldConfig) {
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
    deduplicateFields(fields) {
        const uniqueFields = new Map();
        for (const field of fields) {
            const key = field.name;
            if (!uniqueFields.has(key)) {
                uniqueFields.set(key, field);
            }
        }
        return Array.from(uniqueFields.values());
    }
}
exports.FieldController = FieldController;
//# sourceMappingURL=fieldController.js.map