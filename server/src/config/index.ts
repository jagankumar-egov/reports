import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(4000),
  ES_HOST: Joi.string().required(),
  ES_USERNAME: Joi.string().allow('').default(''),
  ES_PASSWORD: Joi.string().allow('').default(''),
  ES_API_KEY: Joi.string().allow('').default(''),
  ES_ALLOWED_INDICES: Joi.string().required(),
  DEFAULT_USER_ROLE: Joi.string().valid('reports-admin', 'reports-viewer').default('reports-viewer'),
  CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  elasticsearch: {
    host: envVars.ES_HOST,
    username: envVars.ES_USERNAME,
    password: envVars.ES_PASSWORD,
    apiKey: envVars.ES_API_KEY,
    allowedIndices: envVars.ES_ALLOWED_INDICES.split(',').map((index: string) => index.trim()),
  },
  defaultUserRole: envVars.DEFAULT_USER_ROLE,
  cors: {
    origin: envVars.CORS_ORIGIN.split(',').map((origin: string) => origin.trim()),
  },
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
  logging: {
    level: envVars.LOG_LEVEL,
  },
  configIndices: {
    datapoints: 'reports_datapoints',
    dashboards: 'reports_dashboards',
    audit: 'reports_audit',
  },
};