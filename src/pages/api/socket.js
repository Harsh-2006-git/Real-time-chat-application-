import { Server } from "socket.io";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// Use a global variable to persist users map between API reloads in development
if (!global.socketUsers) {
    global.socketUsers = new Map();
}
const users = global.socketUsers;

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

            // Join user-specific room for multi-device/tab support
            socket.join(userId);
            users.set(userId, socket.id);

            try {
                await User.findByIdAndUpdate(userId, { online: true });

                // Notify everyone that this user is online
                io.emit("user_status", { userId, status: "online" });

                // Send the list of current online users to the connected user
                socket.emit("online_users", Array.from(users.keys()));

                console.log(`User ${userId} registered and joined room`);
            } catch (err) {
                console.error("Socket Register Error:", err);
            }
        });

        socket.on("send_message", (message) => {
            // Emit to recipient's room and sender's room (all tabs)
            io.to(message.recipientId).to(message.senderId).emit("receive_message", message);
        });

        socket.on("edit_message", ({ messageId, recipientId, content, senderId }) => {
            io.to(recipientId).to(senderId).emit("message_edited", { messageId, content });
        });

        socket.on("delete_message", ({ messageId, recipientId, senderId }) => {
            io.to(recipientId).to(senderId).emit("message_deleted", { messageId });
        });

        socket.on("typing", ({ senderId, recipientId }) => {
            io.to(recipientId).emit("typing", { senderId });
        });

        socket.on("stop_typing", ({ senderId, recipientId }) => {
            io.to(recipientId).emit("stop_typing", { senderId });
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
                    // Notify everyone that this user is offline
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
