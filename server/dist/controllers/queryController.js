"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryController = void 0;
const elasticsearch_1 = require("../services/elasticsearch");
const jqlConverter_1 = require("../services/jqlConverter");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
class QueryController {
    async executeQuery(req, res) {
        const startTime = Date.now();
        const { jql, startAt = 0, maxResults = 50, fields } = req.body;
        try {
            const allowedIndexes = elasticsearch_1.elasticsearchService.getAllowedIndexes();
            const validation = jqlConverter_1.jqlConverterService.validateJQL(jql, allowedIndexes);
            if (!validation.isValid) {
                throw new errorHandler_1.AppError(`Invalid JQL: ${validation.errors.map(e => e.message).join(', ')}`, 400, 'INVALID_JQL');
            }
            const { query, indexes, sort } = jqlConverter_1.jqlConverterService.convertJQLToElasticsearch(jql, allowedIndexes);
            if (indexes.length === 0) {
                throw new errorHandler_1.AppError('No accessible indexes found for this query', 403, 'NO_INDEXES');
            }
            const searchParams = {
                index: indexes,
                query,
                from: startAt,
                size: Math.min(maxResults, 1000),
                sort,
                _source: fields || true,
            };
            const esResponse = await elasticsearch_1.elasticsearchService.search(searchParams);
            const issues = esResponse.hits.hits.map(hit => ({
                id: hit._id,
                index: hit._index,
                source: hit._source,
                score: hit._score,
                fields: hit._source,
            }));
            const fieldDefinitions = await this.getFieldDefinitionsForIndexes(indexes);
            const result = {
                total: esResponse.hits.total.value,
                startAt,
                maxResults,
                issues,
                fields: fieldDefinitions,
                executionTime: Date.now() - startTime,
            };
            logger_1.logger.info('Query executed successfully', {
                jql,
                indexes,
                totalHits: result.total,
                returnedHits: issues.length,
                executionTime: result.executionTime,
            });
            const response = {
                success: true,
                data: result,
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: req.get('X-Request-ID') || 'unknown',
                    executionTime: result.executionTime,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.logger.error('Query execution failed:', error);
            throw error;
        }
    }
    async validateQuery(req, res) {
        const { jql } = req.body;
        try {
            const allowedIndexes = elasticsearch_1.elasticsearchService.getAllowedIndexes();
            const validation = jqlConverter_1.jqlConverterService.validateJQL(jql, allowedIndexes);
            const response = {
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
        }
        catch (error) {
            logger_1.logger.error('Query validation failed:', error);
            throw error;
        }
    }
    async getQueryHistory(req, res) {
        const response = {
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
    async getFieldDefinitionsForIndexes(indexes) {
        try {
            const fieldDefinitions = [];
            for (const index of indexes) {
                try {
                    const mapping = await elasticsearch_1.elasticsearchService.getMapping(index);
                    const indexMappings = mapping[index]?.mappings?.properties || {};
                    for (const [fieldName, fieldConfig] of Object.entries(indexMappings)) {
                        const fieldDef = fieldConfig;
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
                }
                catch (error) {
                    logger_1.logger.warn(`Failed to get mapping for index ${index}:`, error);
                }
            }
            return fieldDefinitions;
        }
        catch (error) {
            logger_1.logger.error('Failed to get field definitions:', error);
            return [];
        }
    }
}
exports.QueryController = QueryController;
//# sourceMappingURL=queryController.js.map