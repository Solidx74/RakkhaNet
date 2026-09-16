# RakkhaNet — Project Context

AI-powered disaster response and relief coordination platform for flood/cyclone-
prone Bangladesh. Read this before generating code anywhere in this repo.

## Stack

- **Frontend** (`apps/web`): Next.js 14+ App Router, TypeScript, Tailwind CSS,
  shadcn/ui, react-toastify, lucide-react, @ducanh2912/next-pwa.
- **Backend** (`apps/api`): Express.js, TypeScript, ESM (`NodeNext` module
  resolution — relative imports need explicit `.js` extensions, e.g.
  `from "./connection.js"`, even though the source files are `.ts`).
- **Database**: MongoDB, **native `mongodb` driver only — no Mongoose, no ODM.**
  Validation happens at the API boundary with Zod, not in the database layer.
- **Shared types** (`packages/shared-types`): TypeScript types + Zod schemas
  for all 7 collections. Both apps import from here — never redefine a shape
  that already exists in this package.
- **Auth**: Better Auth hosted on `apps/api` (MongoDB adapter), consumed by
  `apps/web` via the Better Auth React client. JWT plugin issues tokens for
  service-to-service calls (e.g. the future AI microservice) — it is **not**
  how `apps/api`'s own routes check who's logged in; that uses Better Auth's
  session cookie directly via `requireAuth`/`requireRole` middleware.
- **Geospatial**: MongoDB `2dsphere` indexes, `$near` queries, GeoJSON.
  **Coordinate order is always `[longitude, latitude]`**, not `[lat, lng]`.
- **Offline**: app-shell caching via `@ducanh2912/next-pwa` (Phase 1). Deeper
  IndexedDB data caching + offline write-queue + SMS gateway are Phase 2/3 —
  see the offline strategy doc for the full tiering.

## Folder Layout

apps/web/src/app/<feature>/page.tsx -- one folder per feature route
apps/web/src/components/layout/ -- Navbar, nav config, shared chrome
apps/web/src/components/ui/ -- shadcn/ui components (generated, don't hand-edit)
apps/web/src/lib/ -- auth-client.ts, utils.ts

apps/api/src/index.ts -- app bootstrap
apps/api/src/auth.ts -- Better Auth config
apps/api/src/db/connection.ts -- MongoClient singleton
apps/api/src/db/seed.ts -- sample data
apps/api/src/middleware/ -- requireAuth, requireRole, errorHandler, logger
apps/api/src/routes/ -- one router per feature, added as each phase lands

packages/shared-types/src/common.ts -- GeoJSON, role enum, ObjectId schema
packages/shared-types/src/<collection>.ts -- Create/full/Update schemas + types

## Non-Negotiable Conventions

1. Every API input is validated with a Zod schema from `shared-types`.
2. Every mutating route is behind `requireAuth`, admin-only routes also `requireRole`.
3. Async route handlers wrapped in `asyncHandler` so errors reach `errorHandler`.
4. `errorHandler` mounted last. Better Auth's handler mounted before `express.json()`.
5. Any collection with a GeoJSON field gets a `2dsphere` index immediately.
6. Feature code stays in its own folder — promote shared logic to `shared-types`
   or `lib/` instead of reaching across features.

## Before Calling Anything Done

- `npx tsc --noEmit` passes in whichever package you touched.
- If you touched a collection's shape, update its Zod schema first.

## Build Order

Foundation → Shelter Locator + Risk Map → Evacuation Guidance + Relief
Dashboard + AI → Integration/Testing/Deploy. Evacuation Guidance depends on
the Shelter Locator's "nearby" API — don't build it first.
