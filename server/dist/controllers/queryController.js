"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryController = void 0;
const elasticsearch_1 = require("../services/elasticsearch");
const jqlConverter_1 = require("../services/jqlConverter");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../middleware/errorHandler");
class QueryController {
    async executeQuery(req, res) {
        const requestStartTime = Date.now();
        const requestId = Math.random().toString(36).substr(2, 9);
        const { jql, startAt = 0, maxResults = 50, fields } = req.body;
        logger_1.logger.info(`[API-QUERY-${requestId}] Starting query execution`, {
            requestId,
            jql,
            startAt,
            maxResults,
            fields: fields ? fields.length : 'all',
            userAgent: req.get('User-Agent'),
            ip: req.ip,
        });
        try {
            const indexStartTime = Date.now();
            const allowedIndexes = elasticsearch_1.elasticsearchService.getAllowedIndexes();
            const indexTime = Date.now() - indexStartTime;
            logger_1.logger.info(`[API-QUERY-${requestId}] Retrieved allowed indexes in ${indexTime}ms`, {
                requestId,
                allowedIndexes,
                count: allowedIndexes.length,
            });
            const validationStartTime = Date.now();
            const validation = jqlConverter_1.jqlConverterService.validateJQL(jql, allowedIndexes);
            const validationTime = Date.now() - validationStartTime;
            logger_1.logger.info(`[API-QUERY-${requestId}] JQL validation completed in ${validationTime}ms`, {
                requestId,
                isValid: validation.isValid,
                errorCount: validation.errors.length,
                warningCount: validation.warnings.length,
            });
            if (!validation.isValid) {
                const totalTime = Date.now() - requestStartTime;
                logger_1.logger.warn(`[API-QUERY-${requestId}] JQL validation failed after ${totalTime}ms`, {
                    requestId,
                    errors: validation.errors,
                });
                throw new errorHandler_1.AppError(`Invalid JQL: ${validation.errors.map(e => e.message).join(', ')}`, 400, 'INVALID_JQL');
            }
            const conversionStartTime = Date.now();
            const { query, indexes, sort } = jqlConverter_1.jqlConverterService.convertJQLToElasticsearch(jql, allowedIndexes);
            const conversionTime = Date.now() - conversionStartTime;
            logger_1.logger.info(`[API-QUERY-${requestId}] JQL to Elasticsearch conversion completed in ${conversionTime}ms`, {
                requestId,
                resultingIndexes: indexes,
                queryType: query?.bool ? 'bool' : query?.match_all ? 'match_all' : 'other',
                hasSorting: !!sort,
            });
            if (indexes.length === 0) {
                const totalTime = Date.now() - requestStartTime;
                logger_1.logger.warn(`[API-QUERY-${requestId}] No accessible indexes found after ${totalTime}ms`, {
                    requestId,
                    allowedIndexes,
                });
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
            logger_1.logger.info(`[API-QUERY-${requestId}] Executing Elasticsearch search`, {
                requestId,
                searchParams: {
                    indexes: searchParams.index,
                    from: searchParams.from,
                    size: searchParams.size,
                    hasSort: !!searchParams.sort,
                    sourceFields: Array.isArray(searchParams._source) ? searchParams._source.length : searchParams._source,
                },
            });
            const searchStartTime = Date.now();
            const esResponse = await elasticsearch_1.elasticsearchService.search(searchParams);
            const searchTime = Date.now() - searchStartTime;
            logger_1.logger.info(`[API-QUERY-${requestId}] Elasticsearch search completed in ${searchTime}ms`, {
                requestId,
                took: esResponse.took,
                hits: typeof esResponse.hits.total === 'number' ? esResponse.hits.total : esResponse.hits.total?.value || 0,
                shards: esResponse._shards,
            });
            const transformStartTime = Date.now();
            const issues = esResponse.hits.hits.map(hit => ({
                id: hit._id,
                index: hit._index,
                source: hit._source,
                score: hit._score,
                fields: hit._source,
            }));
            const transformTime = Date.now() - transformStartTime;
            logger_1.logger.info(`[API-QUERY-${requestId}] Result transformation completed in ${transformTime}ms`, {
                requestId,
                hitCount: esResponse.hits.hits.length,
                transformedCount: issues.length,
            });
            const fieldStartTime = Date.now();
            const fieldDefinitions = await this.getFieldDefinitionsForIndexes(indexes);
            const fieldTime = Date.now() - fieldStartTime;
            logger_1.logger.info(`[API-QUERY-${requestId}] Field definitions retrieved in ${fieldTime}ms`, {
                requestId,
                fieldCount: fieldDefinitions.length,
                indexes,
            });
            const totalExecutionTime = Date.now() - requestStartTime;
            const result = {
                total: esResponse.hits.total.value,
                startAt,
                maxResults,
                issues,
                fields: fieldDefinitions,
                executionTime: totalExecutionTime,
            };
            logger_1.logger.info(`[API-QUERY-${requestId}] Query executed successfully in ${totalExecutionTime}ms`, {
                requestId,
                jql,
                indexes,
                totalHits: result.total,
                returnedHits: issues.length,
                timingBreakdown: {
                    indexRetrieval: `${indexTime}ms`,
                    validation: `${validationTime}ms`,
                    conversion: `${conversionTime}ms`,
                    search: `${searchTime}ms`,
                    transform: `${transformTime}ms`,
                    fieldDefinitions: `${fieldTime}ms`,
                    total: `${totalExecutionTime}ms`,
                },
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
            const errorTime = Date.now() - requestStartTime;
            logger_1.logger.error(`[API-QUERY-${requestId}] Query execution failed after ${errorTime}ms`, {
                requestId,
                error: error instanceof Error ? error.message : String(error),
                errorType: error instanceof Error ? error.name : 'UnknownError',
                statusCode: error?.statusCode,
                jql,
                userAgent: req.get('User-Agent'),
                ip: req.ip,
            });
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