"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.elasticsearchService = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("../utils/logger");
class ElasticsearchService {
    constructor() {
        this.client = null;
    }
    async initialize() {
        try {
            const projectIndexMapping = {};
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
                host: process.env.ELASTICSEARCH_HOST,
                username: process.env.ELASTICSEARCH_USERNAME,
                password: process.env.ELASTICSEARCH_PASSWORD,
                caCert: process.env.ELASTICSEARCH_CA_CERT,
                allowedIndexes: process.env.ALLOWED_HEALTH_INDEXES?.split(',') || [],
                projectIndexMapping: projectIndexMapping,
                requestTimeout: 30000,
                maxRetries: 3,
            };
            logger_1.logger.info('Elasticsearch configuration:', {
                host: this.config.host,
                hasUsername: !!this.config.username,
                hasPassword: !!this.config.password,
                allowedIndexes: this.config.allowedIndexes,
            });
            const clientConfig = {
                node: this.config.host,
                requestTimeout: this.config.requestTimeout,
                maxRetries: this.config.maxRetries,
            };
            if (this.config.username && this.config.password) {
                clientConfig.auth = {
                    username: this.config.username,
                    password: this.config.password,
                };
            }
            if (this.config.caCert && fs_1.default.existsSync(this.config.caCert)) {
                clientConfig.tls = {
                    ca: fs_1.default.readFileSync(this.config.caCert),
                    rejectUnauthorized: true,
                };
            }
            logger_1.logger.info('Elasticsearch client config:', JSON.stringify(clientConfig, null, 2));
            this.client = new elasticsearch_1.Client(clientConfig);
            if (process.env.SKIP_ELASTICSEARCH_HEALTH_CHECK === 'true') {
                logger_1.logger.info('Skipping Elasticsearch health check (development mode)');
            }
            else {
                const health = await this.client.cluster.health();
                logger_1.logger.info('Elasticsearch cluster health:', health);
                await this.verifyIndexAccess();
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Elasticsearch client:', error);
            throw error;
        }
    }
    async verifyIndexAccess() {
        if (!this.client)
            throw new Error('Elasticsearch client not initialized');
        try {
            for (const indexPattern of this.config.allowedIndexes) {
                const exists = await this.client.indices.exists({ index: indexPattern });
                if (!exists) {
                    logger_1.logger.warn(`Index pattern '${indexPattern}' does not exist`);
                }
                else {
                    logger_1.logger.info(`Verified access to index pattern: ${indexPattern}`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to verify index access:', error);
            throw error;
        }
    }
    async search(params) {
        const operationStartTime = Date.now();
        const operationId = Math.random().toString(36).substr(2, 9);
        logger_1.logger.info(`[ES-SEARCH-${operationId}] Starting Elasticsearch search operation`, {
            operationId,
            index: params.index,
            queryType: params.query?.bool ? 'bool' : params.query?.match_all ? 'match_all' : 'other',
            from: params.from || 0,
            size: params.size || 50,
        });
        if (!this.client) {
            logger_1.logger.error(`[ES-SEARCH-${operationId}] Elasticsearch client not initialized`);
            throw new Error('Elasticsearch client not initialized');
        }
        const requestedIndexes = Array.isArray(params.index) ? params.index : [params.index];
        logger_1.logger.debug(`[ES-SEARCH-${operationId}] Validating access to indexes:`, requestedIndexes);
        const validationStartTime = Date.now();
        this.validateIndexAccess(requestedIndexes);
        const validationTime = Date.now() - validationStartTime;
        logger_1.logger.debug(`[ES-SEARCH-${operationId}] Index validation completed in ${validationTime}ms`);
        try {
            const searchStartTime = Date.now();
            logger_1.logger.info(`[ES-SEARCH-${operationId}] Executing Elasticsearch search`, {
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
            logger_1.logger.info(`[ES-SEARCH-${operationId}] Elasticsearch search completed successfully`, {
                operationId,
                searchTime: `${searchTime}ms`,
                totalTime: `${totalTime}ms`,
                esTook: `${response.took}ms`,
                hits: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
                shards: response._shards,
            });
            const transformedResponse = {
                ...response,
                _shards: {
                    ...response._shards,
                    skipped: response._shards.skipped || 0,
                }
            };
            return transformedResponse;
        }
        catch (error) {
            const errorTime = Date.now() - operationStartTime;
            logger_1.logger.error(`[ES-SEARCH-${operationId}] Elasticsearch search failed after ${errorTime}ms`, {
                operationId,
                error: error instanceof Error ? error.message : String(error),
                host: this.config.host,
                indexes: requestedIndexes,
                errorType: error instanceof Error ? error.name : 'UnknownError',
                statusCode: error?.meta?.statusCode,
            });
            throw error;
        }
    }
    async getMapping(index) {
        if (!this.client)
            throw new Error('Elasticsearch client not initialized');
        this.validateIndexAccess([index]);
        try {
            const response = await this.client.indices.getMapping({ index });
            return response;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get mapping for index ${index}:`, error);
            throw error;
        }
    }
    async getIndicesStats() {
        const operationStartTime = Date.now();
        const operationId = Math.random().toString(36).substr(2, 9);
        logger_1.logger.info(`[ES-STATS-${operationId}] Starting indices stats operation`, {
            operationId,
            configuredIndexes: this.config.allowedIndexes,
        });
        if (!this.client) {
            logger_1.logger.error(`[ES-STATS-${operationId}] Elasticsearch client not initialized`);
            throw new Error('Elasticsearch client not initialized');
        }
        try {
            const existingIndexes = [];
            const checkStartTime = Date.now();
            logger_1.logger.info(`[ES-STATS-${operationId}] Checking existence of ${this.config.allowedIndexes.length} configured indexes`);
            for (const index of this.config.allowedIndexes) {
                const indexCheckStart = Date.now();
                try {
                    logger_1.logger.debug(`[ES-STATS-${operationId}] Checking existence of index: ${index}`);
                    const exists = await this.client.indices.exists({ index });
                    const indexCheckTime = Date.now() - indexCheckStart;
                    if (exists) {
                        existingIndexes.push(index);
                        logger_1.logger.info(`[ES-STATS-${operationId}] Index '${index}' exists (checked in ${indexCheckTime}ms)`);
                    }
                    else {
                        logger_1.logger.warn(`[ES-STATS-${operationId}] Index '${index}' does not exist (checked in ${indexCheckTime}ms)`);
                    }
                }
                catch (error) {
                    const indexCheckTime = Date.now() - indexCheckStart;
                    logger_1.logger.warn(`[ES-STATS-${operationId}] Failed to check existence of index '${index}' after ${indexCheckTime}ms:`, {
                        error: error instanceof Error ? error.message : String(error),
                        errorType: error instanceof Error ? error.name : 'UnknownError',
                        statusCode: error?.meta?.statusCode,
                    });
                }
            }
            const checkTime = Date.now() - checkStartTime;
            logger_1.logger.info(`[ES-STATS-${operationId}] Index existence check completed in ${checkTime}ms`, {
                operationId,
                totalConfigured: this.config.allowedIndexes.length,
                existingCount: existingIndexes.length,
                existingIndexes,
            });
            if (existingIndexes.length === 0) {
                const totalTime = Date.now() - operationStartTime;
                logger_1.logger.warn(`[ES-STATS-${operationId}] No existing indexes found, returning empty stats after ${totalTime}ms`);
                return { indices: {} };
            }
            const statsStartTime = Date.now();
            logger_1.logger.info(`[ES-STATS-${operationId}] Getting stats for existing indexes`, {
                operationId,
                indexes: existingIndexes,
            });
            const response = await this.client.indices.stats({
                index: existingIndexes.join(','),
                metric: ['docs', 'store'],
            });
            const statsTime = Date.now() - statsStartTime;
            const totalTime = Date.now() - operationStartTime;
            logger_1.logger.info(`[ES-STATS-${operationId}] Indices stats completed successfully`, {
                operationId,
                statsTime: `${statsTime}ms`,
                totalTime: `${totalTime}ms`,
                indexCount: existingIndexes.length,
                responseIndexes: Object.keys(response.indices || {}),
            });
            return response;
        }
        catch (error) {
            const errorTime = Date.now() - operationStartTime;
            logger_1.logger.error(`[ES-STATS-${operationId}] Failed to get indices stats after ${errorTime}ms`, {
                operationId,
                error: error instanceof Error ? error.message : String(error),
                errorType: error instanceof Error ? error.name : 'UnknownError',
                statusCode: error?.meta?.statusCode,
                host: this.config.host,
            });
            throw error;
        }
    }
    validateIndexAccess(requestedIndexes) {
        const allowedPatterns = this.config.allowedIndexes;
        for (const requestedIndex of requestedIndexes) {
            const isAllowed = allowedPatterns.some(pattern => {
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
    getAllowedIndexes() {
        return [...this.config.allowedIndexes];
    }
    getProjectIndexMapping() {
        return { ...this.config.projectIndexMapping };
    }
    async ping() {
        const operationStartTime = Date.now();
        const operationId = Math.random().toString(36).substr(2, 9);
        logger_1.logger.info(`[ES-PING-${operationId}] Starting Elasticsearch ping operation`, {
            operationId,
            host: this.config?.host || 'unknown',
        });
        if (!this.client) {
            logger_1.logger.warn(`[ES-PING-${operationId}] Elasticsearch client not initialized, returning false`);
            return false;
        }
        try {
            const pingStartTime = Date.now();
            await this.client.ping();
            const pingTime = Date.now() - pingStartTime;
            const totalTime = Date.now() - operationStartTime;
            logger_1.logger.info(`[ES-PING-${operationId}] Elasticsearch ping successful`, {
                operationId,
                pingTime: `${pingTime}ms`,
                totalTime: `${totalTime}ms`,
                host: this.config.host,
            });
            return true;
        }
        catch (error) {
            const errorTime = Date.now() - operationStartTime;
            logger_1.logger.error(`[ES-PING-${operationId}] Elasticsearch ping failed after ${errorTime}ms`, {
                operationId,
                error: error instanceof Error ? error.message : String(error),
                errorType: error instanceof Error ? error.name : 'UnknownError',
                statusCode: error?.meta?.statusCode,
                host: this.config?.host || 'unknown',
            });
            return false;
        }
    }
}
exports.elasticsearchService = new ElasticsearchService();
//# sourceMappingURL=elasticsearch.js.map