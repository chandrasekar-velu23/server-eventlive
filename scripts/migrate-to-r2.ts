import fs from 'fs';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../src/services/s3.service';
import dotenv from 'dotenv';
import mime from 'mime-types'; // You might need to install this: npm install mime-types @types/mime-types

dotenv.config();

const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;

console.log("---------------------------------------------------");
console.log("Configuration Check:");
console.log(`R2_BUCKET_NAME: ${R2_BUCKET_NAME}`);
console.log(`R2_ENDPOINT: ${R2_ENDPOINT}`);
console.log(`R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID ? R2_ACCESS_KEY_ID.substring(0, 4) + '****' : 'MISSING'}`);
console.log(`R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY ? (R2_SECRET_ACCESS_KEY.substring(0, 4) + '****') : 'MISSING'}`);
console.log("---------------------------------------------------");

if (!R2_BUCKET_NAME || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
    console.error("CRITICAL ERROR: Missing R2 environment variables.");
    console.error("Please ensure .env file exists and contains all R2 credentials.");
    process.exit(1);
}

const getAllFiles = (dirPath: string, arrayOfFiles: string[] = []) => {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
};

const migrate = async () => {
    console.log("Starting migration to R2...");

    if (!fs.existsSync(UPLOADS_DIR)) {
        console.log("No local uploads found to migrate (public/uploads directory missing).");
        return;
    }

    const files = getAllFiles(UPLOADS_DIR);
    console.log(`Found ${files.length} files to migrate.`);

    let successCount = 0;
    let failCount = 0;

    for (const filePath of files) {
        try {
            const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/'); // Normalize path for S3 key
            // Ensure the key starts with public/uploads... or just uploads... depending on how you want it.
            // Our middleware uses `public/uploads/...` so we should keep it consistent.
            // relativePath will be like `public/uploads/avatars/image.jpg` if run from root.

            const fileContent = fs.readFileSync(filePath);
            const contentType = mime.lookup(filePath) || 'application/octet-stream';

            console.log(`Uploading: ${relativePath}`);

            await s3Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: relativePath,
                Body: fileContent,
                ContentType: contentType,
                // ACL: 'public-read' // REMOVED: R2 does not always support ACLs and it can cause 401/403
            }));

            successCount++;
        } catch (error: any) {
            console.error(`Failed to upload ${filePath}:`);
            console.error(`  Error Code: ${error.Code || error.code || 'Unknown'}`);
            console.error(`  Message: ${error.message}`);
            failCount++;
        }
    }

    console.log("\nMigration completed!");
    console.log(`Successfully uploaded: ${successCount}`);
    console.log(`Failed: ${failCount}`);
};

migrate();
