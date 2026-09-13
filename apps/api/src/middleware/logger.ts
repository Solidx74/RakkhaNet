import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `[${req.method}] ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`,
    );
  });
  next();
}
