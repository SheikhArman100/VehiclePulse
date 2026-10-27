---
name: dev-orchestrator
description: "Transforms product ideas and whitepapers into production-ready projects for AI-assisted development. Use when: build project, dev specs, claude code, production ready, ship app."
domain: team
version: 1.1.0
purpose: Transforms product ideas and whitepapers into production-ready projects for AI-assisted development
triggers:
  - "build project"
  - "dev specs"
  - "claude code"
  - "production ready"
  - "ship app"
integration:
  model: 
  target: interactive
  invocation: system-prompt
output_format: text
dependencies: []
created: 2026-05-25
capabilities: [dev.scaffold]
produces: [dev-specs, project-scaffold]
consumes: [product-idea, whitepaper]
---

# Claude Code Orchestrator

Transforms product ideas and whitepapers into structured, production-ready projects optimized for Claude Code execution.

## ⚡ Quick Reference

| Phase | Key Actions | Output |
|-------|-------------|--------|
| 0. Environment | Setup Guardian, directory scan, context check | Populated `/knowledge` |
| 1. Discovery | Ask User Questions, Classify, Gap Analysis | Understanding |
| 1.5 Risk Assessment | Critical validation checkpoint | `RISK_ASSESSMENT.md` |
| 2. Planning | Architecture, Data Models, API Spec | `specs/` (chunked 8-15k tokens) |
| 3. Playbook | Feature decomposition, TDD tasks | `playbook/` |
| 4. Infrastructure | DevOps stack, CI/CD, Git workflow | `.github/`, `vercel.json` |
| 5. Deployment | Platform checklists | `deployment/` |
| 6. Handoff | CLAUDE.md, SYSTEM_CONTEXT.md | Root files |
| 7. Runtime Config | Subagents, commands, hooks, permissions | `~/.claude/` (personal) |

---

## Workflow Overview

```
INPUT                    PROCESS                         OUTPUT
─────                    ───────                         ──────
Idea/Whitepaper    →     0. Environment Validation  →    /knowledge/ populated
(PDF/DOCX/MD/Notion)     1. Discovery & Questions   →    /projects/{name}/
                         1.5 Risk Assessment        →    ├── CLAUDE.md           ← Claude Code reads this
                         2. Architecture Design      →    ├── SYSTEM_CONTEXT.md   ← Implementation status
                         3. Feature Decomposition    →    ├── RISK_ASSESSMENT.md
                         4. Infrastructure Setup     →    ├── knowledge/          ← Brain (FIRST)
                         5. Deployment Planning      →    │   ├── storylines/     (for games)
                         6. Handoff Files            →    │   ├── specs/          (for SaaS)
                         7. Runtime Config           →    │   └── schema/         (for SaaS)
                                                         ├── assets/ or design/  ← Soul (SECOND)
                                                         ├── specs/              ← Chunked 8-15k tokens each
                                                         │   ├── 00-OVERVIEW.md
                                                         │   ├── 01-ARCHITECTURE.md
                                                         │   ├── 02-DATA_MODELS.md
                                                         │   └── 03-API_SPEC.md
                                                         ├── playbook/
                                                         │   ├── features/
                                                         │   │   ├── FEATURE_01_xxx.md
                                                         │   │   └── FEATURE_02_xxx.md
                                                         │   └── PROGRESS.md
                                                         ├── src/                ← Body (LAST)
                                                         ├── deployment/
                                                         │   └── DEPLOYMENT_GUIDE.md
                                                         ├── .github/
                                                         │   └── workflows/
                                                         │       └── ci.yml
                                                         └── .claude/
                                                             └── settings.local.json

                         Phase 7 Outputs (Personal):
                         ~/.claude/
                         ├── settings.json            ← Permission presets
                         ├── commands/                ← Slash commands
                         │   ├── commit-push-pr.md
                         │   └── quick-test.md
                         └── agents/                  ← Subagents
                             ├── code-simplifier.md
                             └── verify-app.md
```

---

## Phase 0: Environment Validation (Setup Guardian) 🛡️

**This phase runs BEFORE any coding begins.** It ensures the Brain-Soul-Body model is respected. The full protocol is inline below.

