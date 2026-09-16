"use client";

import { io, type Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

let socket: Socket | null = null;

/** Singleton Socket.io client -- one connection shared across the app,
 *  not one per component that happens to use it. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { withCredentials: true, autoConnect: true });
  }
  return socket;
}
