# CLAUDE.md — Softograph AI Operating System
## Project Orchestration Template

> **For teams:** This is a reference template. Do not use this file directly in a project.
> Copy it to your project root, rename to `CLAUDE.md`, and follow the configuration instructions
> in each section. Fields marked `[CONFIGURE]` require your input before first use.
>
> **For dev-orchestrator:** When generating a project CLAUDE.md, use this as the base.
> Replace all `[CONFIGURE]` fields with project-specific values during Phase 6 (Handoff).

---

## 📋 Quick Reference

| Section | Purpose |
|---------|---------|
| [Session Start Protocol](#session-start-protocol) | Run this EVERY session before any work |
| [Project Identity](#project-identity) | What this project is |
| [Pipeline Position](#pipeline-position) | Where this project sits in the full pipeline |
| [Agent Roster](#agent-roster) | Which agents are active and when |
| [Skill Bindings](#skill-bindings) | Which skills govern which domains |
| [Depth Modes](#depth-modes) | Full pipeline / single phase / single function |
| [Quality Gates](#quality-gates) | Non-negotiable checkpoints |
| [State Management](#state-management) | How to persist context across sessions |
| [Handoff Contracts](#handoff-contracts) | What each phase must produce before next starts |
| [Context Rules](#context-rules) | How to manage context window |
| [Reference Files](#reference-files) | Supporting documentation |

---

## Session Start Protocol

**Run this checklist at the start of EVERY session, without exception.**
Do not begin any work until all steps are complete.

### Step 0 — Operating Protocol (inherited from the global floor)

The global floor (`~/.claude/CLAUDE.md`) already loaded and pointed you at
`~/Developer/AI-Operating-System/docs/OPERATING_PROTOCOLS.md`. Follow **§2–§7**
(environment, git, Linear, n8n, brand, posture) — that is your build discipline.
**§1 (the Notion context tiers) is the PM surface's job, not yours.** You are the
implementer: context arrives settled via the handoff; do not fetch or write the tiers.
Everything below adds only project-specific context on top of that floor.

### Step 1 — Artifact Scan (Status Detection)

Scan the project root for existing artifacts to determine pipeline position:

```
Scanning project directory...

Checking for:
[ ] whitepaper or product brief       → Phase 02 input present
[ ] DESIGN_BRIEF.md                   → Phase 03 completed
[ ] specs/ directory with content     → Phase 04 planning started
[ ] CLAUDE.md with config filled in   → Phase 04 completed
[ ] playbook/ with feature files      → Phase 04-05 in progress
[ ] PROGRESS.md with completed items  → Phase 05 partially done
[ ] RISK_ASSESSMENT.md                → Risk gate passed
[ ] deployment/ directory             → Phase 05-06 in progress
[ ] src/ with working code            → Build in progress or complete
[ ] PROJECT_STATE.md                  → Previous session state found

Result: "Based on artifacts found, project appears to be at Phase [X].
         Confirm this is correct or specify your actual entry point."
```

**If PROJECT_STATE.md exists:** Read it first. It contains the last known state, active tasks, and blockers. Treat it as authoritative over the artifact scan.

**If no artifacts exist:** This is a fresh project. Default entry point is Phase 01.

### Step 2 — Depth Declaration

Before any work begins, ask:

```
What depth are we running today?

(a) FULL PIPELINE     — Execute from confirmed entry point through to completion
                        or next natural stopping point

(b) SINGLE PHASE      — Work within one pipeline phase only
                        Specify: Phase [01 / 02 / 03 / 04 / 05 / 06 / 07]

(c) SINGLE FUNCTION   — One specific task, regardless of phase
                        Examples: "write the proposal", "be the marketing team",
                        "review this architecture", "run security check"

(d) REVIEW ONLY       — Read and assess current state, no execution
                        Output: status report + recommended next actions
```

Record the declared depth in `PROJECT_STATE.md` at session start.

### Step 3 — Prerequisites Check

For mid-pipeline entry (Phase 03 or later), verify required inputs exist:

| Entry Phase | Required Inputs | If Missing |
|-------------|----------------|------------|
| Phase 03 (Design) | Whitepaper or approved product brief | Flag gap, offer to create brief first |
| Phase 04 (Engineering) | DESIGN_BRIEF.md or approved whitepaper | Flag gap, offer Phase 03 mini-run |
| Phase 05 (Build) | CLAUDE.md configured + specs/ populated | Hard stop — cannot build without specs |
| Phase 06 (Launch) | Deployed product OR approved proposal draft | Flag gap, identify which track (proposal vs. campaign) |
| Phase 07 (Grow) | Live product with measurable activity | Flag gap, confirm product is actually live |

**Gap resolution options (present to user):**
1. Fill the gap now (run the missing phase first)
2. Proceed with waiver (document the gap in PROJECT_STATE.md and accept the risk)
3. Abort and return when prerequisites are ready

---

## Project Identity

```
[CONFIGURE]

Project Name:       [name]
Product:            [Proggya / ICE / Forge / TradeEye / Callibrio / Inspecto / custom]
Client/Context:     [internal / client name]
Project Type:       [new-feature / new-product / rfp-response / client-delivery / research]
Archetype:          [saas-feature / narrative-game / mobile-utility / web-app / content-platform / hybrid]
Tech Stack:         [e.g. Laravel/Livewire/FluxUI, Next.js/Supabase, React Native/Flutter]
Repo URL:           [GitHub URL]
Started:            [date]
Last Active:        [date — update every session]
Owner:              [Tawhid Rahman / team member name]
```

---

## Pipeline Position

```
[CONFIGURE — mark current position with ►]

  ○ Phase 01: Opportunity Discovery
  ○ Phase 02: Strategy & Brief
  ○ Phase 03: Design
  ► Phase 04: Engineering Planning        ← EXAMPLE: currently here
  ○ Phase 05: Build & Test
  ○ Phase 06: Launch
  ○ Phase 07: Grow

Entry Point for this session: [confirm at session start]
Last Completed Phase: [fill in]
Next Target Phase: [fill in]
```

---

## Agent Roster

Agents active in this project. All agents must be installed at `~/.claude/agents/` before use.
See `ai-operating-system/agents/MANIFEST.md` for full descriptions.

### Always Active (All Sessions)

Invoke these by name at the right moment — they are **not** automatic. Auto-delegation is
description-driven and not yet tuned, so an un-invoked gate agent simply never runs:

| Agent | Invoke When |
|-------|-----------------------------|
| `build-validator` | Any feature marked complete in playbook |
| `security-check` | Any code touched that handles auth, data, or external calls |
| `verify-app` | Before any PR or deployment |
| `code-simplifier` | After a feature is fully working and tested |

### Phase-Activated Agents

Invoke these explicitly when entering the relevant phase or task:

#### Engineering (Phase 04-05)
```
"Use the Backend Architect for this API design"
"Switch to the Senior Developer for implementation"
"Run the Frontend Developer on this component"
"Use the DevOps Automator for the CI/CD pipeline"
"Security Engineer — review this before we merge"
"Technical Writer — generate docs for this module"
"Rapid Prototyper — we need a working demo by tomorrow"
"AI Engineer — integrate this model endpoint"
```

#### Testing (Phase 05 — gates between features)
```
"Reality Checker — validate these assumptions before we build"
"API Tester — run contract tests on this endpoint"
"Performance Benchmarker — baseline this before we optimise"
"Accessibility Auditor — WCAG review on this UI"
"Evidence Collector — gather proof this feature works"
"Workflow Optimizer — identify bottlenecks in this process"
```

#### Sales (Phase 06 — Proposal Track)
```
"Proposal Strategist — structure this RFP response"
"Sales Engineer — write the technical section"
"Discovery Coach — prepare qualifying questions for this prospect"
"Account Strategist — map stakeholders for this deal"
"Deal Strategist — how do we progress this opportunity"
"Pipeline Analyst — what does our current pipeline look like"
"Outbound Strategist — build an outreach sequence for this segment"
```

#### Marketing (Phase 06 — Campaign Track)
```
[NOTE: Marketing agents receive briefs from b2b-marketing-cmo skill.
 Run the CMO skill first, then hand off to these agents.]

"Content Creator — produce assets from this brief"
"LinkedIn Content Creator — write posts for this campaign" [Softograph B2B only]
"Growth Hacker — design experiments for this funnel"
"SEO Specialist — keyword and technical audit"
```

#### Design (Phase 03)
```
"UX Researcher — map the user journey for this feature"
"UI Designer — design this component"
"Brand Guardian — check this against Softograph brand standards"
```

#### Project Management
```
"Project Shepherd — what's blocking us right now"
"Senior PM — give me a full project health assessment"
"Experiment Tracker — log this experiment and outcome"
"Analytics Reporter — summarise performance this week"
```

#### Orchestration
```
"Agents Orchestrator — I need to coordinate multiple agents for this task"
[Use when a task requires 3+ agents working in sequence]
```

### [CONFIGURE] — Project-Specific Agent Sequence

```
For this project, the primary agent sequence is:

Feature type: [API endpoint / UI component / full feature / other]

Step 1: [agent name] — [what it does in this project]
Step 2: [agent name] — [what it does in this project]
Step 3: [agent name] — [what it does in this project]
Gate:   [quality agent] — [what it validates]
Step 4: [agent name] — [what it does in this project]
Final:  verify-app — end-to-end check before marking complete
```

---

## Skill Bindings

Skills govern strategic and planning domains. They brief agents — agents do not override skills.

| Domain | Skill | Scope in This Project |
|--------|-------|-----------------------|
| Engineering planning | `dev-orchestrator` | Phase 04 architecture, spec generation, playbook creation |
| Marketing strategy | `b2b-marketing-cmo` | Phase 06 campaign brief, positioning, sales enablement |
| Product documentation | `product-whitepaper` | Phase 02 concept notes and briefs |
| Data & market research | `proggya-data-analyst` | Phase 01 opportunity sizing, Phase 07 performance analysis |

### Skill Activation Phrases

```
"Use dev-orchestrator to plan this feature"
"Run the CMO skill — I need a campaign brief for [product]"
"Generate a product whitepaper for this concept"
"Use proggya-data-analyst to research this market"
```

### Skill → Agent Handoff Protocol

When a skill produces a brief or output that an agent needs to act on:

```
1. Skill completes its output (brief, spec, strategy document)
2. Explicitly state: "Hand off to [agent name]"
3. Agent receives the skill output as its input context
4. Agent produces the execution artifact
5. Skill does NOT re-engage unless strategy revision is needed
```

**Critical boundary — Marketing:**
- `b2b-marketing-cmo` → sets strategy, writes briefs, defines win themes
- `marketing-*` agents → execute from those briefs, produce final assets
- Never run marketing agents without a CMO brief unless the task is purely mechanical

**Critical boundary — LinkedIn identity:**
- `marketing-linkedin-content-creator` agent → Softograph B2B company content only
- `expert-writer` skill (personal profile) → Tawhid's personal brand / Latitude content only
- These must never be mixed. Check which context you are in before activating.

---

## Depth Modes

### Mode A: Full Pipeline

Execute from confirmed entry point forward. At each phase boundary:
1. Confirm phase is complete (all outputs produced)
2. Check prerequisites for next phase
3. Ask: "Proceed to Phase [N+1] or pause here?"
4. Update PROJECT_STATE.md before pausing

### Mode B: Single Phase

Stay within the declared phase. Do not drift into adjacent phases.
If work naturally requires moving into another phase, stop and ask permission.

Phase completion criteria:

| Phase | Complete When |
|-------|--------------|
| 01 Opportunity Discovery | Opportunity scored, pipeline entry decision made |
| 02 Strategy & Brief | Whitepaper or brief approved, GTM position defined |
| 03 Design | DESIGN_BRIEF.md complete, approved by stakeholder |
| 04 Engineering Planning | specs/ complete, CLAUDE.md configured, playbook/ created |
| 05 Build & Test | All features in playbook marked complete, verify-app passed |
| 06 Launch | Campaign live OR proposal submitted |
| 07 Grow | Baseline metrics established, optimisation loop running |

### Mode C: Single Function

Route directly to the right tool. No pipeline phases involved.

```
Common single-function requests and their routing:

"Be the marketing team"
→ Activate b2b-marketing-cmo skill
→ Ask: which product, which objective, what budget/timeline
→ Produce: strategy + brief
→ Optionally hand off to marketing execution agents

"Write/respond to this RFP"
→ b2b-marketing-cmo (win themes, positioning) →
  sales-proposal-strategist (full proposal document) →
  sales-engineer (technical sections if needed)

"Review this architecture"
→ engineering-backend-architect +
  engineering-security-engineer (parallel review)

"Run a security audit"
→ security-check agent (always-active, run immediately)

"Research this market / competitor"
→ proggya-data-analyst skill

"Write a product brief"
→ product-whitepaper skill

"What should I do next?"
→ Read PROJECT_STATE.md → produce prioritised next actions list
```

---

## Quality Gates

These are non-negotiable checkpoints. Work does not proceed past a gate until it passes.

### Gate 0 — Environment (Phase 04 entry)
```
□ Project archetype identified
□ Brain files populated (BRD.md / STORY_BIBLE.md / SCHEMA.md per archetype)
□ Directory structure created (knowledge/ → assets/ → src/)
□ RISK_ASSESSMENT.md completed and reviewed
□ tech stack confirmed
□ CLAUDE.md configured (all [CONFIGURE] fields filled)
```

### Gate 1 — Architecture (Phase 04 → 05 transition)
```
□ specs/00-OVERVIEW.md complete
□ specs/01-ARCHITECTURE.md complete
□ specs/02-DATA_MODELS.md complete
□ specs/03-API_SPEC.md complete
□ All specs chunked to 8-15k tokens each
□ playbook/ features decomposed
□ PROGRESS.md initialised
□ engineering-backend-architect review signed off
```

### Gate 2 — Feature Complete (within Phase 05, per feature)
```
□ Feature implements all requirements in playbook file
□ build-validator passed
□ testing-api-tester passed (if API feature)
□ testing-accessibility-auditor passed (if UI feature)
□ security-check passed (if auth/data/external calls involved)
□ PROGRESS.md updated
□ code-simplifier run (refactor after working)
```

### Gate 3 — Pre-Launch (Phase 05 → 06 transition)
```
□ All playbook features at Gate 2 status
□ verify-app end-to-end test passed
□ engineering-technical-writer documentation complete
□ DEPLOYMENT_GUIDE.md created
□ Staging environment tested
□ Performance benchmarks baselined
```

### Gate 4 — Launch Ready (Phase 06)
```
Proposal track:
□ Win themes defined (b2b-marketing-cmo)
□ Executive summary drafted (sales-proposal-strategist)
□ Technical sections complete (sales-engineer)
□ Pricing validated against CMO framework
□ Internal review complete

Campaign track:
□ Campaign brief approved (b2b-marketing-cmo)
□ All content assets produced (marketing agents)
□ Tracking configured (GA, UTMs)
□ Team briefed on execution roles
□ Quality gates from b2b-marketing-cmo Phase 7 checklist passed
```

### Gate 5 — Growth Baseline (Phase 06 → 07 transition)
```
□ Product live and accessible
□ Analytics tracking confirmed working
□ Baseline metrics recorded (Week 0 snapshot)
□ Support process defined
□ Feedback collection mechanism in place
```

---

## State Management

### PROJECT_STATE.md Structure

Update this file at the END of every session. Read it at the START of every session.

```markdown
# PROJECT_STATE.md
Last Updated: [date and time]
Session Count: [increment each session]

## Current Position
Phase: [number and name]
Entry Point This Session: [how session started]
Depth Mode: [full / phase N / function: description]

## Completed
| Phase/Task | Date | Outcome | Agent/Skill Used |
|-----------|------|---------|-----------------|
| [item] | [date] | [result] | [tool] |

## Active (In Progress)
| Task | Agent/Skill | Status | Blockers |
|------|------------|--------|---------|
| [item] | [tool] | [status] | [blocker or none] |

## Blocked
| Task | Reason | What's Needed | Priority |
|------|--------|--------------|---------|
| [item] | [why blocked] | [prerequisite] | [high/med/low] |

## Decisions Made
| Decision | Rationale | Date |
|---------|-----------|------|
| [decision] | [why] | [date] |

## Next Session — Priority Actions
1. [most important next action]
2. [second action]
3. [third action]

## Known Risks
| Risk | Level | Mitigation |
|------|-------|-----------|
| [risk] | 🔴/🟡/🟢 | [mitigation] |

## Notes
[anything that doesn't fit above]
```

### Context Window Management

```
Rule 1 — 50% Threshold
When context usage exceeds 50%, run /compact before continuing.
Never let context hit 80%+ — quality degrades significantly.

Rule 2 — Session Boundaries
Natural session boundaries:
- Completion of a quality gate
- End of a phase
- After updating PROJECT_STATE.md

Rule 3 — Fresh Session Start
Every new session begins with:
1. Read PROJECT_STATE.md (authoritative)
2. Read CLAUDE.md (this file)
3. Read relevant spec file for current phase
4. Run Session Start Protocol (Step 1-3 above)
DO NOT read the entire codebase — only what's needed for the current task.

Rule 4 — Spec Chunking
Each spec file must be 8-15k tokens maximum.
If a spec grows beyond 15k, split it into sub-files.
Claude Code reads one spec chunk per task — never the whole specs/ directory at once.

Rule 5 — End of Session
Before ending any session:
1. Update PROJECT_STATE.md
2. Update PROGRESS.md (if in Phase 05)
3. Commit all changes with descriptive message
4. Note exactly where to resume in PROJECT_STATE.md
```

---

## Handoff Contracts

What each phase must produce before the next phase begins.
These are the minimum viable outputs — quality gates above are the pass/fail criteria.

```
Phase 01 → Phase 02
Produces: Scored opportunity summary, target client profile, competitive context
Consumed by: b2b-marketing-cmo (for GTM brief), product-whitepaper (for concept note)

Phase 02 → Phase 03
Produces: Approved whitepaper or product brief, GTM position statement
Consumed by: design-ux-researcher (user journey), design-ui-designer (visual direction)

Phase 03 → Phase 04
Produces: DESIGN_BRIEF.md (user flows, component specs, brand constraints)
Consumed by: dev-orchestrator (architecture decisions, CLAUDE.md generation)

Phase 04 → Phase 05
Produces: specs/ (chunked), playbook/ (feature files), CLAUDE.md (configured)
Consumed by: engineering agents (implementation), testing agents (validation)

Phase 05 → Phase 06
Produces: Working, tested, documented product or feature
Consumed by: b2b-marketing-cmo (launch brief), sales-proposal-strategist (if RFP track)

Phase 06 → Phase 07
Produces: Live product + active campaign OR submitted proposal
Consumed by: proggya-data-analyst (performance analysis), support agents (client success)

Phase 07 → Phase 01 (loop)
Produces: Win/loss analysis, pipeline data, market intelligence
Consumed by: next opportunity cycle (Phase 01 input)
```

---

## Extended Thinking Guidance

Match thinking depth to task complexity:

| Complexity | Instruction | Use For |
|------------|------------|---------|
| Simple | (default) | Basic CRUD, formatting, copy edits |
| Medium | "think about..." | Component design, feature planning |
| Complex | "think hard about..." | Architecture decisions, proposal strategy |
| Very Complex | "ultrathink" | System design, complex GTM strategy, risk assessment |

Use `ultrathink` for: Phase 1.5 Risk Assessment, architecture decisions, RFP win theme development, international market entry assessment.

---

## Advanced Execution Patterns

### Parallel Agent Execution

When two agents can work independently on different parts of the same feature:

```
"Run Backend Architect and UX Researcher in parallel:
 - Backend Architect: design the API contract for [feature]
 - UX Researcher: map the user journey for [feature]
 Both outputs will feed into a joint review before implementation starts."
```

### Automated Execution (YOLO Mode)

Only use when:
- Playbook is comprehensive with testable acceptance criteria
- All quality gates are defined
- You have manual experience with this codebase first

```bash
claude --dangerously-skip-permissions
```

⚠️ Never use on first contact with a new codebase.

### Git Worktrees for Parallel Features

```bash
git worktree add ../[project]-feature-x -b feature-x
cd ../[project]-feature-x
claude
# Work in isolation, merge when Gate 2 passes
git checkout main && git merge feature-x
git worktree remove ../[project]-feature-x
```

---

## Reference Files

### From AI Operating System (Team Skills)
```
ai-operating-system/skills/team/dev-orchestrator/SKILL.md
ai-operating-system/skills/team/b2b-marketing-cmo/SKILL.md
ai-operating-system/skills/team/product-whitepaper/SKILL.md
ai-operating-system/skills/team/proggya-data-analyst/SKILL.md
ai-operating-system/docs/conflict-map.md
ai-operating-system/docs/workflow.md
```

### Project-Specific (generated by dev-orchestrator)
```
specs/00-OVERVIEW.md          ← Start here each engineering session
specs/01-ARCHITECTURE.md
specs/02-DATA_MODELS.md
specs/03-API_SPEC.md
playbook/PROGRESS.md          ← Current build status
RISK_ASSESSMENT.md            ← Risk register
DESIGN_BRIEF.md               ← Design constraints and specs
SYSTEM_CONTEXT.md             ← Implementation status snapshot
```

---

## Softograph Operating Constraints

These apply to all projects across the full pipeline:

```
Cost:         Zero paid services. Free tiers and open-source only.
              Any tool requiring a paid subscription requires explicit CEO approval.

Security:     OAuth2 for all integrations. No credential storage in code.
              security-check agent is mandatory before any merge to main.

ROI:          All automation proposals must account for development AND maintenance cost.
              Net outcome weighted against investment — not theoretical benefit.

Stack:        Unless specified otherwise, default to existing infrastructure:
              n8n (automation) · Google Workspace (data/comms) ·
              Hostinger VPS (hosting) · Notion (docs) · Obsidian (personal knowledge)

Markets:      Bangladesh (primary) · UAE · Spain/Portugal · Australia/New Zealand
              All market research must include Bangladesh-specific data where available.

Products:     Proggya · Data Dialogue · ICE · Forge · TradeEye · Callibrio · Inspecto
              Cross-sell opportunities should be flagged in any product work.
```

---

## Maintenance

**This file is generated by dev-orchestrator Phase 6.**
To regenerate: "Run dev-orchestrator Phase 6 Handoff on this project"

**To update the template itself:**
Edit `ai-operating-system/docs/CLAUDE-template.md` in the master repo,
commit, then run `./sync-to-team.sh` to propagate to team repo.

**Template version:** 1.0 — March 2026
