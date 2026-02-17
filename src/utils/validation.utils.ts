import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
    if (req.body) {
        // Fields to exempt from escaping (URLs, rich text, etc.)
        const skipSanitization = [
            'coverImage', 'organizerLogo', 'avatar',
            'website', 'url', 'link', 'socialLinks',
            'description', 'bio', 'shortSummary', // Allow rich text or normal punctuation
            'agenda', 'speakers', // Arrays/Objects, usually handled by recursion or skipped if not string
            'date', 'startTime', 'endTime'
        ];

        const sanitizeValue = (key: string, value: any) => {
            if (typeof value === 'string' && !skipSanitization.includes(key)) {
                // Only escape if not in skip list
                return validator.escape(value.trim());
            } else if (typeof value === 'object' && value !== null) {
                // Recursively sanitize objects
                Object.keys(value).forEach(subKey => {
                    value[subKey] = sanitizeValue(subKey, value[subKey]);
                });
            }
            return value;
        };

        Object.keys(req.body).forEach(key => {
            req.body[key] = sanitizeValue(key, req.body[key]);
        });
    }
    next();
};
