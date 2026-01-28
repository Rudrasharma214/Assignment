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
    const statusCode = err instanceof AppError ? err.statusCode : STATUS.INTERNAL_ERROR;

    res.status(statusCode).json({
        success: false,
        message: err.message || 'Something went wrong',
        status: statusCode,
        stack: config.NODE_ENV === 'production' ? undefined : err.stack,
    });
};
