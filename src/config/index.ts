import dotenv from 'dotenv';

dotenv.config();

export const config = {
    jwtSecret: process.env.JWT_SECRET as string,
    port: process.env.PORT || 5000,
    // Add logic to choose the URI
    mongoUri: process.env.USE_CLOUD_DB === 'true'
        ? (process.env.DB_URI as string || process.env.MONGO_URI as string)
        : (process.env.MONGO_URI as string || 'mongodb://127.0.0.1:27017/eventlive'),
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
};
