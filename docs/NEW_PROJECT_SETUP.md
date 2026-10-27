# New Project Setup Guide

Checklist and instructions for setting up any new Softograph project to use
the AI Operating System pipeline. Follow this before writing a single line of
code or invoking any agent.

**See also:** `docs/NEW-PROJECT-HANDOVER.md` for the full narrative handover
document. This guide is the technical checklist; the handover covers context,
model selection, the Claude Code / Claude.ai PM split, and Linear setup.

---

## Prerequisites (one-time, already done if you've done this before)

```bash
# Verify all agents are installed globally
ls ~/.claude/agents/ | wc -l
# Must match the count in agents/MANIFEST.md (currently 38)
# If not, run:
cd ~/Developer/AI-Operating-System
cp agents/custom/*.md ~/.claude/agents/
cp agents/third-party/*.md ~/.claude/agents/
```

---

## Step 1 — Create the Project Repo

```bash
mkdir ~/Developer/[project-name]
cd ~/Developer/[project-name]
git init
git remote add origin https://github.com/rahman-tawhid/[project-name]
```

Or clone if repo already exists:
```bash
cd ~/Developer
git clone https://github.com/rahman-tawhid/[project-name]
cd [project-name]
```

---

## Step 2 — Create the Knowledge Directory

```bash
mkdir -p knowledge/specs
mkdir -p knowledge/schema
```

Place your project knowledge files:
- `knowledge/specs/BRD.md` — business requirements document
- `knowledge/schema/SCHEMA.md` — data models (if applicable)
- `knowledge/specs/AGENT_REGISTRY.md` — copy from template, then trim to project-relevant agents only

Copy the agent registry template:
```bash
cp ~/Developer/AI-Operating-System/docs/AGENT_REGISTRY_TEMPLATE.md \
   knowledge/specs/AGENT_REGISTRY.md
# Edit AGENT_REGISTRY.md — delete agents not relevant to this project
# Always keep the 4 custom gates: build-validator, security-check, code-simplifier, verify-app
```

---

## Step 3 — Create CLAUDE.md

CLAUDE.md is the project orchestration file. Claude Code reads it automatically
on every session start.

Minimum required sections:

```markdown
# CLAUDE.md — [Project Name]

## Session Start Protocol
[read PROJECT_STATE.md if exists; otherwise scan for artifacts; declare depth mode]

## Pipeline Templates
[copy relevant templates from docs/PIPELINE_PROTOCOL.md and adapt]
[every project needs at least: PIPELINE-BACKEND-API and PIPELINE-SPEC]

## Project Identity
[project name, client, repo, owner, classification]

## Pipeline Position
[current phase — update as project progresses]

## System Overview
[what is being built — for agent context]

## Architecture Constraints
[non-negotiable technical decisions for this project]

## Technology Stack
[decided stack — do not change without explicit approval]

## Agent Roster
[reference knowledge/specs/AGENT_REGISTRY.md]
[note which pipeline templates each agent appears in]

## Quality Gates
[Gate 0 through Gate N — project-specific checkpoints]

## Project Structure
[directory tree]

## State Management
[PROJECT_STATE.md template from docs/PIPELINE_PROTOCOL.md Section 7]
```

---

## Step 4 — Add Pipeline Templates to CLAUDE.md

Every project needs pipeline templates that define the agent sequence
for each category of work. Copy the relevant templates from
`docs/PIPELINE_PROTOCOL.md` Section 5 into your CLAUDE.md under
`## Pipeline Templates`.

| Template | Use when |
|---|---|
| `PIPELINE-SPEC` | Generating architecture/spec documents (Phase 04) |
| `PIPELINE-BACKEND-API` | Backend API features |
| `PIPELINE-UI-FRONTEND` | Frontend UI features |
| `PIPELINE-ANDROID` | Native Android/Kotlin (offline-critical apps) |
| `PIPELINE-QR-CRYPTO` | Cryptographic / ML features |
| `PIPELINE-DEVOPS` | CI/CD, infrastructure, deployment |
| `PIPELINE-INTEGRATION-TEST` | Load testing, pentest, UAT (Phase 06) |

