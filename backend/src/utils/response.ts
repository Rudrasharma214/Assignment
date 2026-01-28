import { Response } from 'express';
import { STATUS, StatusCode } from '../constants/statusCodes';

export const sendResponse = (
    res: Response,
    statusCode: StatusCode = STATUS.OK,
    message: string = 'Success',
    data?: any
): void => {
    res.status(statusCode).json({
        success: true,
        message,
        data,
        status: statusCode,
    });
};

export const sendErrorResponse = (
    res: Response,
    statusCode: StatusCode = STATUS.BAD_REQUEST,
    message: string = 'Error',
    data: any = null
): void => {
    res.status(statusCode).json({
        success: false,
        message,
        data,
        status: statusCode,
    });
};
