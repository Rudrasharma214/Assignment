import dotenv from 'dotenv';
import AppError from '../utils/appError';
import { STATUS } from '../constants/statusCodes';

dotenv.config();

export const config = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5000', 10),
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/polling-system',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};

if (config.NODE_ENV === 'production') {
    if (!process.env.MONGODB_URI) {
        throw new AppError('MONGODB_URI is required in production', STATUS.INTERNAL_ERROR);
    }
    if (config.MONGODB_URI.includes('localhost')) {
        throw new AppError('MONGODB_URI cannot point to localhost in production', STATUS.INTERNAL_ERROR);
    }
}
