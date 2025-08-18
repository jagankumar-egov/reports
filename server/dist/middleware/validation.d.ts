import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export declare const validateRequest: (schema: {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
}) => (req: Request, res: Response, next: NextFunction) => void;
export declare const queryValidationSchemas: {
    executeQuery: {
        body: Joi.ObjectSchema<any>;
    };
    validateQuery: {
        body: Joi.ObjectSchema<any>;
    };
};
export declare const projectValidationSchemas: {
    getProjects: {
        query: Joi.ObjectSchema<any>;
    };
};
export declare const fieldValidationSchemas: {
    getFields: {
        query: Joi.ObjectSchema<any>;
    };
};
//# sourceMappingURL=validation.d.ts.map