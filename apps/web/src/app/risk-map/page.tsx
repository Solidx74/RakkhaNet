"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ShieldAlert, Search, Filter, RefreshCw, AlertTriangle, CloudRain, Waves, MapPin } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const RiskMap = dynamic(() => import("@/components/map/RiskMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[480px] bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center text-gray-400 space-y-3">
      <RefreshCw className="w-8 h-8 animate-spin text-rose-500" />
      <p className="text-sm font-medium">Loading Risk Zone Polygon Layers...</p>
    </div>
  ),
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function RiskMapPage() {
  const { token } = useAuthStore();
  const [searchRegion, setSearchRegion] = useState("");
  const [selectedDisasterType, setSelectedDisasterType] = useState("ALL");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  // TanStack Query: Fetch Risk Zones
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["risk-zones", searchRegion, selectedDisasterType],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const params: any = {};
      if (searchRegion) {
        params.region = searchRegion;
      }
      if (selectedDisasterType !== "ALL") {
        params.disasterType = selectedDisasterType;
      }

      const res = await axios.get(`${API_BASE_URL}/api/risk-zones`, { params, headers });
      return res.data.data.riskZones;
    },
  });

  const riskZones = data || [];

  const criticalCount = riskZones.filter((z: any) => z.riskLevel === "CRITICAL").length;
  const totalAffectedPop = riskZones.reduce((sum: number, z: any) => sum + (z.affectedPopEstimate || 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#0d1117] text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0d1117]/90 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <a href="/" className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-900/50">
            R
          </a>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Risk<span className="text-rose-500">Map</span>
            </h1>
            <p className="text-xs text-gray-400">Flood & Cyclone Disaster Risk Visualization</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a href="/shelters" className="text-xs text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-800 transition">
            Shelter Locator
          </a>
          <a href="/" className="text-xs text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-800 transition">
            Home
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 w-full flex flex-col space-y-6">
        {/* Analytics Header Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Active Hazard Zones</p>
              <p className="text-2xl font-bold text-white">{riskZones.length} Zones</p>
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Critical Warning Zones</p>
              <p className="text-2xl font-bold text-rose-400">{criticalCount} Severe</p>
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <Waves className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Est. Total Affected Population</p>
              <p className="text-2xl font-bold text-blue-400">{totalAffectedPop.toLocaleString()} People</p>
            </div>
          </div>
        </div>

        {/* Content Layout (Sidebar Controls + Map) */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Controls & Region Search Sidebar */}
          <div className="w-full lg:w-[380px] flex flex-col space-y-4">
            {/* Search Box */}
            <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl space-y-3 shadow-lg">
              <label className="block text-xs font-semibold text-gray-300">Search Region or District</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Sunamganj, Cox's Bazar, Sylhet..."
                  value={searchRegion}
                  onChange={(e) => setSearchRegion(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Disaster Filter Buttons */}
              <div className="space-y-1">
                <label className="block text-[11px] text-gray-400">Filter by Disaster Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {["ALL", "FLOOD", "CYCLONE", "STORM_SURGE"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedDisasterType(type)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition ${
                        selectedDisasterType === type
                          ? "bg-rose-600 text-white shadow-md shadow-rose-900/40"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk Zone Cards List */}
            <div className="flex-1 overflow-y-auto max-h-[480px] space-y-3 pr-1">
              <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                <span>Displaying <strong>{riskZones.length}</strong> Risk Zones</span>
                <button onClick={() => refetch()} className="text-rose-400 hover:underline flex items-center space-x-1">
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              {isLoading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 p-4 rounded-xl animate-pulse space-y-2">
                      <div className="h-4 bg-gray-800 rounded w-3/4" />
                      <div className="h-3 bg-gray-800 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              )}

              {isError && (
                <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-xl text-xs text-rose-300">
                  Failed to load risk zone data from Express backend API.
                </div>
              )}

              {riskZones.map((zone: any) => {
                const isSelected = selectedZoneId === zone._id;

                return (
                  <div
                    key={zone._id}
                    onClick={() => setSelectedZoneId(zone._id)}
                    className={`bg-gray-900/80 border p-4 rounded-xl transition cursor-pointer space-y-2 ${
                      isSelected
                        ? "border-rose-500 bg-rose-950/20 shadow-lg shadow-rose-950/50"
                        : "border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                        {zone.disasterType}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                          zone.riskLevel === "CRITICAL"
                            ? "bg-red-600"
                            : zone.riskLevel === "HIGH"
                            ? "bg-orange-500"
                            : zone.riskLevel === "MEDIUM"
                            ? "bg-yellow-500 text-black"
                            : "bg-emerald-600"
                        }`}
                      >
                        {zone.riskLevel} ({zone.riskScore}/100)
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white">{zone.title}</h3>
                    <p className="text-xs text-gray-400">{zone.district}, {zone.division}</p>

                    {zone.warningLevel && (
                      <p className="text-[11px] text-rose-400 font-medium bg-rose-950/30 p-1.5 rounded">
                        ⚠️ {zone.warningLevel}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-gray-800 pt-1.5">
                      <span>🌧️ Rain: {zone.rainfallMm24h || 0}mm</span>
                      <span>🌊 River: +{zone.riverWaterLevelMeters || 0}m</span>
                      <span>👥 {zone.affectedPopEstimate?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Map Panel */}
          <div className="flex-1 min-h-[500px] h-full flex flex-col">
            <RiskMap
              riskZones={riskZones}
              selectedZoneId={selectedZoneId}
              onSelectZone={(zone) => setSelectedZoneId(zone._id)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