### 0.1 Archetype Detection

From whitepaper/input, identify the project type:

| Archetype | Indicators | Required Brain Files |
|-----------|------------|---------------------|
| `narrative-game` | Story, levels, branching paths | `STORY_BIBLE.md`, `GAME_RULES.md` |
| `mobile-game` | Mechanics, scoring, no story | `GAME_RULES.md` |
| `mobile-utility` | User workflows, data storage | `BRD.md`, `SCHEMA.md` |
| `web-app` | Dashboard, API, accounts | `BRD.md`, `SCHEMA.md` |
| `content-platform` | Publishing, subscribers | `CONTENT_STRATEGY.md` |
| `hybrid` | Mobile + Web shared backend | `BRD.md`, `SCHEMA.md` |

### 0.2 Directory Scan

Check if required folders and files exist:

```
Scanning project directory...

Gap Analysis:
- ✅ /knowledge/specs exists
- ⛔ /knowledge/schema is MISSING
- ⛔ SCHEMA.md is EMPTY

Action Required: Create missing structure.
```

### 0.3 Pre-Flight Check

**CRITICAL: Do not proceed to Phase 1 if blocking files are missing.**

For Narrative Games:
```
⛔ STOP. Narrative Engine requires:
- /knowledge/storylines/STORY_BIBLE.md (master narrative)
- /knowledge/mechanics/GAME_RULES.md (game logic)

Please populate these files before proceeding.
```

For SaaS/Utility:
```
⛔ STOP. SaaS logic requires:
- /knowledge/specs/BRD.md (business requirements)
- /knowledge/schema/SCHEMA.md (data relations)

Please populate these files before proceeding.
```

### 0.4 Template Generation

If starting fresh, scaffold the project by hand from `references/project-archetypes.md` — it carries the directory tree and file conventions for each archetype. Have the coding agent create, in Brain → Soul → Body order:
- All required directories per the archetype's Project Structure
- Template context files (STORY_BIBLE.md, SCHEMA.md, etc.) as stubs to populate
- CLAUDE.md with the PRE-FLIGHT CHECK embedded (see `references/claude-md-template.md`)
- Feature playbook templates (see `references/playbook-template.md`)

Scaffolding is a set of `mkdir`/file-create steps the agent runs directly — no external script is required, so the flow works identically across opencode, Antigravity, and Claude Code.

### 0.5 Confirmation Gate

```
Environment validated:
- ✅ Brain (Knowledge): 3 files ready
- ✅ Soul (Assets): Directories prepared
- ✅ Body (Src): Structure created
- ✅ CLAUDE.md: PRE-FLIGHT CHECK embedded

Proceeding to Phase 1: Discovery...
```

---

## Phase 1: Discovery (Critical Foundation)

### 1.1 Use Ask-User-Question Tool 🔑

**This is the most important step.** Before generating any specs, conduct a detailed interview using Claude Code's ask-user-question capability.

```
INTERVIEW STRUCTURE:
1. Vision & Differentiation
   - What makes this product unique?
   - What's the 10x improvement over existing solutions?
   - What delightful details will users remember?

2. Technical Implementation
   - Target platforms (iOS, Android, Web, Desktop)
   - Preferred tech stack (or "recommend based on requirements")
   - Performance/scale expectations
   - Offline requirements

3. UI/UX Concerns
   - Design system preference (Material, Cupertino, custom)
   - Key user flows to prioritize
   - Accessibility requirements
   - Responsive breakpoints

4. Trade-offs
   - Speed vs. polish for MVP
   - Buy vs. build decisions
   - Monetization model impact on architecture
```

**Why This Matters:** Upfront planning saves 10x the tokens that would be spent on back-and-forth revisions. Treat Claude Code like a junior engineer who needs clear, precise instructions.

### 1.2 Extract & Classify

If input is PDF/DOCX/Google Doc:
- Extract text content preserving structure
- Note diagrams for manual review

Determine project archetype from content. See `references/project-archetypes.md`:

| Archetype | Indicators | Stack Recommendations |
|-----------|------------|----------------------|
| `mobile-game` | Levels, mechanics, scoring | Unity/Godot, or React Native + game engine |
| `mobile-utility` | User workflows, data storage | React Native / Flutter + Supabase |
| `web-app` | Dashboard, API, accounts | Next.js / SvelteKit + PostgreSQL |
| `content-platform` | Publishing, subscribers | Next.js + CMS + Stripe |
| `hybrid` | Multiple targets | Monorepo with shared core |

### 1.3 Gap Analysis

Run through `references/discovery-questions.md` for archetype-specific questions. Only ask for **critical missing information** - the Ask-User-Question phase should have covered most.

---

## Phase 1.5: Critical Risk Assessment ⚠️

**Before committing to technical specification**, complete an honest risk assessment.

See `references/risk-assessment-template.md` for the full template.

### Assessment Areas

1. **Technical Feasibility** - Can this actually be built?
2. **Scope Assessment** - Is MVP achievable in 4-6 weeks?
3. **Market & Timing** - Does this make sense to build?
4. **Resource & Sustainability** - Can this be maintained long-term?
5. **Known Unknowns** - What might we be missing?

### Risk Levels

| Level | Meaning | Action |
|-------|---------|--------|
| 🟢 Low | Proceed with confidence | Continue to Phase 2 |
| 🟡 Medium | Proceed with mitigations | Document specific mitigations |
| 🔴 High | Reconsider approach | Revise scope or architecture |
| ⛔ No-Go | Fundamental issues | Resolve before proceeding |

### Output

Generate `RISK_ASSESSMENT.md` in project root with:
- Honest assessment of each risk area
- Overall risk level recommendation
- Required mitigations if proceeding
- User acknowledgment before continuing

**Non-Sycophantic Rule:** Do not minimize risks to please the user. Surface problems early when they're cheap to fix.

---

## Phase 2: Architecture Design

### 2.1 Use Plan Mode First

**Before writing any files**, enter Plan Mode (Shift+Tab twice in Claude Code):
- Explore alternative approaches
- Research unfamiliar technologies  
- Compare trade-offs mentally
- Prototype data models without touching files

### 2.2 Think Hard About Architecture

When generating architecture, use extended thinking:

```
"Think hard about the architecture for {project}. Consider:
- Scalability from 100 to 100,000 users
- Developer experience and maintainability
- Cost optimization for early stage
- Migration paths as requirements evolve"
```

### 2.3 Generate Specs (Chunked)

**CRITICAL: Chunk specs to prevent context decay.**

See `references/spec-chunking-guide.md` for detailed strategy.

| File | Target Size | Content |
|------|-------------|---------|
| `00-OVERVIEW.md` | 2-3k tokens | Quick reference, system summary |
| `01-ARCHITECTURE.md` | 8-12k tokens | Tech stack, components, data flow |
| `02-DATA_MODELS.md` | 8-12k tokens | Entities, schemas, relationships |
| `03-API_SPEC.md` | 8-12k tokens | Endpoints, auth, error handling |

**Rule:** If any file exceeds 15k tokens, split it.

Each spec file should start with:
```markdown
## Quick Summary
{3-5 bullet points - what this document covers}

## This Document Covers
{Numbered list of sections}

## Related Documents
{Links to dependent/related specs}
```

See templates in `references/` directory.

---

## Phase 3: Feature-Centric Playbook 🎯

**Key Insight:** Think in terms of features, not broad product descriptions.

### 3.1 Feature Decomposition

Break the product into atomic features:

```markdown
## Feature List

### F1: User Authentication
User Story: As a user, I want to sign in so I can access my data
Acceptance Criteria:
- [ ] Email/password login works
- [ ] OAuth (Google) works  
- [ ] Session persists across app restart
- [ ] Logout clears all local data

### F2: {Next Feature}
...
```

### 3.2 TDD Task Format

Each feature gets a playbook file in `playbook/features/`:

