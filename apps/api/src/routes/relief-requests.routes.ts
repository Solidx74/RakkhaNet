import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { emitRealTimeEvent } from "../config/socket";
import {
  CreateReliefRequestDTO,
  UpdateReliefRequestDTO,
  calculatePriorityScore,
} from "@rakkhanet/shared-types";
import { authenticate, requireRole, AuthenticatedRequest } from "../middleware/auth.middleware";

const router = Router();

// ==========================================
// 1. POST /api/relief-requests (Citizen submits request - Public or Authed)
// ==========================================
router.post("/", async (req, res: Response) => {
  try {
    const parseResult = CreateReliefRequestDTO.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation error for relief request creation",
        errors: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    // Use rule-based keyword helper to score request priority
    const priorityResult = calculatePriorityScore(data.description, data.urgency);

    const newRequest = {
      ...data,
      urgency: data.urgency ?? priorityResult.urgency,
      aiPriorityScore: data.aiPriorityScore ?? priorityResult.priorityScore,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const db = getDB();
    const result = await db.collection("relief_requests").insertOne(newRequest);

    const insertedRequest = {
      _id: result.insertedId.toString(),
      ...newRequest,
    };

    // Emit Socket.io event to live dashboards
    emitRealTimeEvent("newReliefRequest", insertedRequest);

    return res.status(201).json({
      success: true,
      message: "Relief request submitted successfully",
      data: insertedRequest,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. GET /api/relief-requests (List - Coordinator / Admin only)
// ==========================================
router.get(
  "/",
  authenticate,
  requireRole(["COORDINATOR", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, urgency, category, region } = req.query;
      const db = getDB();

      const query: any = {};
      if (status) query.status = String(status);
      if (urgency) query.urgency = String(urgency);
      if (category) query.category = String(category);

      if (region) {
        const regex = new RegExp(String(region), "i");
        query.$or = [
          { addressDetails: regex },
          { requesterName: regex },
        ];
      }

      const requests = await db
        .collection("relief_requests")
        .find(query)
        .sort({ aiPriorityScore: -1, createdAt: -1 })
        .toArray();

      const formatted = requests.map((r) => ({
        ...r,
        _id: r._id.toString(),
      }));

      return res.json({
        success: true,
        data: {
          count: formatted.length,
          requests: formatted,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// 3. GET /api/relief-requests/:id (Fetch Details - Coordinator / Admin only)
// ==========================================
router.get(
  "/:id",
  authenticate,
  requireRole(["COORDINATOR", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid request ID format" });
      }

      const db = getDB();
      const requestRecord = await db.collection("relief_requests").findOne({ _id: new ObjectId(id) });

      if (!requestRecord) {
        return res.status(404).json({ success: false, message: "Relief request not found" });
      }

      return res.json({
        success: true,
        data: {
          ...requestRecord,
          _id: requestRecord._id.toString(),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// 4. PATCH /api/relief-requests/:id/assign (Assign Volunteer/Shelter - Coordinator / Admin only)
// ==========================================
router.patch(
  "/:id/assign",
  authenticate,
  requireRole(["COORDINATOR", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid request ID format" });
      }

      const { assignedVolunteerId, assignedShelterId } = req.body;
      const updates: any = {
        updatedAt: new Date(),
        status: "ASSIGNED",
      };

      if (assignedVolunteerId) updates.assignedVolunteerId = assignedVolunteerId;
      if (assignedShelterId) updates.assignedShelterId = assignedShelterId;

      const db = getDB();
      const result = await db
        .collection("relief_requests")
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updates },
          { returnDocument: "after" }
        );

      if (!result) {
        return res.status(404).json({ success: false, message: "Relief request not found" });
      }

      const updatedRequest = {
        ...result,
        _id: result._id.toString(),
      };

      // Emit Socket.io update event
      emitRealTimeEvent("reliefRequestUpdated", updatedRequest);

      return res.json({
        success: true,
        message: "Relief request assigned successfully",
        data: updatedRequest,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// 5. PATCH /api/relief-requests/:id/status (Workflow state - Coordinator / Admin only)
// ==========================================
router.patch(
  "/:id/status",
  authenticate,
  requireRole(["COORDINATOR", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid request ID format" });
      }

      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ success: false, message: "Workflow status is required" });
      }

      const db = getDB();
      const result = await db
        .collection("relief_requests")
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: { status, updatedAt: new Date() } },
          { returnDocument: "after" }
        );

      if (!result) {
        return res.status(404).json({ success: false, message: "Relief request not found" });
      }

      const updatedRequest = {
        ...result,
        _id: result._id.toString(),
      };

      // Emit Socket.io update event
      emitRealTimeEvent("reliefRequestUpdated", updatedRequest);

      return res.json({
        success: true,
        message: "Relief request status updated successfully",
        data: updatedRequest,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
