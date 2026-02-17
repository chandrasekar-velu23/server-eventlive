import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = ['JWT_SECRET', 'DB_URI'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please set these variables in your .env file or Render dashboard');
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

export const config = {
    jwtSecret: process.env.JWT_SECRET as string,
    port: process.env.PORT || 5000,
    mongoUri: process.env.DB_URI as string,
    env: process.env.NODE_ENV || 'development',
    frontendUrl: process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production'
        ? 'https://eventliveclient.netlify.app'
        : 'http://localhost:5173'),
    backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
};