```markdown
# Feature: {Name}

## Overview
**User Story:** {story}
**Priority:** P0/P1/P2
**Estimated Sessions:** {n}

## Tasks

### Task 1: Write Tests First
**Prompt for Claude Code:**
> "Write tests for {feature}. Test these scenarios:
> 1. {happy path}
> 2. {edge case}
> 3. {error case}
> Do not implement yet - tests should fail."

**Expected:** Tests exist and fail

### Task 2: Implement
**Prompt for Claude Code:**
> "Implement {feature} to make the tests pass. Follow the architecture in CLAUDE.md."

**Expected:** Tests pass

### Task 3: Lint & Polish
**Prompt for Claude Code:**
> "Run linting, fix any issues, add error handling for edge cases."

**Validation:**
- [ ] `npm run lint` passes
- [ ] `npm run test` passes
- [ ] Manual smoke test works
```

### 3.3 Progress Tracking

Create `playbook/PROGRESS.md`:

```markdown
# Development Progress

## Current Status
**Phase:** MVP
**Last Session:** {date}
**Context Usage:** {%} - restart if > 50%

## Feature Completion
- [x] F1: User Authentication (3 sessions)
- [ ] F2: Core Feature (in progress - Task 2)
- [ ] F3: Settings
- [ ] F4: Data Sync

## Session Notes
### Session 5 - {date}
- Completed: F2 Task 1 (tests)
- Blocked: API rate limiting issue
- Next: Implement with exponential backoff
```

---

## Phase 4: Infrastructure & DevOps 🔧

**Zero-maintenance infrastructure for solo developers.**

See `references/devops-infrastructure.md` for complete guide.

### 4.1 Standard Stack Selection

| Layer | Recommended | Alternative |
|-------|-------------|-------------|
| **Runtime** | Node.js (TypeScript) | Bun |
| **Framework** | Next.js 14+ | SvelteKit |
| **Database** | Supabase | PlanetScale, Neon |
| **ORM** | Prisma | Drizzle |
| **Hosting** | Vercel | Railway, Cloudflare |
| **Auth** | Supabase Auth | Clerk |

### 4.2 Git Workflow for AI Agents

**Golden Rules:**
1. **Never commit to `main`** - Always use feature branches
2. **Conventional Commits** - `feat:`, `fix:`, `docs:`, `chore:`
3. **Small commits** - One logical change per commit
4. **Human review** - Validate AI work before merge

**Branch Strategy:**
```
main (protected)
  └── develop
       ├── feature/auth-system
       ├── feature/user-dashboard
       └── fix/login-redirect
```

**Recovery from hallucination loops:**

Read the diff and decide. You do **not** run the recovery commands — they are
destructive and irreversible for uncommitted work, which is exactly what a loop is
most likely to contain.

```bash
# You may run (read-only):
git diff                    # See what changed
git diff --stat             # Scope of the mess
git status --short          # Which files are affected
```

Then **stop and report** to the developer with:

- what you ran yourself and what it printed
- what you propose to discard, file by file
- the exact commands they should run if they agree

```
Proposed recovery (not executed — for your review):
  git restore --staged <paths>
  git checkout -- <paths>
  # or, to discard everything uncommitted (IRREVERSIBLE):
  # git reset --hard HEAD
```

**Never** run `git reset --hard`, `git checkout --`, or `git clean` yourself. A loop
often contains real work interleaved with the mistake; only the human can tell which
is which, and only they should be the one to throw it away.

### 4.3 CI/CD Setup

Generate `.github/workflows/ci.yml`:
```yaml
name: CI
on: [pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test
```

### 4.4 Observability

| Tool | Purpose | Setup |
|------|---------|-------|
| Sentry | Error tracking | `@sentry/nextjs` |
| Vercel Analytics | Usage metrics | Built-in, free |
| UptimeRobot | Uptime monitoring | Free tier |

---

## Phase 5: Deployment Planning

Generate `deployment/DEPLOYMENT_GUIDE.md` per target platform.
See `references/deployment-guide.md` for checklists.

---

## Phase 6: Generate CLAUDE.md & SYSTEM_CONTEXT.md 🔑

**This is the critical handoff document.** Claude Code automatically reads `CLAUDE.md` from project root.

