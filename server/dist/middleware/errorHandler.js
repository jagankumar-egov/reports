"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (error, req, res, next) => {
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details = undefined;
    if (error instanceof AppError) {
        statusCode = error.statusCode;
        errorCode = error.code;
        message = error.message;
    }
    else if (error.name === 'ValidationError') {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = error.message;
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        errorCode = 'INVALID_DATA';
        message = 'Invalid data format';
    }
    else if (error.message.includes('Access denied')) {
        statusCode = 403;
        errorCode = 'ACCESS_DENIED';
        message = error.message;
    }
    else if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        message = error.message;
    }
    logger_1.logger.error('Request error:', {
        error: error.message,
        stack: error.stack,
        statusCode,
        errorCode,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    const response = {
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
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map