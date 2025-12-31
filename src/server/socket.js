/**
 * ⚠️ DEPRECATED - This file is no longer used
 * 
 * For Vercel deployment, Socket.io is now handled by:
 * pages/api/socket.js
 * 
 * This separate socket server is not compatible with Vercel's serverless architecture.
 */

require('dotenv').config({ path: '.env' });
const { createServer } = require("http");
const { Server: SocketServer } = require("socket.io");
const mongoose = require("mongoose");

// We need a simple User schema here since we can't easily import the ESM one
const UserSchema = new mongoose.Schema({
    online: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
});
const User = mongoose.models.User || mongoose.model("User", UserSchema);

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB for Sockets"))
    .catch(err => console.error("MongoDB connection error for Sockets:", err));

const httpServer = createServer();
const io = new SocketServer(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

const users = new Map(); // userId -> socketId

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("register", async (userId) => {
        users.set(userId, socket.id);

        // Update DB
        try {
            await User.findByIdAndUpdate(userId, { online: true });
            io.emit("user_status", { userId, status: "online" });
        } catch (err) {
            console.error("Error updating user online status:", err);
        }

        console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    socket.on("send_message", (message) => {
        const recipientSocketId = users.get(message.recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("receive_message", message);
        }
    });

    socket.on("edit_message", ({ messageId, recipientId, content }) => {
        const recipientSocketId = users.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("message_edited", { messageId, content });
        }
    });

    socket.on("delete_message", ({ messageId, recipientId }) => {
        const recipientSocketId = users.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("message_deleted", { messageId });
        }
    });

    socket.on("typing", ({ senderId, recipientId }) => {
        const recipientSocketId = users.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("typing", { senderId });
        }
    });

    socket.on("stop_typing", ({ senderId, recipientId }) => {
        const recipientSocketId = users.get(recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("stop_typing", { senderId });
        }
    });

    socket.on("disconnect", async () => {
        let disconnectedUserId;
        for (const [userId, socketId] of users.entries()) {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                users.delete(userId);
                break;
            }
        }
        if (disconnectedUserId) {
            const now = new Date();
            try {
                await User.findByIdAndUpdate(disconnectedUserId, { online: false, lastSeen: now });
                io.emit("user_status", {
                    userId: disconnectedUserId,
                    status: "offline",
                    lastSeen: now
                });
            } catch (err) {
                console.error("Error updating user offline status:", err);
            }
        }
        console.log("Client disconnected:", socket.id);
    });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`> Socket server ready on http://localhost:${PORT}`);
});
