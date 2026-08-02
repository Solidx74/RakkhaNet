import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";

let io: SocketServer | null = null;

export function initSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[Socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error("Socket.io has not been initialized!");
  }
  return io;
}

export function emitRealTimeEvent(event: string, data: any) {
  if (io) {
    io.emit(event, data);
    console.log(`[Socket.io] Emitted event: ${event}`);
  } else {
    console.warn(`[Socket.io] Cannot emit event ${event}: socket not initialized.`);
  }
}
