require('dotenv').config();
const mongoose = require('mongoose');

async function nuclearCleanup() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chat-app";
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB...");

        const db = mongoose.connection.db;

        // Drop the users collection entirely to clear corrupted indexes/data
        try {
            await db.collection('users').drop();
            console.log("Successfully dropped 'users' collection.");
        } catch (e) {
            console.log("'users' collection didn't exist or already dropped.");
        }

        // Drop messages too just in case
        try {
            await db.collection('messages').drop();
            console.log("Successfully dropped 'messages' collection.");
        } catch (e) {
            console.log("'messages' collection didn't exist or already dropped.");
        }

        console.log("Database is now clean. Ready for fresh start.");
        process.exit(0);
    } catch (err) {
        console.error("Cleanup failed:", err);
        process.exit(1);
    }
}

nuclearCleanup();
