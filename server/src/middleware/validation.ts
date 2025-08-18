import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate path parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new AppError(`Validation failed: ${errors.join('; ')}`, 400, 'VALIDATION_ERROR');
    }

    next();
  };
};

// Common validation schemas
export const queryValidationSchemas = {
  executeQuery: {
    body: Joi.object({
      jql: Joi.string().required().min(1).max(5000),
      startAt: Joi.number().integer().min(0).default(0),
      maxResults: Joi.number().integer().min(1).max(1000).default(50),
      fields: Joi.array().items(Joi.string()).optional(),
      allowedIndexes: Joi.array().items(Joi.string()).optional(),
    }),
  },
  
  validateQuery: {
    body: Joi.object({
      jql: Joi.string().required().min(1).max(5000),
    }),
  },
};

export const projectValidationSchemas = {
  getProjects: {
    query: Joi.object({
      search: Joi.string().optional(),
      limit: Joi.number().integer().min(1).max(100).default(20),
    }),
  },
};

export const fieldValidationSchemas = {
  getFields: {
    query: Joi.object({
      index: Joi.string().optional(),
      search: Joi.string().optional(),
      type: Joi.string().valid('string', 'number', 'boolean', 'date', 'object').optional(),
    }),
  },
};