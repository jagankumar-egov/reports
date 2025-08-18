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
            this.config = {
                host: process.env.ELASTICSEARCH_HOST,
                username: process.env.ELASTICSEARCH_USERNAME,
                password: process.env.ELASTICSEARCH_PASSWORD,
                caCert: process.env.ELASTICSEARCH_CA_CERT,
                allowedIndexes: process.env.ALLOWED_HEALTH_INDEXES?.split(',') || [],
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
        if (!this.client)
            throw new Error('Elasticsearch client not initialized');
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
            logger_1.logger.info(`Elasticsearch query executed in ${executionTime}ms`, {
                index: params.index,
                took: response.took,
                hits: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
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
            logger_1.logger.error('Elasticsearch search failed:', error);
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
        if (!this.client)
            throw new Error('Elasticsearch client not initialized');
        try {
            const response = await this.client.indices.stats({
                index: this.config.allowedIndexes.join(','),
                metric: ['docs', 'store'],
            });
            return response;
        }
        catch (error) {
            logger_1.logger.error('Failed to get indices stats:', error);
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
    async ping() {
        if (!this.client)
            return false;
        try {
            await this.client.ping();
            return true;
        }
        catch (error) {
            logger_1.logger.error('Elasticsearch ping failed:', error);
            return false;
        }
    }
}
exports.elasticsearchService = new ElasticsearchService();
//# sourceMappingURL=elasticsearch.js.map