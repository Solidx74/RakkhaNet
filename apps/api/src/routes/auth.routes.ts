import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDB } from "../config/db";
import { SignUpDTO, SignInDTO } from "@rakkhanet/shared-types";
import { authenticate, AuthenticatedRequest } from "../middleware/auth.middleware";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "rakkhanet_super_secret_jwt_key_2026";

// POST /api/auth/sign-up
router.post("/sign-up", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = SignUpDTO.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: parseResult.error.errors,
      });
    }

    const data = parseResult.data;
    const db = getDB();

    const existingUser = await db.collection("users").findOne({
      $or: [{ email: data.email }, { phone: data.phone }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email or phone number already exists",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const newUser = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role || "CITIZEN",
      division: data.division,
      district: data.district,
      upazila: data.upazila,
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);
    const userId = result.insertedId.toString();

    const token = jwt.sign(
      { id: userId, email: newUser.email, role: newUser.role, district: newUser.district },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("rakkhanet_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "User account created successfully",
      data: {
        token,
        user: {
          id: userId,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          district: newUser.district,
          upazila: newUser.upazila,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/sign-in
router.post("/sign-in", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = SignInDTO.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors: parseResult.error.errors,
      });
    }

    const { email, password } = parseResult.data;
    const db = getDB();

    const user = await db.collection("users").findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password credentials",
      });
    }

    const userId = user._id.toString();
    const token = jwt.sign(
      { id: userId, email: user.email, role: user.role, district: user.district },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("rakkhanet_jwt", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      message: "Authenticated successfully",
      data: {
        token,
        user: {
          id: userId,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          district: user.district,
          upazila: user.upazila,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/auth/sign-out
router.post("/sign-out", authenticate, (_req: AuthenticatedRequest, res: Response) => {
  res.clearCookie("rakkhanet_jwt");
  return res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/me
router.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = getDB();
    const { ObjectId } = require("mongodb");
    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user?.id) });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        division: user.division,
        district: user.district,
        upazila: user.upazila,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
