import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db";
import { CreateResourceDTO, UpdateResourceDTO } from "@rakkhanet/shared-types";
import { authenticate, requireRole, AuthenticatedRequest } from "../middleware/auth.middleware";

const router = Router();

// ==========================================
// 1. GET /api/resources (List shelter resources - Authed)
// ==========================================
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { shelterId } = req.query;
    if (!shelterId) {
      return res.status(400).json({ success: false, message: "shelterId query parameter is required" });
    }

    const db = getDB();
    const resources = await db
      .collection("resources")
      .find({ shelterId: String(shelterId) })
      .toArray();

    const formatted = resources.map((r) => ({
      ...r,
      _id: r._id.toString(),
    }));

    return res.json({
      success: true,
      data: {
        count: formatted.length,
        resources: formatted,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 2. POST /api/resources (Create resource - Coordinator / Admin only)
// ==========================================
router.post(
  "/",
  authenticate,
  requireRole(["COORDINATOR", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parseResult = CreateResourceDTO.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation error for resource creation",
          errors: parseResult.error.errors,
        });
      }

      const data = parseResult.data;
      const newResource = {
        ...data,
        updatedBy: req.user?.email || "ADMIN",
        lastRestockedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const db = getDB();
      const result = await db.collection("resources").insertOne(newResource);

      return res.status(201).json({
        success: true,
        message: "Resource item registered successfully",
        data: {
          _id: result.insertedId.toString(),
          ...newResource,
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// 3. PATCH /api/resources/:id (Update - Coordinator / Admin only)
// ==========================================
router.patch(
  "/:id",
  authenticate,
  requireRole(["COORDINATOR", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid resource ID format" });
      }

      const parseResult = UpdateResourceDTO.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation error for resource update",
          errors: parseResult.error.errors,
        });
      }

      const updates = {
        ...parseResult.data,
        updatedBy: req.user?.email || "ADMIN",
        lastRestockedAt: new Date(),
        updatedAt: new Date(),
      };

      const db = getDB();
      const result = await db
        .collection("resources")
        .findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updates },
          { returnDocument: "after" }
        );

      if (!result) {
        return res.status(404).json({ success: false, message: "Resource item not found" });
      }

      return res.json({
        success: true,
        message: "Resource item parameters updated",
        data: {
          ...result,
          _id: result._id.toString(),
        },
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// 4. DELETE /api/resources/:id (Delete - Coordinator / Admin only)
// ==========================================
router.delete(
  "/:id",
  authenticate,
  requireRole(["COORDINATOR", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid resource ID format" });
      }

      const db = getDB();
      const result = await db.collection("resources").deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ success: false, message: "Resource item not found" });
      }

      return res.json({
        success: true,
        message: "Resource item deleted successfully",
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
