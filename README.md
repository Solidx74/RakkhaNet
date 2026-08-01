# RakkhaNet

**AI-Powered Disaster Response & Relief Coordination Platform for Bangladesh**

RakkhaNet unifies flood/cyclone risk visualization, evacuation guidance, shelter location, and relief coordination into a single role-based web platform — built for citizens, volunteers, NGOs, and government responders.

> CSE-300 (Software Development Sessional) project — Department of CSE, Chittagong University of Engineering & Technology (CUET). Submitted to Md. Atiqul Islam Rizvi, Assistant Professor, Dept. of CSE.

---

## The Problem

Bangladesh faces recurring riverine floods, flash floods, and cyclones affecting millions annually. Information is fragmented across the Flood Forecasting and Warning Centre (FFWC), the Bangladesh Meteorological Department (BMD), government portals, and informal social media groups — leaving citizens without one reliable place to check risk, find safety, and get help.

RakkhaNet answers three questions in one place: **How dangerous is my area? Where should I go? Who can help me?**

---

## Core Modules

| Module | Description |
|---|---|
| 🌊 **Flood & Cyclone Risk Map** | Interactive, color-coded hazard map (Low/Medium/High/Severe) driven by rainfall, river-level, and elevation data |
| 🧭 **Evacuation Guidance** | Road-aligned routing to the nearest open shelter |
| 🏠 **Shelter Locator** | Geospatially indexed directory with live capacity and resource tracking |
| 📋 **Relief Coordination Dashboard** | Request intake, triage, and volunteer dispatch for coordinators |
| 🔔 **Alerts & Notifications** | Region-scoped push/email alerts, SMS-ready via provider abstraction |
| 🔐 **Auth & Role Management** | Role-based access for Citizen, Volunteer, Coordinator, and Administrator |

---

## Tech Stack

**Frontend** — Next.js 14 (App Router, TypeScript) · Tailwind CSS · shadcn/ui · Leaflet/React-Leaflet · TanStack Query · Zustand · React Hook Form + Zod · next-pwa

**Backend** — Express.js (TypeScript) · MongoDB (native driver, 2dsphere geospatial indexing) · Socket.io · Better Auth + JWT

**AI Service** — Python FastAPI (risk scoring & relief-request triage)

**Infra** — Turborepo monorepo · pnpm workspaces · Docker

---

## Project Structure

```
rakkhanet/
├── apps/
│   ├── web/            # Next.js 14 frontend
│   ├── api/             # Express.js backend
│   └── ai-service/       # Python FastAPI microservice
├── packages/
│   └── shared-types/     # Shared Zod schemas & TS interfaces
├── implementation.md      # Full architecture & build blueprint
└── turbo.json
```

See [`implementation.md`](./implementation.md) for the complete database schema, API contract, auth architecture, and sprint plan.

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- MongoDB Atlas account (free tier works) or local MongoDB instance
- Python 3.11+ (for the AI service)

### Setup

```bash
# Clone
git clone https://github.com/Solidx74/RakkhaNet.git
cd RakkhaNet

# Install dependencies
pnpm install

# Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Fill in MONGODB_URI, JWT secrets, etc.

# Run all services
pnpm turbo dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:5000` (health check at `/api/health`)
- AI Service: `http://localhost:8000`

---

## Development Status

Actively in development. See [`implementation.md`](./implementation.md) for the sprint-by-sprint build plan.

- [x] Sprint 1 — Monorepo foundation, auth, shared types
- [ ] Sprint 2 — Shelter locator & geospatial database
- [ ] Sprint 3 — Risk map
- [ ] Sprint 4 — Evacuation guidance
- [ ] Sprint 5 — Relief coordination dashboard
- [ ] Sprint 6+ — AI risk scoring, SMS alerts, testing & deployment

---

## Team

| Name | Student ID |
|---|---|
| Md. Kareeb | 2204102 |
| Tayassuk Nahian | 2204114 |
| Rohan Singh | 2204131 |
| Arpon Chakma | 2204132 |

---

## License

Academic project — CUET CSE-300 Sessional, 2026.