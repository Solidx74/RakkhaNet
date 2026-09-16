"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

/** Calls `onChange` whenever the backend broadcasts a relief-request
 *  create/assign/status-change -- wire this to a page's refetch function. */
export function useReliefRequestsLive(onChange: () => void) {
  useEffect(() => {
    const socket = getSocket();
    socket.on("relief-requests:changed", onChange);
    return () => {
      socket.off("relief-requests:changed", onChange);
    };
  }, [onChange]);
}
