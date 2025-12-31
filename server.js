/**
 * ⚠️ DEPRECATED - This file is no longer used for Vercel deployment
 * 
 * For Vercel deployment, Socket.io is now handled by:
 * pages/api/socket.js
 * 
 * This file is kept for reference and local development with custom server if needed.
 * To use this file locally, change package.json dev script to: "node server.js"
 */

const { createServer } = require("http");
// No longer need require("url") as we use global URL class
const next = require("next");
const { Server: SocketServer } = require("socket.io");
const mongoose = require("mongoose");
require("dotenv").config();

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chat-app";

// COMPLETE User Schema for Unified Server
const UserSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String },
    image: { type: String },
    online: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);

mongoose.connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected for Unified Server"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
        const { pathname, searchParams } = parsedUrl;

        if (pathname.startsWith("/api/socket")) {
            // Handle socket path if needed, or pass to Next.js
            handle(req, res, parsedUrl);
        } else {
            handle(req, res, parsedUrl);
        }
    });

    const io = new SocketServer(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    const users = new Map();

    io.on("connection", (socket) => {
        socket.on("register", async (userId) => {
            if (!userId) return;
            users.set(userId, socket.id);
            try {
                await User.findByIdAndUpdate(userId, { online: true });
                io.emit("user_status", { userId, status: "online" });
            } catch (err) {
                console.error("Socket Register Error:", err);
            }
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
                    io.emit("user_status", { userId: disconnectedUserId, status: "offline", lastSeen: now });
                } catch (err) {
                    console.error("Socket Disconnect Error:", err);
                }
            }
        });
    });

    const PORT = process.env.PORT || 3000;
    httpServer.listen(PORT, (err) => {
        if (err) throw err;
        console.log(`🚀 Unified Server ready on http://localhost:${PORT}`);
    });
});
