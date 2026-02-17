
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT) {
    console.error("Missing R2 environment variables.");
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

const uploadLogo = async () => {
    try {
        const filePath = path.join(__dirname, "../../../eventlive-client/public/logo-eventlive.svg");
        const fileContent = fs.readFileSync(filePath);
        const key = "assets/logo-eventlive.svg";

        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileContent,
            ContentType: "image/svg+xml",
            ACL: "public-read",
        });

        await s3Client.send(command);

        let publicUrl = R2_PUBLIC_DOMAIN ? `${R2_PUBLIC_DOMAIN}/${key}` : `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
        // Clean up URL if needed
        if (process.env.R2_PUBLIC_DOMAIN) {
            publicUrl = `${process.env.R2_PUBLIC_DOMAIN}/assets/logo-eventlive.svg`;
        }

        console.log(`Successfully uploaded logo to: ${publicUrl}`);
    } catch (error) {
        console.error("Error uploading logo:", error);
    }
};

uploadLogo();
