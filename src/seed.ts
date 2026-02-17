import User from "./models/user.model";
import { defaultUsers } from "./config/user.config";
import { sendRoleNotification } from "./services/mail.service";
import bcrypt from "bcryptjs";

export const seedUsers = async () => {
    try {
        // console.log("🌱 STARTING USER SEEDING PROCESS...");

        for (const userData of defaultUsers) {
            const existingUser = await User.findOne({ email: userData.email });

            if (!existingUser) {
                console.log(`Checking user: ${userData.email} - NOT FOUND. Creating...`);



                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(userData.password, salt);

                const newUser = await User.create({
                    ...userData,
                    password: hashedPassword
                });

                // console.log(`User created: ${newUser.name} (${newUser.role})`);

                // Send Notification
                await sendRoleNotification(
                    newUser.email,
                    newUser.role,
                    "Account Initialized"
                );

            } else {
                // console.log(` User already exists: ${userData.email} (${userData.role})`);
            }
        }

        // console.log("🌱 USER SEEDING COMPLETED.");
    } catch (error) {
        // console.error("User Seeding Failed:", error);
    }
};
