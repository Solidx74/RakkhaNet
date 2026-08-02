import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export function useSocket(eventHandlers: Record<string, (data: any) => void>) {
  useEffect(() => {
    if (!socket) {
      socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ["websocket"],
      });
      console.log("[Socket.io-Client] Connecting to", SOCKET_URL);
    }

    // Register active event handlers
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socket?.on(event, handler);
    });

    return () => {
      // Clean up handlers
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        socket?.off(event, handler);
      });
    };
  }, [eventHandlers]);

  return socket;
}
