# VehiclePulse Frontend Web

Portfolio-grade real-time dashboard for VehiclePulse, built with Next.js (App Router), React, Tailwind CSS, and TypeScript.

## Architecture Guidelines

- Communicates with backend microservices exclusively via **HTTP REST** and **WebSocket** through the **Nginx reverse proxy**.
- **Never connects directly** to databases, Redis, Kafka, or RabbitMQ.
- Independent package and lockfile management; decoupled from backend npm workspaces.

## Getting Started

```bash
cd frontend/web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
