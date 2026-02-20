import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import mailService from "../services/mail.service";

const testEmail = process.env.EMAIL_USER;

async function runTest() {
    console.log("🚀 Starting Email Service Test...");

    if (!testEmail) {
        console.error("❌ EMAIL_USER is not defined in .env");
        process.exit(1);
    }

    console.log(`📧 Sending test email to: ${testEmail}`);

    try {
        // Use sendWelcomeEmail as a test case
        await mailService.sendWelcomeEmail(testEmail, "Test User");
        console.log("✅ Test completed successfully. Check your inbox!");
    } catch (error) {
        console.error("❌ Test failed:", error);
    }
}

runTest();
