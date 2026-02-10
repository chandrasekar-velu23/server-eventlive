import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                req.body[key] = validator.escape(req.body[key].trim());
            }
        });
    }
    next();
};
