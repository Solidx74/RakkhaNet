"use client";

import { useSyncExternalStore } from "react";
import { getSocket } from "@/lib/socket";

function subscribe(onChange: () => void) {
  const socket = getSocket();
  socket.on("connect", onChange);
  socket.on("disconnect", onChange);
  return () => {
    socket.off("connect", onChange);
    socket.off("disconnect", onChange);
  };
}

const getSnapshot = () => getSocket().connected;
// Never "connected" on the server or during hydration.
const getServerSnapshot = () => false;

/**
 * Whether the live-update socket is connected right now. Only a connected
 * socket delivers "something changed" events -- so anything labelled "live"
 * should depend on this, not assume it.
 */
export function useSocketConnected(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
