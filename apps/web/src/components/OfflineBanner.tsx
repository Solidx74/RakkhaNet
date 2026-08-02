"use client";

import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    // Initial check
    if (typeof window !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-amber-600 text-white text-xs px-4 py-2 flex items-center justify-center space-x-2 font-medium shadow-md border-b border-amber-500">
      <WifiOff className="w-4 h-4 animate-bounce" />
      <span>
        <strong>Offline Mode Active:</strong> Network connection unavailable. Displaying cached emergency shelters & evacuation guidance.
      </span>
    </div>
  );
}