Adapt each template to match your active agent set. Remove steps for agents
not in your AGENT_REGISTRY.md.

---

## Step 5 — Commit the Scaffold

```bash
git add .
git commit -m "[setup] project scaffold — CLAUDE.md, knowledge files, agent registry"
git push origin main
```

---

## Step 6 — Create Linear Issues

1. Create a parent issue for the project under the TR team
2. Create child issues per phase (Phase 04, Phase 05A, Phase 05B, etc.)
3. Create feature-level sub-issues per playbook feature
4. Each feature issue should contain:
   - Feature ID (matches playbook filename, e.g. `REG-01`)
   - Which pipeline template it uses
   - Acceptance criteria (binary — pass/fail checkable)
   - Any blocking dependencies
5. **Do not paste individual agent prompts into Linear issues** — the pipeline
   runs autonomously from CLAUDE.md templates. Linear tracks status, not prompts.

---

## Step 7 — First Claude Code Session

```bash
cd ~/Developer/[project-name]
git pull origin main
claude
```

Once Claude Code loads:
```
"Depth mode: (b) SINGLE PHASE — [first phase name].
Run the pipeline for [first feature ID]."
```

Claude Code reads CLAUDE.md automatically. It will execute the pipeline
defined in your CLAUDE.md templates without needing manual agent invocation.

---

## Project-Specific Agent Scoping

Not every project needs every agent. This edition ships 20 — trim to what applies,
but **never remove the gate owners**. If you need a role beyond this list, author it
first: [`DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md#adding-a-new-agent)`.

| Agent | Include when |
|---|---|
| `engineering-backend-architect` | Always — Gate 0 |
| `engineering-senior-developer` / `engineering-frontend-developer` | Always — Gate 1 |
| `design-ui-designer` | Any UI surface exists — Gate 1.5a |
| `testing-integration-tester` | Always — Gate 1.5 |
| `testing-api-tester` | Always |
| `code-simplifier` + `security-check` | Always — Gate 2 |
| `deployment-topologist` | Always — Gate 2.75 |
| `testing-demo-walkthrough-validator` | Any handover — Gate 3 |
| `build-validator`, `verify-app` | Always |
| `engineering-security-engineer` | Any auth, PII, external API, or government work |
| `engineering-ai-engineer` | ML, crypto, embeddings, LLM integration |
| `engineering-technical-writer` | Any deliverable with docs or handover |
| `ux-researcher` | Any citizen/end-user facing UI |
| `evidence-collector` | Regulated, government, or formal handover projects |
| `project-shepherd` | Always — SESSION_CLOSE |
| `engineering-rapid-prototyper` | Prototypes and throwaway spikes only |

**Optional roles** (not shipped — the pipeline skips them and logs the skip):
`legacy-codebase-analyst`, `modernization-strategist`, `data-migration-planner`,
`devops-automator`, `accessibility-auditor`, `reality-checker`,
`performance-benchmarker`. See [`agents/MANIFEST.md` §5](../agents/MANIFEST.md).

---

## Reference

| Document | Location | Purpose |
|---|---|---|
| Pipeline Protocol | `docs/PIPELINE_PROTOCOL.md` | Completion signal, templates, retry logic |
| Agent Registry Template | `docs/AGENT_REGISTRY_TEMPLATE.md` | Base template for project agent lists |
| Full Handover Guide | `docs/NEW-PROJECT-HANDOVER.md` | Narrative setup guide, model selection, PM split |
| Developer Quick Start | `FOR-DEVELOPERS.md` (team repo root) | Agent install commands, CC quick start |
| Agent Manifest | `agents/MANIFEST.md` | Every shipped agent, the gate each one owns, and the optional roles |
