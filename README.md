# Softograph AI OS — Developer Edition

A streamlined, developer-only build loop for turning specs, PRDs, and user stories into verified production software using AI coding harnesses (**opencode**, **Antigravity**, or **Claude Code**).

---

## 1. Quick Start

### Step 1: Harness Configuration
Configure your AI coding harness to point to this repository:
- **opencode** (default & recommended)
- **Antigravity**
- **Claude Code**

Detailed setup instructions live in [docs/INSTALL.md](docs/INSTALL.md).

### Step 2: Core Developer Skills
Loaded directly from `skills/team/<skill-name>/`:

| Skill | `capabilities` | Purpose | When to reach for it |
|---|---|---|---|
| **[`dev-orchestrator`](skills/team/dev-orchestrator)** | `dev.scaffold` | Scaffolds the codebase from specs, breaks tasks into milestones, and organizes the build session. | Project kickoff or major feature architecture. |
| **[`claude-code-protocol`](skills/team/claude-code-protocol)** | `dev.protocol` | Enforces session discipline, Git push verification, and autonomous agent handoffs (`---AGENT-DONE---`). | Active coding sessions. |
| **[`frontend-design`](skills/team/frontend-design)** | `code.frontend` | Production-grade UI/component engineering and visual quality standards. | Building UI, dashboards, and client-facing interfaces. |
| **[`ponytail`](skills/team/ponytail)** | `code.simplify.lean` | Enforces YAGNI, anti-bloat decision ladder, and minimal code diff footprint. | Active coding, refactoring, and dependency checks. |
| **[`graphify`](skills/team/graphify)** | `code.analyze.graph` | Builds AST call graphs, schema maps, and queryable knowledge graphs. | Codebase onboarding, reconnaissance, caller tracing, and Gate 0. |

> **`capabilities` is not decoration.** The planner binds a skill to a plan step by
> exact match on this key. A skill without it is never dispatched, regardless of how
> good its description is. `node tools/verify-workflow.mjs` fails the build if any
> skill is missing one.

### Step 3: Launching a Build

**In Antigravity (Fully Autonomous):**  
Simply prompt your feature description:
```text
Build feature: [describe feature / paste user story or spec]
```
Antigravity automatically executes all 6 quality gates end-to-end as defined in [`AGENTS.md`](AGENTS.md).

**In opencode / Claude Code:**  
Prompt the session to load the orchestrator:
```text
Load skill: skills/team/dev-orchestrator
Here is the spec: [path to spec / PRD]
Scaffold the project structure and decompose it into a gated milestone plan.
```

---

## 2. Multi-Agent Development Pipeline

Tasks flow across specialized personas coordinated by [`agents-orchestrator`](agents/third-party/agents-orchestrator.md):

```
Spec / PRD
   ↓
Gate 0    — Architecture & Data Access Matrix (engineering-backend-architect)
Gate 0.5  — Data Migration Planning           (conditional, brownfield only)
Gate 1    — Feature Implementation            (engineering-senior-developer / engineering-frontend-developer)
Gate 1.5a — UI & Visual Design                (design-ui-designer)
Gate 1.5  — Runtime Integration Verification  (testing-integration-tester)
Gate 2    — Code Simplification & Security    (code-simplifier + security-check)
Gate 2.75 — Deployment Topology               (deployment-topologist)
Gate 3    — Demo UX Walkthrough               (testing-demo-walkthrough-validator)
   ↓
Verified Code Release
```

### The Developer Agents

[`agents/MANIFEST.md`](agents/MANIFEST.md) is the **canonical registry** — it maps each gate to its owner and lists the optional roles that are not shipped. Summary:

- **Orchestration & gates:** `agents-orchestrator`, `build-validator`, `code-simplifier`, `security-check`, `verify-app`
- **Engineering:** `engineering-backend-architect`, `engineering-senior-developer`, `engineering-frontend-developer`, `engineering-rapid-prototyper`, `engineering-security-engineer`, `engineering-ai-engineer`, `engineering-technical-writer`
- **UI & testing:** `design-ui-designer`, `ux-researcher`, `testing-api-tester`, `testing-integration-tester`
- **Release & handover:** `deployment-topologist`, `evidence-collector`, `project-shepherd`, `testing-demo-walkthrough-validator`

Some pipeline roles have no agent file in this edition. When a template reaches one
it **skips and logs the skip** — it never substitutes another agent. See
[`agents/MANIFEST.md` §5](agents/MANIFEST.md).

---

## 3. Autonomous Execution Protocol

During autonomous multi-agent pipelines, every agent session follows
[`docs/PIPELINE_PROTOCOL.md`](docs/PIPELINE_PROTOCOL.md):

### The Git Model — agents propose, humans execute

**An agent never runs a git command that writes.** No `commit`, no `push`, no
`checkout`, no `branch`, no `merge`, no PR. It reads git state freely, then hands you
the commands:

```text
## Proposed Git Workflow  — not executed, for your review

⚠ Ran on `main`? → branch first. Do not commit here.

Working tree: 12 files changed, +380 −220

Review first:
  git status --short && git diff --stat && git diff

Then:
  git checkout -b ai/[project-slug]-[phase]-[YYYY-MM-DD]
  git add <paths>
  git commit -m "[component] brief description"
  git push -u origin ai/[project-slug]-[phase]-[YYYY-MM-DD]
  gh pr create --title "..." --body "..." --base main
```

You read the diff, adjust what you want, and run it. A commit is where work becomes
history — review has to happen before that, not after.

### The Completion Signal

Every session that writes files ends with:

```text
---AGENT-DONE---
Agent: [agent name]
Feature: [feature ID]
Output: [file paths]
Status: PASS | PASS (STATIC ONLY) | FAIL | NEEDS-REVIEW
Self-check: PASS | SELF-CORRECTED ([detail])
Scope: [touched files]
Issues: [none | description]
Next agent: [next agent | GATE | END]
---
```

`PASS (STATIC ONLY)` means verified by reading, not by running — it must name the
missing toolchain and the unverified criterion.

→ Full protocol: [`docs/PIPELINE_PROTOCOL.md`](docs/PIPELINE_PROTOCOL.md).
→ Branch and PR rules for you: [`docs/GIT-WORKFLOW.md`](docs/GIT-WORKFLOW.md).

---

## 4. Key Developer Documentation

- [**AGENTS.md**](AGENTS.md): Core autonomous agent directives; configures Antigravity to run all 6 gates end-to-end.
- [**Developer Guide**](docs/DEVELOPER-GUIDE.md): Brain-Soul-Body model and custom agent creation.
- [**Developer Quickstart**](docs/FOR-DEVELOPERS.md): Day-to-day command and skill cheat sheet.
- [**Pipeline Protocol**](docs/PIPELINE_PROTOCOL.md): Autonomous handoffs, gate thresholds, and error handling.
- [**Git Workflow**](docs/GIT-WORKFLOW.md): Branching, PR session close, and remote tracking rules.
- [**Installation Guide**](docs/INSTALL.md): Step-by-step setup for opencode, Antigravity, and Claude Code.
- [**Project Scaffolding**](docs/NEW_PROJECT_SETUP.md): Step-by-step scaffolding guide for new repositories.

---

## 5. Golden Rule

> **Verify from runtime reality, never from model claims.**
> Always execute integration tests (`Gate 1.5`), verify running services, and report
> honestly when something could not be verified — before it is committed, not after.
