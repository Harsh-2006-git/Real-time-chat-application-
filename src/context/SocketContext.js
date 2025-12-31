"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useSession } from "next-auth/react";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const { data: session } = useSession();
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (session?.user?.id) {
            const newSocket = io({
                path: "/api/socket",
            });
            setSocket(newSocket);

            newSocket.emit("register", session.user.id);

            return () => newSocket.close();
        }
    }, [session]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
