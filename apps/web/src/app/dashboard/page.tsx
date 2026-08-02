"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useSocket } from "@/hooks/useSocket";
import { useAuthStore } from "@/stores/authStore";
import {
  HeartHandshake, AlertTriangle, ShieldCheck, ClipboardList,
  Search, Filter, RefreshCw, Layers, CheckCircle2, UserCheck, Package, BadgeAlert
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function CoordinatorDashboardPage() {
  const { token, user } = useAuthStore();
  const [requestsList, setRequestsList] = useState<any[]>([]);
  const [searchRegion, setSearchRegion] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [urgencyFilter, setUrgencyFilter] = useState("ALL");

  // Redirect if not auth/coordinator or admin (For prototype we show banner, but enforce)
  const isCoordinator = user?.role === "COORDINATOR" || user?.role === "ADMIN";

  // TanStack Query: Fetch relief requests initial list
  const { data: initialRequests, isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ["relief-requests-list", searchRegion, statusFilter, urgencyFilter],
    enabled: !!token,
    queryFn: async () => {
      const params: any = {};
      if (searchRegion) params.region = searchRegion;
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (urgencyFilter !== "ALL") params.urgency = urgencyFilter;

      const res = await axios.get(`${API_BASE_URL}/api/relief-requests`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      return res.data.data.requests;
    },
  });

  // Populate local state when query completes
  useEffect(() => {
    if (initialRequests) {
      setRequestsList(initialRequests);
    }
  }, [initialRequests]);

  // TanStack Query: Fetch Dashboard Summary Statistics
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ["dashboard-stats-metrics"],
    enabled: !!token,
    queryFn: async () => {
      const res = await axios.get(`${API_BASE_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data.data;
    },
  });

  // Socket.io Real-Time Updates Handlers
  const handleNewRequest = (newRequest: any) => {
    console.log("[Dashboard] Real-time new request received:", newRequest);
    setRequestsList((prev) => [newRequest, ...prev]);
    refetchStats();
  };

  const handleUpdatedRequest = (updated: any) => {
    console.log("[Dashboard] Real-time request update received:", updated);
    setRequestsList((prev) =>
      prev.map((item) => (item._id === updated._id ? updated : item))
    );
    refetchStats();
  };

  // Wire Socket hook
  useSocket({
    newReliefRequest: handleNewRequest,
    reliefRequestUpdated: handleUpdatedRequest,
  });

  // Handle workflow updates
  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/relief-requests/${requestId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Local state is updated automatically via the socket event
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleAssignVolunteer = async (requestId: string, volunteerEmail: string) => {
    try {
      await axios.patch(
        `${API_BASE_URL}/api/relief-requests/${requestId}/assign`,
        { assignedVolunteerId: volunteerEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err: any) {
      alert("Assignment failed: " + err.message);
    }
  };

  const stats = statsData?.reliefRequests || {
    statusCounts: { PENDING: 0, ASSIGNED: 0, IN_PROGRESS: 0, FULFILLED: 0, REJECTED: 0 },
    urgencyCounts: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    totalActive: 0,
    totalResolved: 0,
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0d1117]/90 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <a href="/" className="w-9 h-9 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-900/50">
            R
          </a>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              Relief<span className="text-rose-500">Dashboard</span>
            </h1>
            <p className="text-xs text-gray-400">Coordinators & Volunteers Live Command Center</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <a href="/relief-requests/new" className="text-xs text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-800 transition">
            Submit Request Form
          </a>
          <a href="/" className="text-xs text-gray-300 hover:text-white px-3 py-2 rounded-lg border border-gray-800 transition">
            Home
          </a>
        </div>
      </header>

      {!isCoordinator && (
        <div className="max-w-7xl mx-auto w-full px-6 mt-4">
          <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-xl text-xs text-rose-300">
            ⚠️ <strong>Restricted Access:</strong> Only logged-in Relief Coordinators and Admins can access and manage tasks on this dashboard. Please verify your role authentication.
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 w-full flex flex-col space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl flex items-center space-x-3">
            <ClipboardList className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-[10px] text-gray-400">Pending Requests</p>
              <p className="text-xl font-bold">{stats.statusCounts.PENDING}</p>
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl flex items-center space-x-3">
            <UserCheck className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-[10px] text-gray-400">Assigned / In Progress</p>
              <p className="text-xl font-bold">{stats.statusCounts.ASSIGNED + stats.statusCounts.IN_PROGRESS}</p>
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-[10px] text-gray-400">Resolved Requests</p>
              <p className="text-xl font-bold text-emerald-400">{stats.statusCounts.FULFILLED}</p>
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <div>
              <p className="text-[10px] text-gray-400">Critical Priority Alert</p>
              <p className="text-xl font-bold text-rose-400">{stats.urgencyCounts.CRITICAL}</p>
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Filters & Live Feed (8 columns) */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            {/* Filter bar */}
            <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by requester / details..."
                  value={searchRegion}
                  onChange={(e) => setSearchRegion(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                {/* Status selection */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="FULFILLED">Fulfilled</option>
                </select>

                {/* Urgency selection */}
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none"
                >
                  <option value="ALL">All Urgencies</option>
                  <option value="CRITICAL">Critical Only</option>
                  <option value="HIGH">High Only</option>
                  <option value="MEDIUM">Medium Only</option>
                  <option value="LOW">Low Only</option>
                </select>

                <button
                  onClick={() => {
                    refetchRequests();
                    refetchStats();
                  }}
                  className="p-2 bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg text-gray-400 hover:text-white"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Request Feed */}
            <div className="space-y-4">
              {requestsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-900 border border-gray-800 p-5 rounded-xl animate-pulse space-y-3">
                      <div className="h-4 bg-gray-800 rounded w-1/4" />
                      <div className="h-6 bg-gray-800 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : requestsList.length === 0 ? (
                <div className="bg-gray-900/60 border border-gray-800 p-8 rounded-xl text-center text-xs text-gray-400">
                  No active relief requests match your filter criteria.
                </div>
              ) : (
                requestsList.map((reqItem: any) => (
                  <div
                    key={reqItem._id}
                    className={`bg-gray-900/80 border p-5 rounded-xl space-y-3 transition ${
                      reqItem.urgency === "CRITICAL"
                        ? "border-rose-900/80 bg-rose-950/5"
                        : reqItem.urgency === "HIGH"
                        ? "border-amber-900/60"
                        : "border-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-850 text-gray-300 border border-gray-850">
                          {reqItem.category}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded text-white ${
                            reqItem.urgency === "CRITICAL"
                              ? "bg-red-600 animate-pulse"
                              : reqItem.urgency === "HIGH"
                              ? "bg-orange-500"
                              : reqItem.urgency === "MEDIUM"
                              ? "bg-yellow-500 text-black"
                              : "bg-emerald-600"
                          }`}
                        >
                          {reqItem.urgency} ({reqItem.aiPriorityScore}/100)
                        </span>
                      </div>

                      <span className="text-[10px] text-gray-400 font-mono">
                        Submitted: {new Date(reqItem.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-white">{reqItem.addressDetails}</h4>
                      <p className="text-xs text-gray-300 mt-1">{reqItem.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between border-t border-gray-850 pt-3 gap-3 text-xs text-gray-400">
                      <div>
                        <span>Requester: <strong>{reqItem.requesterName}</strong> ({reqItem.contactPhone}) • Affected: <strong>{reqItem.peopleCount}</strong></span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* Assignment dropdown */}
                        <select
                          onChange={(e) => handleAssignVolunteer(reqItem._id, e.target.value)}
                          className="bg-gray-800 border border-gray-700 text-[11px] rounded px-2 py-1 text-gray-300 focus:outline-none"
                          value={reqItem.assignedVolunteerId || ""}
                        >
                          <option value="">Assign Volunteer...</option>
                          <option value="volunteer1@rakkhanet.org">Volunteer Kareeb</option>
                          <option value="volunteer2@rakkhanet.org">Volunteer Nahian</option>
                          <option value="volunteer3@rakkhanet.org">Volunteer Rohan</option>
                        </select>

                        {/* Status updating */}
                        <select
                          value={reqItem.status}
                          onChange={(e) => handleUpdateStatus(reqItem._id, e.target.value)}
                          className="bg-gray-850 border border-gray-700 text-[11px] rounded px-2 py-1 text-gray-300 focus:outline-none font-bold"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="ASSIGNED">ASSIGNED</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="FULFILLED">FULFILLED</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Resource Stock Level Tracker (4 columns) */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <div className="bg-gray-900/90 border border-gray-800 p-5 rounded-2xl space-y-4 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 border-b border-gray-850 pb-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Warehouse Resource Inventory</span>
              </h3>

              {statsLoading ? (
                <div className="space-y-2 animate-pulse">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-6 bg-gray-800 rounded w-full" />
                  ))}
                </div>
              ) : !statsData?.resources || statsData.resources.length === 0 ? (
                <p className="text-xs text-gray-400 text-center">No warehouse resources currently registered.</p>
              ) : (
                <div className="space-y-3">
                  {statsData.resources.map((resItem: any, idx: number) => {
                    const isLow = resItem.availableStock < 100;
                    return (
                      <div key={idx} className="flex justify-between items-center bg-gray-800/50 p-2.5 rounded-lg border border-gray-750">
                        <div>
                          <p className="text-xs font-bold text-white">{resItem.category.replace("_", " ")}</p>
                          <p className="text-[10px] text-gray-400">Total Stock: {resItem.totalStock}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-extrabold ${isLow ? "text-rose-400" : "text-emerald-400"}`}>
                            {resItem.availableStock} available
                          </p>
                          {isLow && (
                            <span className="inline-flex items-center text-[8px] font-bold bg-rose-950 text-rose-400 px-1 py-0.5 rounded uppercase mt-0.5 border border-rose-900">
                              Low Stock Alert
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
