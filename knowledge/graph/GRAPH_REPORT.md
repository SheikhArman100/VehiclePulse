# VehiclePulse — Codebase Knowledge Graph Report

Generated on: 2026-10-27T13:40:37.060Z

## Summary
- Total Tracked Artifacts: 38
- Total Dependency Relationships: 24

## Subsystem Structure
1. **Backend Workspaces** (`backend/packages/*`)
   - `@vehicle-pulse/config`: Zod environment validation
   - `@vehicle-pulse/logger`: Pino structured logging
   - `@vehicle-pulse/shared`: Error hierarchy, correlation ID middleware, health router, graceful shutdown
2. **Frontend Application** (`frontend/web/*`)
   - Next.js 15 App Router (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`)
   - Tailwind CSS configuration

## Key Dependency Edges
- `backend/packages/config/src/index.ts` -> `dotenv`
- `backend/packages/config/src/index.ts` -> `zod`
- `backend/packages/event-contracts/src/alert.ts` -> `zod`
- `backend/packages/event-contracts/src/alert.ts` -> `./envelope.js`
- `backend/packages/event-contracts/src/command.ts` -> `zod`
- `backend/packages/event-contracts/src/command.ts` -> `./envelope.js`
- `backend/packages/event-contracts/src/contracts.test.ts` -> `node:test`
- `backend/packages/event-contracts/src/contracts.test.ts` -> `node:assert/strict`
- `backend/packages/event-contracts/src/envelope.ts` -> `zod`
- `backend/packages/event-contracts/src/state.ts` -> `zod`
- `backend/packages/event-contracts/src/state.ts` -> `./envelope.js`
- `backend/packages/event-contracts/src/state.ts` -> `./telemetry.js`
- `backend/packages/event-contracts/src/telemetry.ts` -> `zod`
- `backend/packages/event-contracts/src/telemetry.ts` -> `./envelope.js`
- `backend/packages/logger/src/index.ts` -> `pino`
- `backend/packages/shared/src/correlation.ts` -> `express`
- `backend/packages/shared/src/correlation.ts` -> `node:crypto`
- `backend/packages/shared/src/errorHandler.ts` -> `express`
- `backend/packages/shared/src/errorHandler.ts` -> `@vehicle-pulse/logger`
- `backend/packages/shared/src/errorHandler.ts` -> `./errors.js`
- `backend/packages/shared/src/health.ts` -> `express`
- `backend/packages/shared/src/shutdown.ts` -> `http`
- `backend/packages/shared/src/shutdown.ts` -> `@vehicle-pulse/logger`
- `frontend/web/app/layout.tsx` -> `next`