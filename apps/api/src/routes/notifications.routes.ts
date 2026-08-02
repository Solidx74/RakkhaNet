import { Router, Response } from "express";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";
import { getDB } from "../config/db";
import { emitRealTimeEvent } from "../config/socket";
import { NotificationSchema } from "@rakkhanet/shared-types";
import { authenticate, requireRole, AuthenticatedRequest } from "../middleware/auth.middleware";

const router = Router();

// ==========================================
// 1. Nodemailer Ethereal SMTP Setup
// ==========================================
let mailTransporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (mailTransporter) return mailTransporter;
  // Create Ethereal test account lazily
  const testAccount = await nodemailer.createTestAccount();
  mailTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  console.log(`[Email Transporter] Ethereal SMTP configured: ${testAccount.user}`);
  return mailTransporter;
}

async function sendEmailAlert(to: string, title: string, content: string) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"RakkhaNet System" <no-reply@rakkhanet.gov.bd>',
      to,
      subject: `🚨 EMERGENCY ALERT: ${title}`,
      text: content,
      html: `<div style="font-family: sans-serif; padding: 20px; border: 2px solid #e11d48; border-radius: 8px;">
        <h2 style="color: #e11d48;">RakkhaNet Disaster Alert System</h2>
        <p><strong>Message:</strong> ${content}</p>
        <hr style="border: 0; border-top: 1px solid #ccc;"/>
        <p style="font-size: 11px; color: #666;">This is an emergency automated alert broadcast from RakkhaNet.</p>
      </div>`,
    });
    console.log(`[Email Alert] Message sent: ${info.messageId}`);
    console.log(`[Email Alert] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    return true;
  } catch (err: any) {
    console.error(`[Email Alert] Failed to send: ${err.message}`);
    return false;
  }
}

// ==========================================
// 2. Mock SMS Provider
// ==========================================
interface ISMSProvider {
  sendSMS(phone: string, message: string): Promise<boolean>;
}

class MockSMSProvider implements ISMSProvider {
  async sendSMS(phone: string, message: string): Promise<boolean> {
    console.log(`[SMS Broadcast Mock] Sending SMS to ${phone}: ${message}`);
    return true;
  }
}
const smsProvider = new MockSMSProvider();

// ==========================================
// 3. POST /api/notifications/broadcast (Admin Alert Broadcast)
// ==========================================
router.post(
  "/broadcast",
  authenticate,
  requireRole(["ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetDistrict, title, message, channel } = req.body;
      if (!title || !message || !channel) {
        return res.status(400).json({ success: false, message: "Missing title, message, or channel" });
      }

      const db = getDB();

      // Retrieve all target citizens in target district (if specified)
      const userQuery: any = {};
      if (targetDistrict && targetDistrict !== "ALL") {
        userQuery.district = targetDistrict;
      }
      const targetUsers = await db.collection("users").find(userQuery).toArray();

      const newNotification = {
        recipientUserId: null, // null indicates public broadcast
        targetDistrict: targetDistrict || "ALL",
        title,
        message,
        channel,
        isRead: false,
        sentAt: new Date(),
      };

      // 1. Handle IN_APP / WEBSOCKET_BROADCAST (Save to DB + Socket.io emit)
      if (channel === "IN_APP" || channel === "WEBSOCKET_BROADCAST") {
        const result = await db.collection("notifications").insertOne(newNotification);
        const insertedNotify = {
          _id: result.insertedId.toString(),
          ...newNotification,
        };

        // Broadcast to all sockets
        emitRealTimeEvent("newNotificationAlert", insertedNotify);
      }

      // 2. Handle SMS channel dispatch
      if (channel === "SMS") {
        const smsPromises = targetUsers
          .filter((u) => u.phone)
          .map((u) => smsProvider.sendSMS(u.phone, `🚨 ${title}: ${message}`));
        await Promise.all(smsPromises);
      }

      // 3. Handle EMAIL channel dispatch
      if (channel === "EMAIL") {
        const emailPromises = targetUsers
          .filter((u) => u.email)
          .map((u) => sendEmailAlert(u.email, title, message));
        await Promise.all(emailPromises);
      }

      return res.status(201).json({
        success: true,
        message: `Alert broadcast sent successfully via ${channel} channel`,
        data: newNotification,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// ==========================================
// 4. GET /api/notifications (List user target alerts)
// ==========================================
router.get("/", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userDistrict = req.user?.district;
    const db = getDB();

    const query = {
      $or: [
        { targetDistrict: "ALL" },
        { targetDistrict: userDistrict },
        { recipientUserId: req.user?.id },
      ],
    };

    const alerts = await db
      .collection("notifications")
      .find(query)
      .sort({ sentAt: -1 })
      .toArray();

    const formatted = alerts.map((a) => ({
      ...a,
      _id: a._id.toString(),
    }));

    return res.json({
      success: true,
      data: {
        count: formatted.length,
        notifications: formatted,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// 5. PATCH /api/notifications/:id/read (Mark Read)
// ==========================================
router.patch("/:id/read", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid alert ID format" });
    }

    const db = getDB();
    const result = await db
      .collection("notifications")
      .findOneAndUpdate({ _id: new ObjectId(id) }, { $set: { isRead: true } }, { returnDocument: "after" });

    if (!result) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    return res.json({
      success: true,
      message: "Alert marked as read",
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
export { smsProvider, sendEmailAlert };
