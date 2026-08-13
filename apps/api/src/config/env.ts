const requiredProductionVariables = ["MONGODB_URI", "MONGODB_DB_NAME", "JWT_SECRET", "CLIENT_URL"] as const;

/** Reject insecure defaults before the production HTTP server is started. */
export function validateEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = requiredProductionVariables.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`[Configuration] Missing required production environment variables: ${missing.join(", ")}`);
  }
}
