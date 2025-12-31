"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSession } from "next-auth/react";

const SocketContext = createContext({ socket: null, onlineUsers: [] });

export const SocketProvider = ({ children }) => {
    const { data: session } = useSession();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);

    useEffect(() => {
        if (session?.user?.id) {
            const newSocket = io({
                path: "/api/socket",
            });

            setSocket(newSocket);

            newSocket.on("connect", () => {
                console.log("Socket connected, registering user:", session.user.id);
                newSocket.emit("register", session.user.id);
            });

            newSocket.on("online_users", (users) => {
                setOnlineUsers(users);
            });

            newSocket.on("user_status", ({ userId, status }) => {
                if (status === "online") {
                    setOnlineUsers(prev => [...new Set([...prev, userId])]);
                } else {
                    setOnlineUsers(prev => prev.filter(id => id !== userId));
                }
            });

            // Re-register on reconnect
            newSocket.on("reconnect", () => {
                newSocket.emit("register", session.user.id);
            });

            return () => {
                newSocket.off("connect");
                newSocket.off("reconnect");
                newSocket.off("online_users");
                newSocket.off("user_status");
                newSocket.close();
            };
        }
    }, [session]);

    return (
        <SocketContext.Provider value={{ socket, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