```markdown
# {Project Name}

## Quick Reference
- **Type:** {archetype}
- **Stack:** {tech summary}
- **Run Dev:** `npm run dev`
- **Run Tests:** `npm run test`
- **Lint:** `npm run lint`

## Architecture
{Brief overview - link to specs/ARCHITECTURE.md for details}

## Code Conventions
- Naming: {camelCase/snake_case/etc}
- Components: {functional with hooks}
- State: {Zustand/Redux/Context}
- Testing: {Jest + React Testing Library}

## Current Focus
**Feature:** {current feature}
**Task:** {current task from playbook}
**Playbook:** See `playbook/features/FEATURE_XX.md`

## Context Management ⚠️
- Monitor context usage in Claude Code status bar
- Start fresh session when context > 50%
- Use `/compact` to preserve key context
- Each feature = potential session boundary

## Key Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Supabase | Realtime + Auth + Free tier |
| Styling | Tailwind | Rapid iteration, no CSS files |
| State | Zustand | Simple, no boilerplate |

## Links
- [Architecture](specs/ARCHITECTURE.md)
- [Data Models](specs/DATA_MODELS.md)
- [Current Playbook](playbook/PROGRESS.md)
```

### 6.2 Generate SYSTEM_CONTEXT.md

**Implementation status tracker - update after each session.**

See `references/spec-chunking-guide.md` for complete template.

```markdown
# System Context

## Current Implementation Status
**Last Updated:** {timestamp}
**Last Session:** {feature/task}
**Context Health:** {Fresh/50%/Restart needed}

## Completed Components
| Component | Status | Tests | Notes |
|-----------|--------|-------|-------|
| Auth | ✅ Done | ✅ Passing | Supabase Auth |
| User Model | ✅ Done | ✅ Passing | |

## In Progress
**Feature:** {current}
**Task:** {current task}
**Blocked By:** {or None}

## Files Modified This Session
- `path/to/file.tsx` - {what changed}

## Next Session Priorities
1. {priority 1}
2. {priority 2}
```

### 6.3 Configure Claude Code

Generate `.claude/settings.local.json`:

```json
{
  "allowedTools": [
    "Read",
    "Write",
    "Bash(npm:*)",
    "Bash(yarn:*)",
    "Bash(pnpm:*)",
    "Bash(git:*)",
    "Bash(node:*)"
  ]
}
```

This prevents constant permission prompts during development.

---

## Phase 7: Runtime Configuration (Personal Setup)

**Goal:** Set up developer's personal Claude Code environment for maximum productivity.

This phase generates configurations for `~/.claude/` (personal, applies to all projects).

### 7.1 Subagents (Priority 1)

Generate specialized agents in `~/.claude/agents/`:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| `code-simplifier` | Refactor without changing behavior | After feature complete |
| `verify-app` | End-to-end verification | Before PR/merge |
| `security-check` | Security review | Before merge to main |
| `build-validator` | Pre-deployment validation | Before deploy |
| `oncall-guide` | Debug production issues | During incidents |

See `references/runtime-config-templates.md` for full templates.

### 7.2 Slash Commands (Priority 2)

Generate reusable prompts in `~/.claude/commands/`:

| Command | Purpose |
|---------|---------|
| `/commit-push-pr` | Stage, commit, push, create PR |
| `/quick-test` | Run typecheck + lint + tests |
| `/review-code` | Review staged changes |
| `/start-feature` | Set up new feature branch |
| `/end-session` | Save progress, update context |

### 7.3 PostToolUse Hooks (Priority 3)

