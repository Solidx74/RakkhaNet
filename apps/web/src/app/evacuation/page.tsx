"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Navigation, MapPin, Phone, ShieldAlert, ArrowRight, RefreshCw, CheckCircle2, Clock, Footprints } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const EvacuationMap = dynamic(() => import("@/components/map/EvacuationMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[480px] bg-gray-900 border border-gray-800 rounded-xl flex flex-col items-center justify-center text-gray-400 space-y-3">
      <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      <p className="text-sm font-medium">Calculating Evacuation Route...</p>
    </div>
  ),
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function EvacuationGuidancePage() {
  const searchParams = useSearchParams();
  const targetShelterId = searchParams.get("shelterId");
  const { token } = useAuthStore();

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Auto-detect geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLocating(false);
      },
      (error) => {
        setGeoError("Location access denied. Using default emergency origin coordinates.");
        // Fallback to Chattogram coordinates for demo
        setUserLocation({ lat: 22.35, lng: 91.80 });
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // TanStack Query: Fetch Evacuation Route
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["evacuation-route", userLocation, targetShelterId],
    enabled: !!userLocation,
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const params: any = {
        fromLat: userLocation!.lat,
        fromLng: userLocation!.lng,
      };
      if (targetShelterId) {
        params.shelterId = targetShelterId;
      }

      const res = await axios.get(`${API_BASE_URL}/api/evacuation-route`, { params, headers });
      return res.data.data;
    },
  });

  const routeData = data;
  const shelter = routeData?.destinationShelter;

  return (
    <div className="flex flex-col min-h-screen bg-[#0d1117] text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0d1117]/90 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <a href="/" className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-emerald-900/50">
            R
          </a>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Evacuation<span className="text-emerald-500">Guidance</span>
            </h1>
            <p className="text-xs text-gray-400">Step-by-Step Safe Route Navigation</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a href="/shelters" className="text-xs text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-800 transition">
            Shelter Locator
          </a>
          <a href="/risk-map" className="text-xs text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-800 transition">
            Risk Map
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 w-full flex flex-col space-y-6">
        {/* Network & Geolocation Alerts */}
        {geoError && (
          <div className="bg-amber-950/40 border border-amber-800 p-3 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{geoError}</span>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar / Evacuation Instructions Panel */}
          <div className="w-full lg:w-[420px] flex flex-col space-y-4">
            {/* Route Summary Overview Card */}
            {isLoading || isLocating ? (
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl animate-pulse space-y-3">
                <div className="h-4 bg-gray-800 rounded w-1/2" />
                <div className="h-8 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-full" />
              </div>
            ) : isError || !routeData ? (
              <div className="bg-rose-950/40 border border-rose-800 p-6 rounded-xl text-xs text-rose-300 space-y-2">
                <p className="font-bold text-sm">Evacuation Route Error</p>
                <p>Failed to calculate route to target shelter. Make sure backend Express API is running.</p>
                <button onClick={() => refetch()} className="px-3 py-1.5 bg-rose-900 text-rose-200 rounded font-semibold text-xs mt-2">
                  Retry Calculation
                </button>
              </div>
            ) : (
              <div className="bg-gray-900/90 border border-gray-800 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                      routeData.routeType === "road"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                        : "bg-amber-950 text-amber-400 border border-amber-800"
                    }`}
                  >
                    {routeData.routeType === "road" ? "✓ OSRM Road-Aligned Route" : "⚠️ Direct Safe Buffer (Fallback)"}
                  </span>

                  <button onClick={() => refetch()} className="text-gray-400 hover:text-white text-xs">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Destination Shelter Header */}
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    DESTINATION SHELTER
                  </span>
                  <h2 className="text-xl font-extrabold text-white mt-1">{shelter.name}</h2>
                  <p className="text-xs text-gray-400">{shelter.address}, {shelter.upazila}, {shelter.district}</p>
                </div>

                {/* Stat Pills */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-gray-800/70 border border-gray-700/50 p-3 rounded-xl flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Total Distance</p>
                      <p className="text-base font-bold text-white">{(routeData.distanceMeters / 1000).toFixed(2)} km</p>
                    </div>
                  </div>

                  <div className="bg-gray-800/70 border border-gray-700/50 p-3 rounded-xl flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Est. Evacuation Time</p>
                      <p className="text-base font-bold text-white">{routeData.durationMinutes} min</p>
                    </div>
                  </div>
                </div>

                {/* Fallback Warning Notice if Applicable */}
                {routeData.warnings && routeData.warnings.length > 0 && (
                  <div className="bg-amber-950/40 border border-amber-800/60 p-3 rounded-xl text-xs text-amber-300 space-y-1">
                    <p className="font-bold flex items-center space-x-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>Approximate Route Notice</span>
                    </p>
                    <p className="text-[11px] text-amber-300/90">{routeData.warnings[0]}</p>
                  </div>
                )}

                {/* Shelter Emergency Contact */}
                <div className="border-t border-gray-800 pt-3 flex items-center justify-between text-xs text-gray-400">
                  <div>
                    <p className="text-[10px]">Shelter Contact</p>
                    <p className="font-semibold text-white">{shelter.contactPerson?.name}</p>
                  </div>
                  <a href={`tel:${shelter.contactPerson?.phone}`} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold flex items-center space-x-1 transition shadow">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Hotline</span>
                  </a>
                </div>
              </div>
            )}

            {/* Step-by-Step Navigation List */}
            {routeData?.steps && (
              <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-2xl space-y-3 flex-1 overflow-y-auto max-h-[380px]">
                <h3 className="text-xs font-bold text-white flex items-center space-x-2 border-b border-gray-800 pb-2">
                  <Footprints className="w-4 h-4 text-emerald-400" />
                  <span>Step-by-Step Navigation Instructions</span>
                </h3>

                <div className="space-y-3">
                  {routeData.steps.map((step: any, idx: number) => (
                    <div key={idx} className="flex items-start space-x-3 text-xs text-gray-300">
                      <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center font-bold text-emerald-400 text-[10px] flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-0.5">
                        <p className="font-medium text-white">{step.instruction}</p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          {step.distanceMeters}m • ~{Math.ceil(step.durationSeconds / 60)} min
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Main Map Container */}
          <div className="flex-1 min-h-[500px] h-full flex flex-col">
            {userLocation && routeData && (
              <EvacuationMap
                userLocation={userLocation}
                shelterLocation={{
                  lat: shelter.location.coordinates[1],
                  lng: shelter.location.coordinates[0],
                  name: shelter.name,
                  address: shelter.address,
                }}
                routeGeometry={routeData.geometry}
                routeType={routeData.routeType}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
