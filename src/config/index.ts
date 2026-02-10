import dotenv from 'dotenv';

dotenv.config();

export const config = {
    jwtSecret: process.env.JWT_SECRET as string,
    port: process.env.PORT || 5000,
    mongoUri: process.env.DB_URI as string,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || 'https://eventliveclient.netlify.app/',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
};
