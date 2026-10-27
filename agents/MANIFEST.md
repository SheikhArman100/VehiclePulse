# Developer Agent Manifest

Registry of the developer, implementation, and verification agents in the AI
Operating System — **Developer Edition**.

**This file is the canonical registry.** `docs/PIPELINE_PROTOCOL.md` and every
other doc resolve agent names here. If a role is referenced anywhere but has no
row below, that is a defect — `node tools/verify-workflow.mjs` fails the build on it.

**Shipped:** 20 agents (5 orchestration + gates · 11 engineering · 4 UI & testing)
**Not shipped:** 7 optional roles — see §5. Templates that need them say so.

---

## 1. Orchestration & Custom Build Gates (5)

| File | Agent | Role |
|------|-------|------|
| `agents-orchestrator.md` | Agents Orchestrator | Coordinates multi-agent dev pipelines from spec to ship |
| `build-validator.md` | Build Validator | Validates build output against spec before handoff (Gate 1 owner) |
| `code-simplifier.md` | Code Simplifier | Refactors working code for clarity and maintainability post-build |
| `security-check.md` | Security Check | Security audit gate before deployment (auth, data, dependencies) |
| `verify-app.md` | App Verifier | End-to-end functional runtime verification |

---

## 2. Engineering & Architecture Agents (7)

| File | Agent | Speciality |
|------|-------|------------|
| `engineering-backend-architect.md` | Backend Architect | API design, data architecture, Data Access Matrix (Gate 0 owner) |
| `engineering-senior-developer.md` | Senior Developer | Full-stack production implementation (Laravel, React, Node, Python) (Gate 1 owner) |
| `engineering-frontend-developer.md` | Frontend Developer | UI implementation, component architecture, CSS and API config (Gate 1 owner) |
| `engineering-rapid-prototyper.md` | Rapid Prototyper | Speed-first prototyping and MVP builds |
| `engineering-security-engineer.md` | Security Engineer | Security review, threat modelling, dev auth bypass checks |
| `engineering-ai-engineer.md` | AI Engineer | AI/ML integration, LLM implementation, prompt pipelines |
| `engineering-technical-writer.md` | Technical Writer | Developer documentation, API references, architecture guides |

---

## 3. UI Design & Quality Testing Agents (4)

| File | Agent | Speciality |
|------|-------|------------|
| `design-ui-designer.md` | UI Designer | Interface and component design, design systems (Gate 1.5a owner) |
| `ux-researcher.md` | UX Researcher | User journeys, entry points, error recovery, session handling |
| `testing-api-tester.md` | API Tester | API contract and endpoint testing against spec |
| `testing-integration-tester.md` | Integration Tester | Gate 1.5 owner: runtime cross-service contract testing (frontend ↔ backend) |

---

## 4. Release & Handover Agents (4)

| File | Agent | Speciality |
|------|-------|------------|
| `deployment-topologist.md` | Deployment Topologist | Gate 2.75 owner: target, infra, tenancy, compliance, cost, rollback |
| `evidence-collector.md` | Evidence Collector | Compiles handover proof artefacts before Gate 3 |
| `project-shepherd.md` | Project Shepherd | SESSION_CLOSE: reconciles project state, progress, PR description |
| `testing-demo-walkthrough-validator.md` | Demo Walkthrough Validator | Gate 3 owner: fresh-start user flow and UX verification |

---

## 5. Optional Roles — not shipped in this edition

These roles appear in pipeline templates but have **no agent file in this
repository**. A pipeline that reaches one must **SKIP it and log the skip in the
`---AGENT-DONE---` `Issues` field**. It must not substitute a different agent or
improvise the role.

| Role | Needed by | If absent |
|---|---|---|
| `legacy-codebase-analyst` | PIPELINE-BROWNFIELD step 1 | Template unavailable |
| `modernization-strategist` | PIPELINE-BROWNFIELD step 2 | Template unavailable |
| `data-migration-planner` | Gate 0.5 (brownfield, conditional) | SKIP — migration planned inline by Senior Developer, documented |
| `devops-automator` | PIPELINE-DEVOPS step 2, PIPELINE-ANDROID step 2 | SKIP — implementation done by Senior Developer |
| `accessibility-auditor` | PIPELINE-UI-FRONTEND step 4 | SKIP — WCAG checks fold into Gate 1.5a |
| `reality-checker` | PIPELINE-SPEC step 2 | SKIP — Backend Architect self-checks the spec |
| `performance-benchmarker` | PIPELINE-INTEGRATION-TEST step 1 | SKIP — load testing is out of scope for this edition |

**Consequence:** `PIPELINE-BROWNFIELD` and `PIPELINE-INTEGRATION-TEST` cannot run
end-to-end in this edition. They are documented for teams that add the optional
agents. Do not start one and discover the gap mid-pipeline.

To adopt one, author `agents/custom/<role>.md` following
[`docs/AGENT-LIFECYCLE.md`](../docs/AGENT-LIFECYCLE.md) and add a row above.

---

## 6. The Standard Dev Build Sequence

Canonical sequence. `AGENTS.md` is the entry point the harness reads and defers
here; this table is the gate *order*, `docs/PIPELINE_PROTOCOL.md` is the gate
*detail*.

```
Spec / PRD
   ↓
Gate 0    — Architecture & Data Access Matrix   (backend-architect)
Gate 0.5  — Data Migration Planning             (conditional, brownfield only)
Gate 1    — Feature Implementation              (senior-developer / frontend-developer)
Gate 1.5a — UI & Visual Design                  (ui-designer)
Gate 1.5  — Runtime Integration Verification    (integration-tester)
Gate 2    — Code Simplification & Security      (code-simplifier + security-check)
Gate 2.75 — Deployment Topology                 (deployment-topologist)
Gate 3    — Demo UX Walkthrough                 (demo-walkthrough-validator)
   ↓
Release
```

**Gate 1.5 cannot be declared `PASS (STATIC ONLY)`.** It requires a running system.
If services cannot start, it FAILS and reports why.