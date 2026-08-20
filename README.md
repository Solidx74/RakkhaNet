# RakkhaNet

**AI-Assisted Disaster Response & Relief Coordination for Bangladesh**

RakkhaNet is a full-stack, role-based platform that unifies flood/cyclone risk visualization, evacuation guidance, shelter location, and relief coordination into a single system. It brings together AI-assisted risk scoring, live geospatial search, and real-time coordination tools to help citizens, volunteers, NGOs, and government responders answer three questions in one place: *How dangerous is my area? Where should I go? Who can help me?*

`Next.js` `Express` `MongoDB` `Socket.io` `FastAPI` `Docker`

**🔗 Live App**: [rakkhanet.vercel.app](https://rakkhanet.vercel.app) · **API**: [rakkhanet-api.onrender.com](https://rakkhanet-api.onrender.com/api/health) · **AI Service**: [rakkhanet-ai.onrender.com](https://rakkhanet-ai.onrender.com)

> Backend runs on Render's free tier and may take 30–50 seconds to wake up after inactivity.

---

## 🌟 Core Features

| Feature | Description |
|---|---|
| **Flood & Cyclone Risk Mapping** | Interactive, color-coded hazard map (Low/Medium/High/Severe/Critical) built from a rule-based heuristic engine, with live OpenWeather data ingestion for real-time recalculation |
| **Emergency Shelter Locator** | Geospatially indexed shelter directory (MongoDB `2dsphere` + `$geoNear`) with live capacity, resources, and occupancy status |
| **Safe Evacuation Guidance** | Road-aligned routing via OSRM to the nearest open shelter, with automatic haversine fallback when routing is unavailable |
| **Relief Coordination Dashboard** | Real-time relief-request intake with AI-assisted keyword priority scoring, volunteer assignment, and resource inventory tracking |
| **Alerts & Broadcasts** | Region-scoped, multi-channel alerts (in-app/WebSocket, email, SMS-ready) with a live notification feed |
| **Secure Role-Based Auth** | JWT + role-based access control for Citizen, Volunteer, Coordinator, and Administrator roles, with rate-limited auth endpoints |
| **Offline-Ready PWA** | Service-worker caching for shelters, risk zones, and routes so core information stays usable on poor connectivity |

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 14 (App Router, TypeScript), Tailwind CSS, shadcn/ui, Leaflet / React-Leaflet 4.x, TanStack Query, Zustand, React Hook Form + Zod, next-pwa |
| **Backend** | Express.js (TypeScript), MongoDB (native driver, 2dsphere geospatial indexing), Socket.io, Better Auth + JWT, express-rate-limit |
| **AI Service** | Python FastAPI — rule-based risk scoring & relief-request triage |
| **External Data** | OpenWeather API (live weather feed), OSRM (public routing) |
| **Infra** | Turborepo monorepo, pnpm workspaces, Docker, Vercel (frontend), Render (backend + AI service), MongoDB Atlas |
| **Testing** | Vitest (unit/integration), Playwright (E2E, isolated MongoDB Memory Server harness) |

---

## 🏗 System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                           │
│   Next.js 14 + Zustand + Tailwind + Leaflet (Vercel)          │
│   Risk map → Shelter search → Evacuation → Relief requests    │
└────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS + JWT Bearer / Socket.io
┌─────────────────────────▼──────────────────────────────────────┐
│                        API GATEWAY                              │
│   Express.js + Socket.io (Render)                               │
│   JWT + RBAC + rate limiting → Route handlers → Zod validation   │
└──────┬──────────────────┬──────────────────┬───────────────────┘
       │                  │                  │
┌──────▼──────┐   ┌───────▼────────┐  ┌──────▼─────────────────┐
│  MongoDB    │   │  AI Service    │  │  External APIs         │
│  Atlas      │   │  (FastAPI,     │  │                        │
│             │   │   Render)      │  │  OpenWeather (rainfall)│
│  users      │   │  risk scoring  │  │  OSRM (routing)        │
│  shelters   │   │  triage scorer │  │                        │
│  risk_zones │   │                │  │                        │
│  requests   │   │                │  │                        │
└─────────────┘   └────────────────┘  └────────────────────────┘
```

**Flow:**
1. Citizen checks local risk map or requests evacuation guidance — API queries `risk_zones`/`shelters` with geospatial indexes.
2. Relief requests are auto-scored for priority via keyword/severity heuristics and routed to coordinators in real time via Socket.io.
3. Coordinators assign volunteers and manage resource inventory from a live dashboard.
4. Admins can trigger region-scoped broadcasts across in-app, email, and SMS channels.
5. Risk scores refresh using live OpenWeather data, falling back to seeded/manual data if the API is unavailable.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ / 22 (Docker builds use Node 22 for pnpm 11 compatibility)
- pnpm 9+
- MongoDB Atlas cluster (free M0 tier works) or local MongoDB instance
- Python 3.11+ (for the AI service)
- OpenWeather API key — free at [openweathermap.org/api](https://openweathermap.org/api)
- Docker Desktop (optional, for container builds)

### 1. Clone the repository
```bash
git clone https://github.com/Solidx74/RakkhaNet.git
cd RakkhaNet
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Configure environment variables

Copy the templates and fill in real values:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

`apps/api/.env`:
```
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/rakkhanet?retryWrites=true&w=majority
MONGODB_DB_NAME=rakkhanet
JWT_SECRET=<random 32+ char string>
JWT_EXPIRES_IN=7d
BETTER_AUTH_SECRET=<random 32+ char string>
BETTER_AUTH_URL=http://localhost:5000
OPENWEATHER_API_KEY=<your key>
AI_SERVICE_URL=http://localhost:8000
```

`apps/web/.env`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_ATTRIBUTION=&copy; OpenStreetMap contributors
```

> ⚠️ Never commit `.env` files with real credentials — only `.env.example` templates are tracked.

### 4. Seed the database
```bash
pnpm --filter @rakkhanet/api seed:shelters
pnpm --filter @rakkhanet/api seed:risk-zones
```

### 5. Run all services
```bash
pnpm turbo dev
```

- ✅ Web: `http://localhost:3000`
- ✅ API: `http://localhost:5000` (health check at `/api/health`)
- ✅ AI Service: `http://localhost:8000`

---

## 🧪 Testing

```bash
pnpm --filter @rakkhanet/api test      # Vitest — unit/integration
pnpm test:e2e                           # Playwright — end-to-end
```

- **Unit/Integration** (Vitest): geospatial queries, RBAC enforcement, priority scoring, weather-fallback logic. 25 tests across 7 suites.
- **End-to-End** (Playwright): shelter discovery, evacuation routing, request submission, and broadcast delivery flows — run against an isolated MongoDB Memory Server harness with seeded fixtures, fully decoupled from production/dev data.

---

## 🐳 Docker

```bash
docker build -f apps/api/Dockerfile -t rakkhanet-api .
docker build -f apps/ai-service/Dockerfile -t rakkhanet-ai apps/ai-service

docker run -p 5000:5000 --env-file apps/api/.env rakkhanet-api
docker run -p 8000:8000 rakkhanet-ai
```

---

## ☁️ Deployment

| Service | Platform | Live URL |
|---|---|---|
| Frontend | Vercel | [rakkhanet.vercel.app](https://rakkhanet.vercel.app) |
| Backend API | Render | [rakkhanet-api.onrender.com](https://rakkhanet-api.onrender.com) |
| AI Service | Render | [rakkhanet-ai.onrender.com](https://rakkhanet-ai.onrender.com) |
| Database | MongoDB Atlas | — |

### Production Environment Variables

**Backend (`apps/api` on Render):**

| Variable | Notes |
|---|---|
| `MONGODB_URI` | Atlas production connection string |
| `MONGODB_DB_NAME` | `rakkhanet` |
| `JWT_SECRET` | Random secure string — required, no fallback |
| `BETTER_AUTH_SECRET` | Random secure string |
| `BETTER_AUTH_URL` | `https://rakkhanet-api.onrender.com` |
| `CLIENT_URL` | `https://rakkhanet.vercel.app` — locks down CORS in production |
| `OPENWEATHER_API_KEY` | Enables live rainfall-driven risk scoring |
| `AI_SERVICE_URL` | `https://rakkhanet-ai.onrender.com` |
| `NODE_ENV` | `production` |

**Frontend (`apps/web` on Vercel):**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://rakkhanet-api.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://rakkhanet-api.onrender.com` |
| `NEXT_PUBLIC_MAP_TILE_URL` | OpenStreetMap tile server |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | OSM attribution string |

---

## 📁 Project Structure

```
rakkhanet/
├── apps/
│   ├── web/                    # Next.js 14 frontend
│   │   ├── app/
│   │   │   ├── shelters/
│   │   │   ├── risk-map/
│   │   │   ├── evacuation/
│   │   │   ├── dashboard/
│   │   │   └── admin/broadcast/
│   │   ├── components/
│   │   ├── e2e/                 # Playwright specs + fixture harness
│   │   └── store/
│   ├── api/                     # Express.js backend
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── middleware/       # auth, RBAC, rate limiting
│   │   │   ├── services/          # weather.service.ts
│   │   │   ├── config/            # db.ts, socket.ts
│   │   │   └── __tests__/         # Vitest suites
│   │   └── Dockerfile
│   └── ai-service/               # Python FastAPI microservice
│       ├── app/main.py
│       └── Dockerfile
├── packages/
│   └── shared-types/              # Shared Zod schemas & TS interfaces
├── implementation.md               # Full architecture & build blueprint
├── walkthrough.md                  # Sprint-by-sprint build summary
└── turbo.json
```

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/sign-up` | ❌ | Create account (rate-limited) |
| POST | `/api/auth/sign-in` | ❌ | Login, receive JWT (rate-limited) |
| GET | `/api/auth/me` | ✅ | Get current user |
| GET | `/api/shelters/nearby` | ✅ | Nearest shelters via geospatial query |
| GET | `/api/shelters` | ✅ | List/filter shelters |
| POST | `/api/shelters` | ✅ Admin/Coordinator | Register shelter |
| GET | `/api/risk-zones` | ✅ | List/filter hazard zones |
| POST | `/api/risk-zones/refresh` | ✅ Admin/Coordinator | Recalculate risk from live weather data (rate-limited) |
| GET | `/api/evacuation-route` | ✅ | Route + directions to nearest shelter |
| POST | `/api/relief-requests` | ✅ | Submit relief request |
| PATCH | `/api/relief-requests/:id/assign` | ✅ Admin/Coordinator | Assign volunteer |
| GET | `/api/dashboard/stats` | ✅ Admin/Coordinator | Aggregated coordination metrics |
| POST | `/api/notifications/broadcast` | ✅ Admin | Send region-scoped alert (rate-limited) |
| GET | `/api/health` | ❌ | Health check — reflects live DB connection status |

---

## ✅ Development Status

All core modules complete, verified, and deployed:

- [x] Auth & Role Management (JWT, RBAC, rate-limited)
- [x] Shelter Locator (geospatial `$geoNear`)
- [x] Flood & Cyclone Risk Mapping (live weather-driven scoring)
- [x] Evacuation Guidance & Offline PWA
- [x] Relief Coordination Dashboard (real-time via Socket.io)
- [x] Alerts & Broadcasts (in-app, email, SMS-ready)
- [x] Security hardening (production env validation, no fallback secrets, Zod payload bounds)
- [x] Test coverage (25 Vitest tests, 5 Playwright E2E specs against isolated fixtures)
- [x] Dockerized & verified (`apps/api`, `apps/ai-service`)
- [x] Deployed — Vercel (frontend) + Render (API + AI service) + MongoDB Atlas

**Project is feature-complete, tested, and live.**

---

## 📜 License

Distributed under the MIT License. This project is open for educational and humanitarian use.

## Team

| Name | Student ID |
|---|---|
| Md. Kareeb | 2204102 |
| Tayassuk Nahian | 2204114 |
| Rohan Singh | 2204131 |
| Arpon Chakma | 2204132 |

---