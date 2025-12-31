require('dotenv').config();
const mongoose = require('mongoose');

async function cleanup() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chat-app";
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB...");

        // We drop the collection to clear the duplicate null emails and start fresh
        await mongoose.connection.db.collection('users').deleteMany({ email: null });
        console.log("Successfully removed users with null emails.");

        // Alternatively, drop the whole collection if it's very messy
        // await mongoose.connection.db.dropCollection('users');

        process.exit(0);
    } catch (err) {
        console.error("Error during cleanup:", err);
        process.exit(1);
    }
}

cleanup();
