import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponse } from '../types';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  let details: any = undefined;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.code;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_DATA';
    message = 'Invalid data format';
  } else if (error.message.includes('Access denied')) {
    statusCode = 403;
    errorCode = 'ACCESS_DENIED';
    message = error.message;
  } else if (error.message.includes('not found')) {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = error.message;
  }

  // Log error
  logger.error('Request error:', {
    error: error.message,
    stack: error.stack,
    statusCode,
    errorCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Send error response
  const response: ApiResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || 'unknown',
      executionTime: 0,
    },
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};