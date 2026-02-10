import mongoose from 'mongoose';
import { config } from './index';

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongoUri);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Log whether we are on Cloud or Local for clarity
        if (config.mongoUri.includes('mongodb.net')) {
            console.log('☁️  Connected to Atlas Cloud DB');
        } else {
            console.log('💻 Connected to Local DB');
        }

    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        // Retry logic or graceful shutdown could be added here
        process.exit(1);
    }
};
