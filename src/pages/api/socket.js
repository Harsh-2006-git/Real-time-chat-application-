import { Server } from "socket.io";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

const users = new Map();

const SocketHandler = async (req, res) => {
    if (res.socket.server.io) {
        console.log("Socket.io already running");
        res.end();
        return;
    }

    console.log("Initializing Socket.io");

    await dbConnect();

    const io = new Server(res.socket.server, {
        path: "/api/socket",
        addTrailingSlash: false,
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    res.socket.server.io = io;

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        socket.on("register", async (userId) => {
            if (!userId) return;
            users.set(userId, socket.id);
            try {
                await User.findByIdAndUpdate(userId, { online: true });
                io.emit("user_status", { userId, status: "online" });
                console.log(`User ${userId} registered`);
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
                    await User.findByIdAndUpdate(disconnectedUserId, {
                        online: false,
                        lastSeen: now
                    });
                    io.emit("user_status", {
                        userId: disconnectedUserId,
                        status: "offline",
                        lastSeen: now
                    });
                } catch (err) {
                    console.error("Socket Disconnect Error:", err);
                }
            }
            console.log("Client disconnected:", socket.id);
        });
    });

    console.log("Socket.io initialized successfully");
    res.end();
};

export const config = {
    api: {
        bodyParser: false,
    },
};

export default SocketHandler;
