"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { HeartHandshake, MapPin, CheckCircle2, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SubmitReliefRequestPage() {
  const [formData, setFormData] = useState({
    requesterName: "",
    contactPhone: "",
    category: "FOOD",
    urgency: "MEDIUM", // maps to user severity input
    peopleCount: 1,
    description: "",
    addressDetails: "",
  });

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState("Locating...");
  const [submitStatus, setSubmitStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Request location on load
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus("Geolocation not supported by browser");
      // default
      setCoords({ lat: 23.6850, lng: 90.3563 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoStatus("Location detected successfully");
      },
      () => {
        setGeoStatus("Location access denied. Using general coordinates.");
        setCoords({ lat: 22.35, lng: 91.80 }); // Default to Chattogram
      }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coords) {
      alert("Still acquiring location. Please wait.");
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const payload = {
        ...formData,
        peopleCount: Number(formData.peopleCount),
        location: {
          type: "Point",
          coordinates: [coords.lng, coords.lat], // [longitude, latitude]
        },
      };

      const res = await axios.post(`${API_BASE_URL}/api/relief-requests`, payload);

      if (res.data.success) {
        setSubmitStatus({
          success: true,
          message: "Your relief request was received successfully! Local coordinators and volunteers have been notified.",
        });
        // reset form
        setFormData({
          requesterName: "",
          contactPhone: "",
          category: "FOOD",
          urgency: "MEDIUM",
          peopleCount: 1,
          description: "",
          addressDetails: "",
        });
      }
    } catch (err: any) {
      setSubmitStatus({
        success: false,
        message: err.response?.data?.message || "Failed to submit request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Rakkha<span className="text-emerald-500">Net</span> Help Request
            </h1>
            <p className="text-xs text-gray-400">Emergency Aid Coordination Platform</p>
          </div>
        </div>

        <a href="/" className="text-xs text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-800 transition flex items-center space-x-1">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </a>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl mx-auto px-4 py-8 w-full flex flex-col justify-center">
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="flex items-center space-x-3 border-b border-gray-850 pb-4">
            <div className="w-10 h-10 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-500">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Submit Request for Emergency Aid</h2>
              <p className="text-xs text-gray-400">Request food, water, medical supply, or rescue help</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Abul Kalam"
                  value={formData.requesterName}
                  onChange={(e) => setFormData({ ...formData, requesterName: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">Contact Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 01712345678"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">Help Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="FOOD">Dry Food Supplies</option>
                  <option value="WATER">Drinking Water</option>
                  <option value="MEDICAL">Medical Emergency Aid</option>
                  <option value="SHELTER_RESCUE">Emergency Rescue & Evacuation</option>
                  <option value="CLOTHING">Blankets & Clothing</option>
                  <option value="OTHER">Other Relief Support</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">Severity Level</label>
                <select
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="LOW">Low (Not immediate danger)</option>
                  <option value="MEDIUM">Medium (Requires attention soon)</option>
                  <option value="HIGH">High (Needs relief today)</option>
                  <option value="CRITICAL">Critical (Immediate rescue/life danger)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-300">No. of Affected People</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.peopleCount}
                  onChange={(e) => setFormData({ ...formData, peopleCount: Number(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 flex items-center space-x-2 text-[10px] text-gray-400 mt-5">
                <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0 animate-bounce" />
                <span className="truncate">{geoStatus}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">Location Address Details</label>
              <input
                type="text"
                required
                placeholder="e.g. Village: Patharghata, Ward 3 near central mosque"
                value={formData.addressDetails}
                onChange={(e) => setFormData({ ...formData, addressDetails: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">Detail Request Description</label>
              <textarea
                required
                rows={3}
                placeholder="Describe your emergency needs (keywords like child, elder, drown, starve help AI score priority)..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow-lg transition flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Request...</span>
                </>
              ) : (
                <span>Submit Aid Request</span>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
