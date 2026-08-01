"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { MapPin, Navigation, Search, Filter, Phone, Droplets, Zap, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

// Dynamically import Leaflet Map component with SSR disabled
const ShelterMap = dynamic(() => import("@/components/map/ShelterMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center text-gray-400 space-y-3">
      <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      <p className="text-sm font-medium">Initializing Interactive Leaflet Map...</p>
    </div>
  ),
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const BANGLADESH_DISTRICTS = [
  "All Districts",
  "Chattogram",
  "Cox's Bazar",
  "Bhola",
  "Sunamganj",
  "Sylhet",
  "Feni",
  "Satkhira",
  "Khulna",
  "Barishal",
  "Dhaka",
  "Noakhali",
  "Barguna",
  "Patuakhali",
  "Kurigram",
  "Sirajganj",
  "Chandpur",
];

export default function ShelterLocatorPage() {
  const { token } = useAuthStore();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [minAvailableCap, setMinAvailableCap] = useState(0);
  const [maxDistanceMeters, setMaxDistanceMeters] = useState(25000); // 25 km
  const [selectedShelterId, setSelectedShelterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Handle Geolocation Detection
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        setGeoError(error.message || "Failed to retrieve location");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Auto-trigger geolocation on page mount
  useEffect(() => {
    handleDetectLocation();
  }, []);

  // TanStack Query: Fetch Nearby Shelters or List Shelters
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["shelters", userLocation, selectedDistrict, minAvailableCap, maxDistanceMeters],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      if (userLocation) {
        // Query nearby endpoint
        const params: any = {
          lat: userLocation.lat,
          lng: userLocation.lng,
          maxDistance: maxDistanceMeters,
        };
        if (selectedDistrict !== "All Districts") {
          params.district = selectedDistrict;
        }
        if (minAvailableCap > 0) {
          params.minCapacity = minAvailableCap;
        }

        const res = await axios.get(`${API_BASE_URL}/api/shelters/nearby`, { params, headers });
        return res.data.data.shelters;
      } else {
        // Query general list endpoint
        const params: any = {};
        if (selectedDistrict !== "All Districts") {
          params.district = selectedDistrict;
        }
        if (minAvailableCap > 0) {
          params.minAvailable = minAvailableCap;
        }

        const res = await axios.get(`${API_BASE_URL}/api/shelters`, { params, headers });
        return res.data.data.shelters;
      }
    },
  });

  const shelters = data || [];

  // Filter shelters by search query
  const filteredShelters = shelters.filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0d1117]/90 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <a href="/" className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/50">
            R
          </a>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Shelter<span className="text-emerald-500">Locator</span>
            </h1>
            <p className="text-xs text-gray-400">RakkhaNet Emergency Shelter Discovery</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center space-x-2 transition shadow-md disabled:opacity-50"
          >
            <Navigation className={`w-4 h-4 ${isLocating ? "animate-spin" : ""}`} />
            <span>{isLocating ? "Locating..." : userLocation ? "Update Location" : "Detect My Location"}</span>
          </button>

          <a href="/" className="text-xs text-gray-400 hover:text-white px-3 py-2 rounded-lg border border-gray-800 transition">
            Home
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 w-full flex flex-col lg:flex-row gap-6">
        {/* Left Sidebar / Filters & Shelter Cards List */}
        <div className="w-full lg:w-[420px] flex flex-col space-y-4">
          {/* Geolocation Status Alert */}
          {userLocation ? (
            <div className="bg-emerald-950/40 border border-emerald-800/60 p-3 rounded-xl flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Nearby Mode Active: <strong>[{userLocation.lat.toFixed(3)}, {userLocation.lng.toFixed(3)}]</strong></span>
              </div>
              <span className="text-[10px] bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">2dsphere $near</span>
            </div>
          ) : (
            <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Location disabled. Showing all shelters. Click "Detect My Location" for nearest sorting.</span>
            </div>
          )}

          {geoError && (
            <div className="bg-rose-950/40 border border-rose-800/60 p-2.5 rounded-xl text-xs text-rose-300">
              ⚠️ {geoError}
            </div>
          )}

          {/* Controls & Search Filter Box */}
          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl space-y-3 shadow-lg">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search shelter name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">District</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  {BANGLADESH_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Min Available Space</label>
                <input
                  type="number"
                  placeholder="Min capacity"
                  value={minAvailableCap || ""}
                  onChange={(e) => setMinAvailableCap(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {userLocation && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Search Radius</span>
                  <span className="font-semibold text-emerald-400">{maxDistanceMeters / 1000} km</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="100000"
                  step="5000"
                  value={maxDistanceMeters}
                  onChange={(e) => setMaxDistanceMeters(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Shelters List Section */}
          <div className="flex-1 overflow-y-auto max-h-[500px] space-y-3 pr-1">
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>Found <strong>{filteredShelters.length}</strong> shelters</span>
              <button onClick={() => refetch()} className="text-emerald-400 hover:underline flex items-center space-x-1">
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
                    <div className="h-2 bg-gray-800 rounded w-full mt-2" />
                  </div>
                ))}
              </div>
            )}

            {isError && (
              <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-xl text-xs text-rose-300">
                Failed to load shelters from server. Check backend API connection.
              </div>
            )}

            {!isLoading && filteredShelters.length === 0 && (
              <div className="bg-gray-900/60 border border-gray-800 p-6 rounded-xl text-center text-xs text-gray-400">
                No emergency shelters match your search criteria.
              </div>
            )}

            {filteredShelters.map((shelter: any) => {
              const occPct = shelter.occupancyPercentage ?? Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
              const availCap = shelter.availableCapacity ?? Math.max(0, shelter.capacity - shelter.currentOccupancy);
              const isSelected = selectedShelterId === shelter._id;

              return (
                <div
                  key={shelter._id}
                  onClick={() => setSelectedShelterId(shelter._id)}
                  className={`bg-gray-900/80 border p-4 rounded-xl transition cursor-pointer space-y-2.5 ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/50"
                      : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        {shelter.code || "SHELTER"}
                      </span>
                      <h3 className="font-bold text-sm text-white mt-1">{shelter.name}</h3>
                      <p className="text-xs text-gray-400">{shelter.address}, {shelter.upazila}, {shelter.district}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        shelter.status === "FULL"
                          ? "bg-rose-950 text-rose-400 border border-rose-800"
                          : occPct >= 80
                          ? "bg-amber-950 text-amber-400 border border-amber-800"
                          : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      }`}
                    >
                      {shelter.status}
                    </span>
                  </div>

                  {shelter.distanceMeters !== undefined && (
                    <div className="text-[11px] text-blue-400 font-medium">
                      📍 Distance: {(shelter.distanceMeters / 1000).toFixed(1)} km
                    </div>
                  )}

                  {/* Occupancy Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Occupancy ({occPct}%)</span>
                      <span>{shelter.currentOccupancy} / {shelter.capacity}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${occPct}%`,
                          backgroundColor: shelter.status === "FULL" ? "#f43f5e" : occPct >= 80 ? "#f59e0b" : "#10b981",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                      <span>Free Spaces: <strong className="text-white">{availCap}</strong></span>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-800 text-gray-400">
                    <span>Contact: {shelter.contactPerson.name}</span>
                    <a href={`tel:${shelter.contactPerson.phone}`} className="text-emerald-400 font-bold hover:underline flex items-center space-x-1">
                      <Phone className="w-3 h-3" />
                      <span>{shelter.contactPerson.phone}</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Main Panel / Full Interactive Map */}
        <div className="flex-1 min-h-[500px] h-full flex flex-col">
          <ShelterMap
            shelters={filteredShelters}
            userLocation={userLocation}
            selectedShelterId={selectedShelterId}
            onSelectShelter={(shelter) => setSelectedShelterId(shelter._id)}
          />
        </div>
      </main>
    </div>
  );
}
