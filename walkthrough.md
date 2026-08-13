# RakkhaNet Final Walkthrough

RakkhaNet implements the six modules described in [implementation.md](./implementation.md): risk mapping, shelter discovery, evacuation routing, relief coordination, alerts, and role-based authentication.

## Sprint 7 completion

- Added bounded Zod payload validation for GeoJSON, text, reports, notifications, and photo URLs.
- Added production startup validation for MongoDB, JWT, and frontend-origin configuration; production CORS now uses the explicit `CLIENT_URL` only.
- Added in-memory route rate limits for sign-up/sign-in, alert broadcasts, and weather refreshes.
- Added auth and resource RBAC integration tests. Volunteers can view resources but cannot modify inventory, matching the architecture role table.
- Added an isolated Playwright E2E harness: it launches a test-only API on port 5001 against MongoDB Memory Server, seeds a shelter, risk zone, and ADMIN account, injects admin browser state where required, and tears down the API/database process tree after each run. The five browser flows no longer depend on Atlas or production seed scripts.
- Pinned `react-leaflet` to v4.2.1, which is compatible with the application’s React 18 runtime. Version 5 requires React 19 and caused map pages to fail at runtime.
- Added Docker/Railway/Vercel deployment configuration. The API Docker image uses Node 22 because this repository pins pnpm 11.

## Verification

- `pnpm build` passes.
- `pnpm --filter @rakkhanet/api test` passes: 25 tests in 7 suites.
- `pnpm test:e2e` passes: 5 browser specs, including a consecutive second run that confirms teardown isolation.

## Deployment checklist

Provision MongoDB Atlas and create Vercel/Railway (or Render for AI) projects. Configure `MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CLIENT_URL`, `OPENWEATHER_API_KEY` (optional), `AI_SERVICE_URL`, `NEXT_PUBLIC_API_URL`, and `NEXT_PUBLIC_SOCKET_URL` on the appropriate hosts. Set `CLIENT_URL` exactly to the Vercel production origin.

Before deployment, add the `apps/ai-service` source directory to version control. It is currently present locally but not tracked by Git, so its Dockerfile and FastAPI service would not be available to a remote deployment from the repository.
