import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { Auth } from "../auth.js";

// Augment Express's Request so downstream handlers get typed req.user access.
declare module "express-serve-static-core" {
  interface Request {
    user?: { id: string; email: string; role: string };
  }
}

/**
 * Protects a route using Better Auth's own session cookie -- this is the
 * check the Express API uses for its own routes. It is NOT JWT verification;
 * that's a separate concern for external services (see auth.ts).
 */
export function requireAuth(auth: Auth) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      // `role` exists because of the additionalFields config in auth.ts --
      // TypeScript doesn't know about it here without deeper type wiring, so
      // this cast is intentional, not sloppy.
      role: (session.user as { role?: string }).role ?? "citizen",
    };
    next();
  };
}

/** Chain after requireAuth() -- e.g. requireAuth(auth), requireRole("admin"). */
export function requireRole(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
