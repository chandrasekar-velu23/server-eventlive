import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME || !R2_ENDPOINT) {
    console.warn("Missing R2 environment variables. R2 storage will not work.");
}

export const s3Client = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || "",
        secretAccessKey: R2_SECRET_ACCESS_KEY || "",
    },
});

export const getPublicUrl = (filename: string): string => {
    // If you have a custom domain for your R2 bucket, use it here.
    // Otherwise, you might need to use the R2.dev URL if enabled, or a worker.
    // For now, assuming R2_PUBLIC_URL is set or falling back to a constructed URL if possible,
    // but R2 buckets aren't public by default without a worker or custom domain.
    // We will use an env variable for the public domain.
    // We will use an env variable for the public domain.
    let publicDomain = process.env.R2_PUBLIC_DOMAIN || "";

    // Remove trailing slash if present
    if (publicDomain.endsWith('/')) {
        publicDomain = publicDomain.slice(0, -1);
    }

    if (publicDomain) {
        // Ensure filename doesn't start with / if domain doesn't end with one (we just removed it)
        const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename;
        return `${publicDomain}/${cleanFilename}`;
    }
    return filename;
};

export const uploadFile = async (
    file: Express.Multer.File,
    key: string,
    contentType: string
): Promise<string> => {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
        ACL: "public-read", // R2 doesn't support ACLs the same way but good for compatibility if replaced
    });

    try {
        await s3Client.send(command);
        return getPublicUrl(key);
    } catch (error) {
        console.error("Error uploading file to R2:", error);
        throw new Error("Failed to upload file to storage");
    }
};
