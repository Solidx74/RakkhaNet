"use client";

import React from "react";
import { ShieldAlert, MapPin, Navigation, HeartHandshake, Bell, Lock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0d1117]/80 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/50">
            R
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Rakkha<span className="text-emerald-500">Net</span>
            </h1>
            <p className="text-xs text-gray-400">Bangladesh Disaster Response Platform</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-gray-300">
          <a href="/shelters" className="hover:text-emerald-400 transition">Shelter Locator</a>
          <a href="/risk-map" className="hover:text-emerald-400 transition">Risk Map</a>
          <a href="#evacuation" className="hover:text-emerald-400 transition">Evacuation</a>
          <a href="#relief" className="hover:text-emerald-400 transition">Relief Dashboard</a>
        </nav>

        <div className="flex items-center space-x-3">
          <a href="/shelters" className="px-4 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md shadow-emerald-900/30">
            Find Shelters Near Me
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-8">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Disaster Mitigation System</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              AI-Powered Flood & Cyclone Response for <span className="text-emerald-400 underline decoration-emerald-600 decoration-wavy">Bangladesh</span>
            </h2>

            <p className="text-gray-300 text-lg leading-relaxed">
              Coordinating instant emergency shelter discovery, road-avoiding evacuation routes, high-risk flood zone mapping, and automated relief request triage across all 64 districts.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <a href="/shelters" className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center space-x-2 transition shadow-lg shadow-emerald-950/50">
                <MapPin className="w-5 h-5" />
                <span>Locate Nearest Shelter</span>
              </a>

              <a href="/risk-map" className="px-6 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-semibold flex items-center space-x-2 transition">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                <span>View Risk Zones</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 bg-gray-900/90 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>National Disaster Summary</span>
              <span className="text-xs font-normal text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">Live API</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/60 border border-gray-700/50 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Registered Shelters</p>
                <p className="text-2xl font-bold text-white mt-1">2,480+</p>
                <p className="text-[10px] text-emerald-400 mt-0.5">Updated 2m ago</p>
              </div>

              <div className="bg-gray-800/60 border border-gray-700/50 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Active High Risk Zones</p>
                <p className="text-2xl font-bold text-rose-400 mt-1">14 Zones</p>
                <p className="text-[10px] text-rose-400/80 mt-0.5">Sylhet & Sunamganj</p>
              </div>

              <div className="bg-gray-800/60 border border-gray-700/50 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Active Volunteers</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">512</p>
                <p className="text-[10px] text-amber-400/80 mt-0.5">On standby</p>
              </div>

              <div className="bg-gray-800/60 border border-gray-700/50 p-4 rounded-xl">
                <p className="text-xs text-gray-400">Shelter Capacity Used</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">38%</p>
                <p className="text-[10px] text-blue-400/80 mt-0.5">Safe availability</p>
              </div>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-4 text-xs text-emerald-300 space-y-1">
              <p className="font-semibold text-emerald-400">Emergency Hotline Numbers:</p>
              <p>National Emergency Control Room: <span className="font-mono text-white">999</span> | Disaster Info: <span className="font-mono text-white">1090</span></p>
            </div>
          </div>
        </div>

        {/* Feature Modules Grid */}
        <div className="mt-16 space-y-6">
          <h3 className="text-2xl font-bold text-white tracking-tight text-center">Core Platform Modules</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="/risk-map" className="bg-gray-900/60 border border-gray-800 p-6 rounded-2xl hover:border-rose-500/50 transition block group">
              <div className="w-10 h-10 rounded-lg bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 mb-4 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-rose-400 transition">1. Flood & Cyclone Risk Map</h4>
              <p className="text-gray-400 text-sm mt-2">
                Real-time spatial visualization of flood extent polygons, river water levels, and cyclone path warnings.
              </p>
            </a>

            <a href="/shelters" className="bg-gray-900/60 border border-gray-800 p-6 rounded-2xl hover:border-emerald-500/50 transition block group">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">2. Emergency Shelter Locator</h4>
              <p className="text-gray-400 text-sm mt-2">
                2dsphere spatial search finding open cyclone shelters with real-time capacity and amenity verification.
              </p>
            </a>

            <div className="bg-gray-900/60 border border-gray-800 p-6 rounded-2xl hover:border-emerald-500/50 transition">
              <div className="w-10 h-10 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400 mb-4">
                <Navigation className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">3. Safe Evacuation Guidance</h4>
              <p className="text-gray-400 text-sm mt-2">
                Dynamic route calculations navigating citizens away from active hazard zones toward the nearest safe shelter.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 p-6 rounded-2xl hover:border-emerald-500/50 transition">
              <div className="w-10 h-10 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400 mb-4">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">4. Relief Coordination Dashboard</h4>
              <p className="text-gray-400 text-sm mt-2">
                Kanban triage for NGO coordinators and volunteers to track food, water, and medical supply distribution.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 p-6 rounded-2xl hover:border-emerald-500/50 transition">
              <div className="w-10 h-10 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400 mb-4">
                <Bell className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">5. Real-Time Alerts & Broadcasts</h4>
              <p className="text-gray-400 text-sm mt-2">
                District-level WebSocket push alerts and SMS disaster notifications triggered by authorities.
              </p>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 p-6 rounded-2xl hover:border-emerald-500/50 transition">
              <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h4 className="text-lg font-bold text-white">6. Role Management & Auth</h4>
              <p className="text-gray-400 text-sm mt-2">
                Better Auth & JWT stateless RBAC for Citizens, Volunteers, Relief Coordinators, and Administrators.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#0a0d12] py-8 text-center text-xs text-gray-500">
        <p>RakkhaNet Platform &copy; 2026. Built by Team: Kareeb, Nahian, Rohan, Arpon.</p>
        <p className="mt-1 text-gray-600">Built with Next.js 14, Express.js, MongoDB Atlas (2dsphere), Leaflet, & Tailwind CSS.</p>
      </footer>
    </div>
  );
}
