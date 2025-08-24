"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("./utils/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const elasticsearch_1 = require("./services/elasticsearch");
const direct_query_1 = __importDefault(require("./routes/direct-query"));
const saved_queries_1 = __importDefault(require("./routes/saved-queries"));
dotenv_1.default.config();
console.log('DEBUG: ELASTICSEARCH_HOST =', process.env.ELASTICSEARCH_HOST);
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
const corsOptions = {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
app.use((0, morgan_1.default)('combined', { stream: { write: (message) => logger_1.logger.info(message.trim()) } }));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'dhr-backend',
        version: '1.0.0',
        phase: 'Phase 1 - Direct Elasticsearch Query'
    });
});
app.use('/api/direct-query', direct_query_1.default);
app.use('/api/saved-queries', saved_queries_1.default);
app.use(errorHandler_1.errorHandler);
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method
    });
});
const initializeServices = async () => {
    try {
        await elasticsearch_1.elasticsearchService.initialize();
        logger_1.logger.info('Elasticsearch connection established');
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize Elasticsearch:', error);
        process.exit(1);
    }
};
const startServer = async () => {
    await initializeServices();
    app.listen(PORT, () => {
        logger_1.logger.info(`DHR Backend Server running on port ${PORT}`);
        logger_1.logger.info(`Environment: ${process.env.NODE_ENV}`);
        logger_1.logger.info(`Allowed health indexes: ${process.env.ALLOWED_HEALTH_INDEXES}`);
    });
};
startServer().catch((error) => {
    logger_1.logger.error('Failed to start server:', error);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map