import { STATUS, StatusCode } from '../constants/statusCodes';

export default class AppError extends Error {
    statusCode: StatusCode;

    constructor(message: string, statusCode: StatusCode = STATUS.INTERNAL_ERROR) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
