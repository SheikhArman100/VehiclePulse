---
name: graphify
capabilities: [code.analyze.graph]
produces: [knowledge-graph, graph-report, dependency-map]
consumes: [codebase, documentation, database-schema]
description: "Knowledge Graph engine for codebases — maps AST call graphs, schemas, documents, and dependencies into queryable graph structures. Use when: graphify, knowledge graph, dependency graph, call graph, code map, architecture map."
domain: team
version: 1.0.0
purpose: Transform codebases, schemas, and docs into queryable knowledge graphs for structural awareness
triggers:
  - "graphify"
  - "knowledge graph"
  - "dependency graph"
  - "call graph"
  - "code map"
  - "architecture map"
integration:
  model: 
  target: interactive
  invocation: reference-doc
output_format: text
dependencies: []
created: 2026-10-27
argument-hint: "[<path-or-repo>]"
license: MIT
---

# Graphify — Codebase Knowledge Graph Protocol

Turn any codebase, database schema, documentation, and configuration tree into a deterministic, queryable knowledge graph.

---

## 1. Core Purpose & When to Dispatch

Dispatch `graphify` (`code.analyze.graph`) when:
- **Phase 0 / Project Onboarding**: Analyzing an existing codebase to populate `knowledge/` before writing architecture specs.
- **Gate 0 (Backend Architect)**: Tracing entity relationships, data flow, and assembling the Data Access Matrix.
- **Surgical Scope & Reconnaissance**: Identifying all direct and indirect callers of a function before modifying shared code.
- **Gate 2 (Simplification & Refactor)**: Detecting circular dependencies, isolated orphan modules, and high-coupling "God Nodes".

---

## 2. Analysis & Extraction Workflow

### Step 1: Structural AST Scan (Tree-sitter / Local Syntax)
Extract explicit, deterministic code relationships:
1. **Modules & Files**: Directory hierarchy, package manifests, and imports/exports.
2. **Entities**: Classes, interfaces, functions, methods, API endpoints, routes, models.
3. **Relationships**:
   - `CALLS` (function A invokes function B)
   - `INHERITS` (class child extends parent)
   - `IMPORTS` (module A imports from module B)
   - `READS_FROM` / `WRITES_TO` (service queries database table or schema)

### Step 2: Semantic Document & Schema Bridging
Connect non-code artifacts with code implementations:
- Map API routes in code to OpenAPI/REST endpoints in `specs/`.
- Map database ORM models and migrations to `knowledge/schema/SCHEMA.md`.
- Identify external integrations and cross-reference them against `docs/STUB_REGISTRY.md`.

### Step 3: Graph Clustering & Node Metrics
Classify nodes according to architectural role:
- **God Nodes**: High-centrality modules imported or called across many subsystems. (Exercise extra caution; changes require running Gate 1.5 across all dependents).
- **Subsystem Communities**: Natural clusters (e.g. Auth, Billing, Data Pipeline, UI).
- **Leaf Nodes & Peripherals**: Edge utilities or isolated consumers with low ripple risk.

---

## 3. Standard Deliverables & Output Formats

When running Graphify on a project or directory, generate and persist structured outputs in `knowledge/graph/` (or project root):

1. **`knowledge/graph/GRAPH_REPORT.md`**:
   - Architectural summary: primary subsystems, boundary mappings, and data flow.
   - Central hubs / God Nodes ranked by in-degree and out-degree.
   - Identified orphan files or circular dependencies.
2. **`knowledge/graph/graph.json`**:
   - Machine-readable adjacency list of nodes and typed edges for subsequent agent context.
3. **`knowledge/graph/graph.html`** *(Optional visual asset)*:
   - Interactive force-directed or hierarchical graph visualization of the repository.

---

## 4. Integration with Quality Gates

- **Gate 0 (Architecture)**: Backend Architect uses the graph to verify that proposed services adhere strictly to layer boundaries and Data Access Matrix constraints.
- **Gate 1 (Implementation)**: Developers inspect the immediate dependency chain to avoid breaking upstream callers.
- **Gate 1.5 (Integration Verification)**: Integration tester uses caller paths to determine which end-to-end flows must be executed.
- **Gate 2 (Simplification)**: Code Simplifier verifies that new code has not created unnecessary coupling or unneeded cross-module dependencies.
