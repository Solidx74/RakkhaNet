"use client";

import React from "react";
import { useAuthStore } from "@/stores/authStore";
import NotificationBell from "./NotificationBell";
import { LogOut, User, ShieldAlert, LayoutDashboard, MapPin, Layers } from "lucide-react";

export default function Navbar() {
  const { token, user, clearAuth } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0F172A]/90 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <a href="/" className="w-9 h-9 rounded-lg bg-[#0EA5E9] flex items-center justify-center font-bold text-white shadow-lg shadow-sky-950/50">
          R
        </a>
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Rakkha<span className="text-[#0EA5E9]">Net</span>
          </h1>
          <p className="text-xs text-gray-400">Bangladesh Disaster Response Platform</p>
        </div>
      </div>

      <nav className="hidden md:flex items-center space-x-5 text-xs font-semibold text-gray-300">
        <a href="/shelters" className="hover:text-[#0EA5E9] transition flex items-center space-x-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>Shelters</span>
        </a>
        <a href="/risk-map" className="hover:text-[#0EA5E9] transition flex items-center space-x-1">
          <Layers className="w-3.5 h-3.5" />
          <span>Risk Map</span>
        </a>
        <a href="/evacuation" className="hover:text-[#0EA5E9] transition flex items-center space-x-1">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Evacuation</span>
        </a>
        {token && (user?.role === "COORDINATOR" || user?.role === "ADMIN") && (
          <a href="/dashboard" className="hover:text-[#0EA5E9] transition flex items-center space-x-1">
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </a>
        )}
        {token && user?.role === "ADMIN" && (
          <a href="/admin/broadcast" className="hover:text-rose-400 text-rose-300 transition flex items-center space-x-1">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Broadcast Panel</span>
          </a>
        )}
      </nav>

      <div className="flex items-center space-x-3">
        <NotificationBell />

        {token ? (
          <div className="flex items-center space-x-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-gray-300">
            <User className="w-3.5 h-3.5 text-[#0EA5E9]" />
            <span className="font-bold truncate max-w-[100px]">{user?.name}</span>
            <span className="text-[9px] uppercase font-bold text-gray-500 border border-gray-850 px-1 py-0.5 rounded">
              {user?.role}
            </span>
            <button
              onClick={() => clearAuth()}
              className="text-gray-500 hover:text-rose-400 ml-2"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <a
            href="/"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white transition shadow-md"
          >
            Citizen Sign In
          </a>
        )}
      </div>
    </header>
  );
}
