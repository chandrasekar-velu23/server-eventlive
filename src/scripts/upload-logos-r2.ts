
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Load server environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "eventlive-assets";
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
    console.error("❌ Missing R2 credentials in .env");
    process.exit(1);
}

const s3Client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

const uploadFile = async (filePath: string, key: string, contentType: string) => {
    try {
        const fileContent = fs.readFileSync(filePath);
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: contentType,
        });

        await s3Client.send(command);
        console.log(`✅ Uploaded ${key} successfully.`);

        const publicUrl = R2_PUBLIC_DOMAIN
            ? `${R2_PUBLIC_DOMAIN}/${key}`
            : `https://${R2_BUCKET_NAME}.r2.dev/${key}`; // Fallback if no custom domain

        console.log(`🔗 Public URL: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error(`❌ Error uploading ${key}:`, error);
        return null;
    }
};

const main = async () => {
    const clientPublicDir = path.resolve(__dirname, "../../../eventlive-client/public");

    const logoPath = path.join(clientPublicDir, "EventLive.png");
    const iconPath = path.join(clientPublicDir, "iconEventLive.png");

    if (fs.existsSync(logoPath)) {
        console.log("📤 Uploading Logo...");
        await uploadFile(logoPath, "assets/EventLive.png", "image/png");
    } else {
        console.error(`❌ Logo not found at ${logoPath}`);
    }

    if (fs.existsSync(iconPath)) {
        console.log("📤 Uploading Icon...");
        await uploadFile(iconPath, "assets/iconEventLive.png", "image/png");
    } else {
        console.error(`❌ Icon not found at ${iconPath}`);
    }
};

main();
