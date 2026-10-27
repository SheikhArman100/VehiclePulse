# VehiclePulse Backend

Distributed real-time telemetry processing backend built with Node.js, Express, TypeScript, and npm workspaces.

## Structure

```text
backend/
├── services/        # Independent microservices (telemetry, analytics, alert)
├── packages/        # Shared internal workspace packages (config, logger, contracts, shared)
├── simulator/       # Local stateful telemetry generator
├── workers/         # Background RabbitMQ workers (command-worker)
├── infrastructure/  # Docker and Nginx local configuration
├── package.json     # Workspaces root
└── tsconfig.base.json # Shared strict TypeScript configuration
```

## Prerequisites

- Node.js >= 20.0.0 (Recommended: v24.x LTS)
- npm >= 10.0.0
- Docker & Docker Compose (for local infrastructure)

## Installation

```bash
cd backend
npm install
```
