import { Request, Response, NextFunction } from 'express';
import { STATUS } from '../constants/statusCodes';
import AppError from '../utils/appError';
import { config } from '../config/env';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    console.error('Error:', err.message, err.stack);

    let statusCode = STATUS.INTERNAL_ERROR;
    let message = err.message || 'Something went wrong';

    if (err instanceof AppError) {
        statusCode = err.statusCode;
    } else if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        if ((err as any).code === 11000) {
            statusCode = STATUS.CONFLICT;
            message = 'Duplicate entry';
        } else {
            statusCode = STATUS.SERVICE_UNAVAILABLE;
            message = 'Database error. Please try again.';
        }
    } else if (err.name === 'ValidationError') {
        statusCode = STATUS.BAD_REQUEST;
    } else if (err.name === 'CastError') {
        statusCode = STATUS.BAD_REQUEST;
        message = 'Invalid ID format';
    }

    res.status(statusCode).json({
        success: false,
        message,
        status: statusCode,
        stack: config.NODE_ENV === 'production' ? undefined : err.stack,
    });
};
