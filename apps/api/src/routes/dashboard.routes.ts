import { Router, Response } from "express";
import { getDB } from "../config/db";
import { authenticate, requireRole, AuthenticatedRequest } from "../middleware/auth.middleware";

const router = Router();

// GET /api/dashboard/stats
router.get(
  "/stats",
  authenticate,
  requireRole(["COORDINATOR", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = getDB();

      // 1. Count active relief requests by status
      const statusPipeline = [
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ];
      const statusResults = await db.collection("relief_requests").aggregate(statusPipeline).toArray();
      const statusCounts: Record<string, number> = {
        PENDING: 0,
        ASSIGNED: 0,
        IN_PROGRESS: 0,
        FULFILLED: 0,
        REJECTED: 0,
      };
      statusResults.forEach((item) => {
        statusCounts[item._id] = item.count;
      });

      // 2. Count requests by urgency level
      const urgencyPipeline = [
        {
          $group: {
            _id: "$urgency",
            count: { $sum: 1 },
          },
        },
      ];
      const urgencyResults = await db.collection("relief_requests").aggregate(urgencyPipeline).toArray();
      const urgencyCounts: Record<string, number> = {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      };
      urgencyResults.forEach((item) => {
        urgencyCounts[item._id] = item.count;
      });

      // 3. Count total items by resource category across all warehouses
      const resourcePipeline = [
        {
          $group: {
            _id: "$category",
            totalStock: { $sum: "$totalQuantity" },
            allocatedStock: { $sum: "$allocatedQuantity" },
          },
        },
      ];
      const resourceResults = await db.collection("resources").aggregate(resourcePipeline).toArray();
      const resourcesSummary = resourceResults.map((item) => ({
        category: item._id,
        totalStock: item.totalStock,
        allocatedStock: item.allocatedStock,
        availableStock: Math.max(0, item.totalStock - item.allocatedStock),
      }));

      // 4. Summarize active alerts and overall shelter counts
      const totalShelters = await db.collection("shelters").countDocuments({});
      const activeRiskZones = await db.collection("risk_zones").countDocuments({ isActive: true });

      return res.json({
        success: true,
        data: {
          reliefRequests: {
            statusCounts,
            urgencyCounts,
            totalActive: statusCounts.PENDING + statusCounts.ASSIGNED + statusCounts.IN_PROGRESS,
            totalResolved: statusCounts.FULFILLED + statusCounts.REJECTED,
          },
          resources: resourcesSummary,
          systemOverview: {
            totalShelters,
            activeRiskZones,
          },
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
