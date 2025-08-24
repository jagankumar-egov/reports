import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { validateRequest } from './middleware/validation';
import { elasticsearchService } from './services/elasticsearch';

// Routes
import directQueryRoutes from './routes/direct-query';

// Load environment variables
dotenv.config();
console.log('DEBUG: ELASTICSEARCH_HOST =', process.env.ELASTICSEARCH_HOST);

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
// Skip compression for now due to TypeScript issues - can be added back later
// app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Middleware
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'dhr-backend',
    version: '1.0.0',
    phase: 'Phase 1 - Direct Elasticsearch Query'
  });
});

// API Routes
app.use('/api/direct-query', directQueryRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Initialize Elasticsearch connection
const initializeServices = async () => {
  try {
    await elasticsearchService.initialize();
    logger.info('Elasticsearch connection established');
  } catch (error) {
    logger.error('Failed to initialize Elasticsearch:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await initializeServices();
  
  app.listen(PORT, () => {
    logger.info(`DHR Backend Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
    logger.info(`Allowed health indexes: ${process.env.ALLOWED_HEALTH_INDEXES}`);
  });
};

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;