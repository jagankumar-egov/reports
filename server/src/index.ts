import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './utils/logger';
import { authenticateUser, requireAdmin, requireViewer } from './middleware/auth.middleware';

// Controllers
import * as indicesController from './controllers/indices.controller';
import * as datapointsController from './controllers/datapoints.controller';
import * as dashboardsController from './controllers/dashboards.controller';
import * as exportController from './controllers/export.controller';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
});
app.use('/api/', limiter);

// Authentication middleware
app.use(authenticateUser);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API Routes
const apiRouter = express.Router();

// Indices routes
apiRouter.get('/indices', requireViewer, indicesController.getIndices);
apiRouter.get('/indices/:index/mapping', requireViewer, indicesController.getIndexMapping);
apiRouter.post('/field-caps', requireViewer, indicesController.getFieldCaps);

// Data Points routes
apiRouter.get('/datapoints', requireViewer, datapointsController.listDataPoints);
apiRouter.post('/datapoints', requireAdmin, datapointsController.createDataPoint);
apiRouter.get('/datapoints/:id', requireViewer, datapointsController.getDataPoint);
apiRouter.put('/datapoints/:id', requireAdmin, datapointsController.updateDataPoint);
apiRouter.delete('/datapoints/:id', requireAdmin, datapointsController.deleteDataPoint);
apiRouter.post('/datapoints/:id/run', requireViewer, datapointsController.runDataPoint);
apiRouter.post('/datapoints/:id/export', requireViewer, exportController.exportDataPoint);

// Dashboards routes
apiRouter.get('/dashboards', requireViewer, dashboardsController.listDashboards);
apiRouter.post('/dashboards', requireAdmin, dashboardsController.createDashboard);
apiRouter.get('/dashboards/:id', requireViewer, dashboardsController.getDashboard);
apiRouter.put('/dashboards/:id', requireAdmin, dashboardsController.updateDashboard);
apiRouter.delete('/dashboards/:id', requireAdmin, dashboardsController.deleteDashboard);
apiRouter.post('/dashboards/:id/run', requireViewer, dashboardsController.runDashboard);
apiRouter.post('/dashboards/:id/export', requireViewer, exportController.exportDashboard);

// Mount API router
app.use('/api/v1', apiRouter);

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${config.env}`);
  logger.info(`Allowed indices: ${config.elasticsearch.allowedIndices.join(', ')}`);
});