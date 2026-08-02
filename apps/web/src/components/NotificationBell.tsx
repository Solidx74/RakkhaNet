"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/stores/authStore";
import { Bell, ShieldAlert, Check } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function NotificationBell() {
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<any | null>(null);

  // Fetch initial alerts
  useEffect(() => {
    if (!token) return;
    const fetchAlerts = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = res.data.data.notifications;
        setNotifications(list);
        setUnreadCount(list.filter((n: any) => !n.isRead).length);
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
      }
    };
    fetchAlerts();
  }, [token]);

  // Handle incoming live broadcast
  const handleLiveAlert = (newNotify: any) => {
    console.log("[NotificationBell] Received live alert broadcast:", newNotify);
    setNotifications((prev) => [newNotify, ...prev]);
    setUnreadCount((count) => count + 1);

    // Display temporary live toast pop-up
    setToastMessage(newNotify);
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  useSocket({
    newNotificationAlert: handleLiveAlert,
  });

  const markAsRead = async (id: string) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, isRead: true } : item))
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  if (!token) return null;

  return (
    <div className="relative z-50">
      {/* Toast Alert Pop-up */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 max-w-sm bg-rose-950 border border-rose-700 text-white p-4 rounded-xl shadow-2xl flex items-start space-x-3 animate-slide-in">
          <ShieldAlert className="w-5 h-5 text-rose-500 animate-bounce flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="font-extrabold text-xs tracking-wide uppercase text-rose-400">EMERGENCY BROADCAST</h4>
            <p className="font-bold text-sm leading-snug">{toastMessage.title}</p>
            <p className="text-xs text-gray-300">{toastMessage.message}</p>
          </div>
        </div>
      )}

      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg text-gray-300 hover:text-white transition"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-rose-600 text-white font-mono text-[9px] font-bold rounded-full flex items-center justify-center border border-gray-900 shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Alerts Feed */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden text-xs max-h-96 overflow-y-auto">
          <div className="p-3.5 border-b border-gray-850 flex items-center justify-between bg-gray-900/90 backdrop-blur">
            <h4 className="font-bold text-white flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Broadcast Alerts</span>
            </h4>
            <span className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
              {unreadCount} unread
            </span>
          </div>

          <div className="divide-y divide-gray-850">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-400">No active alerts at this time.</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-3.5 space-y-1.5 transition ${
                    n.isRead ? "bg-gray-900/40 text-gray-400" : "bg-rose-950/10 text-white font-medium"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="font-extrabold text-sm leading-snug">{n.title}</p>
                    {!n.isRead && (
                      <button
                        onClick={() => markAsRead(n._id)}
                        className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded"
                        title="Mark read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed text-gray-300">{n.message}</p>
                  <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                    <span>Region: {n.targetDistrict}</span>
                    <span>{new Date(n.sentAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
