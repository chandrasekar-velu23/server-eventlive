import { S3Client, ListBucketsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_ENDPOINT = process.env.R2_ENDPOINT;

console.log("\n--- Cloudflare R2 Connection Test ---");
console.log(`Endpoint: ${R2_ENDPOINT}`);
console.log(`Bucket:   ${R2_BUCKET_NAME}`);
console.log(`Key ID:   ${R2_ACCESS_KEY_ID ? R2_ACCESS_KEY_ID.substring(0, 4) + '****' : 'MISSING'}`);
console.log(`Secret:   ${R2_SECRET_ACCESS_KEY ? R2_SECRET_ACCESS_KEY.substring(0, 4) + '****' : 'MISSING'}`);
console.log("-------------------------------------\n");

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT) {
    console.error("❌ MISSING CRITICAL ENVIRONMENT VARIABLES");
    process.exit(1);
}

const s3 = new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function runTest() {
    try {
        console.log("1. Testing Authentication (ListBuckets)...");
        const { Buckets } = await s3.send(new ListBucketsCommand({}));
        console.log("   ✅ Success! Found buckets:", Buckets?.map(b => b.Name).join(", "));

        if (R2_BUCKET_NAME) {
            console.log(`\n2. Testing Bucket Access (${R2_BUCKET_NAME})...`);
            const { Contents } = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME, MaxKeys: 5 }));
            console.log("   ✅ Success! Found objects:", Contents ? Contents.length : 0);
        } else {
            console.log("\n⚠️  Skipping Bucket Test (R2_BUCKET_NAME not set)");
        }

        console.log("\n✅ R2 CONNECTION IS WORKING CORRECTLY!");

    } catch (error: any) {
        console.error("\n❌ CONNECTION FAILED");
        console.error("Error Code:", error.name || error.code);
        console.error("Message:", error.message);

        if (error.name === "Unauthorized" || error.$metadata?.httpStatusCode === 401) {
            console.log("\n💡 TROUBLESHOOTING:");
            console.log("- Check if R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY are correct.");
            console.log("- Ensure the Token has 'Admin Read & Write' permissions.");
            console.log("- Verify R2_ENDPOINT does NOT contain the bucket name.");
        }
    }
}

runTest();
