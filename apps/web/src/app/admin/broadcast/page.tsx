"use client";

import React, { useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";
import Navbar from "@/components/Navbar";
import { ShieldAlert, Send, CheckCircle2, RefreshCw } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminBroadcastPage() {
  const { token, user } = useAuthStore();
  const [formData, setFormData] = useState({
    targetDistrict: "ALL",
    title: "",
    message: "",
    channel: "IN_APP",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/notifications/broadcast`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setSubmitStatus({
          success: true,
          message: `Disaster broadcast dispatched successfully via ${formData.channel} channel!`,
        });
        setFormData({
          targetDistrict: "ALL",
          title: "",
          message: "",
          channel: "IN_APP",
        });
      }
    } catch (err: any) {
      setSubmitStatus({
        success: false,
        message: err.response?.data?.message || "Failed to broadcast emergency alert. Please retry.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0d1117] text-white">
      <Navbar />

      <main className="flex-1 max-w-lg mx-auto px-4 py-12 w-full flex flex-col justify-center">
        {!isAdmin ? (
          <div className="bg-rose-950/40 border border-rose-800 p-6 rounded-2xl text-xs text-rose-300 space-y-2 text-center">
            <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto animate-bounce" />
            <h3 className="font-extrabold text-sm text-white">Admin Restricted Control Panel</h3>
            <p>You must be authenticated as an Administrator to issue emergency national broadcast alerts.</p>
          </div>
        ) : (
          <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 border-b border-gray-850 pb-4">
              <div className="w-10 h-10 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-500">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Emergency Alert Broadcast Panel</h2>
                <p className="text-xs text-gray-400">Issue warnings across In-App, email, or SMS channels</p>
              </div>
            </div>

            {submitStatus && (
              <div
                className={`p-4 rounded-xl text-xs flex items-start space-x-3 border ${
                  submitStatus.success
                    ? "bg-emerald-950/50 border-emerald-800 text-emerald-300"
                    : "bg-rose-950/50 border-rose-800 text-rose-300"
                }`}
              >
                {submitStatus.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
                )}
                <span>{submitStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleBroadcast} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">Target Region / District</label>
                <select
                  value={formData.targetDistrict}
                  onChange={(e) => setFormData({ ...formData, targetDistrict: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="ALL">All Districts (National Broadcast)</option>
                  <option value="Sunamganj">Sunamganj</option>
                  <option value="Cox's Bazar">Cox's Bazar</option>
                  <option value="Bhola">Bhola</option>
                  <option value="Chattogram">Chattogram</option>
                  <option value="Satkhira">Satkhira</option>
                  <option value="Kurigram">Kurigram</option>
                  <option value="Sirajganj">Sirajganj</option>
                  <option value="Dhaka">Dhaka</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">Broadcast Channel</label>
                <select
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="IN_APP">In-App Notification Feed</option>
                  <option value="EMAIL">Email Alert Broadcast (Nodemailer SMTP)</option>
                  <option value="SMS">SMS Broadcast Alert (Console Gateway Mock)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">Alert Title / Header</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Danger Signal No. 10 Cyclone Alert"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">Alert Message Body</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe details, evacuation corridors, or emergency contacts..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow-lg transition flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending Broadcast...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Emergency Broadcast</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
