import { Request, Response, NextFunction } from "express";

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

const limitMap = new Map<string, RateLimitInfo>();

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "anonymous";
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    const record = limitMap.get(key);

    if (!record || now > record.resetTime) {
      // Initialize or reset limit
      limitMap.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      res.setHeader("X-RateLimit-Limit", options.maxRequests);
      res.setHeader("X-RateLimit-Remaining", options.maxRequests - 1);
      res.setHeader("X-RateLimit-Reset", Math.ceil((now + options.windowMs) / 1000));
      return next();
    }

    if (record.count >= options.maxRequests) {
      res.setHeader("X-RateLimit-Limit", options.maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));
      return res.status(429).json({
        success: false,
        message: options.message,
      });
    }

    record.count += 1;
    res.setHeader("X-RateLimit-Limit", options.maxRequests);
    res.setHeader("X-RateLimit-Remaining", options.maxRequests - record.count);
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));
    return next();
  };
}

// 15-minute window for auth routes
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many authentication attempts. Please try again after 15 minutes.",
});

// 15-minute window for broadcast alerts
export const broadcastLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many broadcasts sent. Please try again after 15 minutes to prevent alert spam.",
});

// 10-minute window for risk zones refresh
export const refreshLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
  message: "Too many live weather refresh queries. Caching prevents abuse, please retry in 10 minutes.",
});
