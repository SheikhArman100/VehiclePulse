import fs from "fs";
import path from "path";

const roots = ["backend", "frontend/web"];
const nodes = [];
const edges = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (["node_modules", "dist", ".next", ".git"].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (/\.(ts|tsx|js|mjs|json|css|md|ya?ml)$/.test(entry.name)) {
      const relPath = fullPath.replace(/\\/g, "/");
      nodes.push({ id: relPath, label: entry.name, type: entry.name.split(".").pop() || "unknown" });

      if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
        const content = fs.readFileSync(fullPath, "utf8");
        const importRegex = /import\s+.*?from\s+["'](.*?)["']/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          edges.push({ source: relPath, target: match[1], relation: "IMPORTS" });
        }
      }
    }
  }
}

roots.forEach(walk);

const graphData = {
  meta: {
    project: "VehiclePulse",
    generatedAt: new Date().toISOString(),
    nodeCount: nodes.length,
    edgeCount: edges.length,
  },
  nodes,
  edges,
};

fs.mkdirSync("knowledge/graph", { recursive: true });
fs.writeFileSync("knowledge/graph/graph.json", JSON.stringify(graphData, null, 2));

const report = [
  "# VehiclePulse — Codebase Knowledge Graph Report",
  "",
  `Generated on: ${graphData.meta.generatedAt}`,
  "",
  "## Summary",
  `- Total Tracked Artifacts: ${nodes.length}`,
  `- Total Dependency Relationships: ${edges.length}`,
  "",
  "## Subsystem Structure",
  "1. **Backend Workspaces** (`backend/packages/*`)",
  "   - `@vehicle-pulse/config`: Zod environment validation",
  "   - `@vehicle-pulse/logger`: Pino structured logging",
  "   - `@vehicle-pulse/shared`: Error hierarchy, correlation ID middleware, health router, graceful shutdown, pagination & validation helpers",
  "   - `@vehicle-pulse/event-contracts`: Canonical telemetry, state, alert, and command schemas",
  "2. **Backend Microservices** (`backend/services/*`)",
  "   - `telemetry-service`: Ingestion service with MongoDB persistence (Mongoose), vehicle/device CRUD, and OpenAPI 3.1 Swagger UI",
  "3. **Frontend Application** (`frontend/web/*`)",
  "   - Next.js 15 App Router (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`)",
  "   - Tailwind CSS configuration",
  "",
  "## Key Dependency Edges",
  ...edges.map((e) => `- \`${e.source}\` -> \`${e.target}\``),
].join("\n");

fs.writeFileSync("knowledge/graph/GRAPH_REPORT.md", report);
console.log(`Graph generated successfully with ${nodes.length} nodes and ${edges.length} edges.`);