Auto-format code after every write/edit. Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run format || true"
          }
        ]
      }
    ]
  }
}
```

### 7.4 MCP Server Configuration (Priority 4)

For extended capabilities. Add to project `.mcp.json`:

```json
{
  "mcpServers": {
    "slack": {
      "type": "http",
      "url": "https://slack.mcp.anthropic.com/mcp"
    },
    "github": {
      "type": "http",
      "url": "https://github.mcp.anthropic.com/mcp"
    }
  }
}
```

### 7.5 Permission Presets (Priority 5)

Configure `~/.claude/settings.json` to avoid permission prompts:

**Developer Preset (recommended):**
```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(bun run *)",
      "Bash(git *)",
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(grep *)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(sudo *)"
    ]
  }
}
```

### 7.6 System Diagnostics

Before starting, verify system readiness. Ask the coding agent to run the pre-flight check in `references/claude-code-setup-guide.md` (Part 8) — a portable shell script that verifies:
- Node.js version
- Git configuration
- SSH keys for GitHub
- Coding-agent CLI installation
- Personal config files

---

## Context Management Rules ⚠️

**Critical for quality:**

1. **50% Threshold:** Restart sessions when context usage > 50%
2. **Use /compact:** Preserve key context before restart
3. **Session Boundaries:** Natural breaks at feature completion
4. **Progress File:** Always update `playbook/PROGRESS.md` at session end
5. **Fresh Starts:** Begin each session by reading CLAUDE.md and PROGRESS.md

---

## Advanced Patterns

### Automated Execution (YOLO/Ralph Mode)

**Prerequisites:**
- Comprehensive playbook with testable criteria
- Each task has automated validation (tests, linting)
- Manual experience with the codebase first

**Enable:** `claude --dangerously-skip-permissions`

⚠️ **Warning:** "Build without Ralph first" - Gain hands-on experience before automating.

### Parallel Development with Git Worktrees

For large projects with independent features. **The developer creates and merges
worktrees — you propose the layout, you do not run these commands.**

```bash
# Proposed to the developer (not executed):
git worktree add ../project-feature-x -b feature-x
cd ../project-feature-x          # separate session runs here
# ... work happens in that directory ...
git checkout main
git merge feature-x
git worktree remove ../project-feature-x
```

Your job is to decide *whether* worktrees are warranted (are the features genuinely
independent, or will they conflict in shared files?) and to name the branches. Report
a `## Proposed Git Workflow` with the worktree commands and let the developer run
them. Merging two branches that touch the same files is a human decision.

### Extended Thinking Modes

| Complexity | Command | Use Case |
|------------|---------|----------|
| Simple | (default) | Basic CRUD, formatting |
| Medium | "think about..." | Component design, refactoring |
| Complex | "think hard about..." | Architecture decisions, optimization |
| Very Complex | "ultrathink" | System design, complex algorithms |

---

## Execution Commands

### Initialize New Project

Scaffold by hand from `references/project-archetypes.md` — create the archetype's directory tree and template files directly (Brain → Soul → Body). No external script; portable across every harness.

### Diagnose System

Run the pre-flight check from `references/claude-code-setup-guide.md` (Part 8) — verifies Node.js, Git, SSH, the coding-agent CLI, and config files.

### Quick Setup Personal Config
```bash
mkdir -p ~/.claude/{commands,agents}
# Then copy templates from references/runtime-config-templates.md
```

---

## Reference Files

### Core References
- `references/project-archetypes.md` - Templates for each project type (with Brain-Soul-Body structure)
- `references/playbook-template.md` - Detailed playbook structure  
- `references/discovery-questions.md` - Gap analysis questions by archetype
- `references/claude-md-template.md` - CLAUDE.md generation template (with PRE-FLIGHT CHECK)

### Infrastructure & DevOps
- `references/devops-infrastructure.md` - Zero-maintenance stack, CI/CD, Git workflow
- `references/deployment-guide.md` - Platform-specific deployment checklists
- `references/spec-chunking-guide.md` - Prevent context decay with chunked specs
- `references/risk-assessment-template.md` - Pre-Phase 2 validation checkpoint

### Runtime & Best Practices (NEW)
- `references/ai-dev-best-practices.md` - Tool-agnostic playbook for AI-assisted development
- `references/claude-code-setup-guide.md` - Complete setup from zero to productive
- `references/runtime-config-templates.md` - Subagents, commands, hooks, permissions templates

---

## Philosophy

> "In 2026, unique ideas and well-designed user experiences will differentiate software from easily cloned applications."

This orchestrator handles the mechanical transformation. **You** provide:
- Audacity in vision
- Taste in execution
- Attention to delightful details

The goal isn't just working software—it's software worth using.
