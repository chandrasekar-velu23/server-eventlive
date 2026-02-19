// Run this script in mongosh connected to your Atlas cluster
// mongosh "mongodb+srv://eventlive.qhczpo1.mongodb.net/" --username <your-admin-user>

db = db.getSiblingDB('eventlive');

db.createUser(
    {
        user: "eventlive_secure",
        pwd: "SecurePassword123!@#", // Change this to a strong password
        roles: [
            { role: "readWrite", db: "eventlive" }
        ]
    }
)

print("User 'eventlive_secure' created on 'eventlive' database.");
