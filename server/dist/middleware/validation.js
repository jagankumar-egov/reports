"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldValidationSchemas = exports.projectValidationSchemas = exports.queryValidationSchemas = exports.validateRequest = void 0;
const joi_1 = __importDefault(require("joi"));
const errorHandler_1 = require("./errorHandler");
const validateRequest = (schema) => {
    return (req, res, next) => {
        const errors = [];
        if (schema.body) {
            const { error } = schema.body.validate(req.body);
            if (error) {
                errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
            }
        }
        if (schema.query) {
            const { error } = schema.query.validate(req.query);
            if (error) {
                errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
            }
        }
        if (schema.params) {
            const { error } = schema.params.validate(req.params);
            if (error) {
                errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
            }
        }
        if (errors.length > 0) {
            throw new errorHandler_1.AppError(`Validation failed: ${errors.join('; ')}`, 400, 'VALIDATION_ERROR');
        }
        next();
    };
};
exports.validateRequest = validateRequest;
exports.queryValidationSchemas = {
    executeQuery: {
        body: joi_1.default.object({
            jql: joi_1.default.string().required().min(1).max(5000),
            startAt: joi_1.default.number().integer().min(0).default(0),
            maxResults: joi_1.default.number().integer().min(1).max(1000).default(50),
            fields: joi_1.default.array().items(joi_1.default.string()).optional(),
            allowedIndexes: joi_1.default.array().items(joi_1.default.string()).optional(),
        }),
    },
    validateQuery: {
        body: joi_1.default.object({
            jql: joi_1.default.string().required().min(1).max(5000),
        }),
    },
};
exports.projectValidationSchemas = {
    getProjects: {
        query: joi_1.default.object({
            search: joi_1.default.string().optional(),
            limit: joi_1.default.number().integer().min(1).max(100).default(20),
        }),
    },
};
exports.fieldValidationSchemas = {
    getFields: {
        query: joi_1.default.object({
            index: joi_1.default.string().optional(),
            search: joi_1.default.string().optional(),
            type: joi_1.default.string().valid('string', 'number', 'boolean', 'date', 'object').optional(),
        }),
    },
};
//# sourceMappingURL=validation.js.map