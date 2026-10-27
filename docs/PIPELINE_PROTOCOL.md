# Pipeline Execution Protocol

Detailed gate definitions and pipeline templates for the Softograph AI OS.

**The gate *sequence* is owned by [`AGENTS.md`](../AGENTS.md)** — that is the file
every harness reads. This document owns the gate *detail*: what each gate requires,
how status is interpreted, and which template to run. If the two disagree on
order, `AGENTS.md` wins.

**Agent names resolve against [`agents/MANIFEST.md`](../agents/MANIFEST.md)**, the
canonical registry. A role named here that has no MANIFEST row is either a shipped
agent or a declared optional role (§4.2) — never an unlisted one.

**Version:** 2.5 — Updated October 2026 (canonical gate sequence, optional-role
handling, API-only Gate 1.5, agent registry reconciliation)

---

## 1. The Principle

The harness executes agent pipelines autonomously. When one agent completes its
task, the harness reads the completion signal, validates the output, and invokes
the next agent immediately — no human input required between steps. Human approval
is only required at explicit GATE steps and on failures.

---

## 2. Agent Completion Signal

Every agent, on finishing its task, must output this block verbatim:

```
---AGENT-DONE---
Agent: [agent name]
Feature: [feature ID or task name]
Output: [file path(s) produced]
Status: PASS | PASS (STATIC ONLY) | FAIL | NEEDS-REVIEW
Self-check: PASS | SELF-CORRECTED ([what was fixed])
Scope: [list of files/functions changed — nothing outside this list was touched]
Issues: [none | description of problems found]
Next agent: [next agent name from pipeline, or GATE, or END]
---
```

### Git Model — the agent proposes, the human executes

**No agent ever runs a git command that writes.** No `commit`, no `push`, no
`checkout`/`switch`, no `merge`, no `rebase`, no `reset`, no `branch`, and no
`gh pr create`. Agents read git state freely (`status`, `log`, `diff`,
`branch --show-current`) so their proposals are accurate.

The human reviews the diff before it becomes history. An agent that commits and pushes
its own output makes that review impossible.

What replaces the old "push before AGENT-DONE" rule:

1. The agent reads `git status --short` and `git diff --stat`.
2. The agent emits `---AGENT-DONE---` — what was done and how it was verified.
3. The agent emits a `## Proposed Git Workflow` block: branch name, exact file list,
   commit message, push command, PR title and body. **Not executed.**
4. The human reviews the diff, edits anything they want, and runs the commands.

If the session ran on `main`, the proposal must say so and branch first. Editing files
on `main` is harmless — nothing is committed — but committing there is not.

**Rationale:** a `---AGENT-DONE---` block is a *claim*. It is only trustworthy because
a human can check it against the working tree in seconds. If the agent has already
committed and pushed, that check requires archaeology instead.

→ Block format: [`AGENTS.md` §4b](../AGENTS.md). Branch and PR rules that the human
follows: [`GIT-WORKFLOW.md`](GIT-WORKFLOW.md).

### Gate Status Values

The harness reads the Status field and acts immediately:

| Status | Action |
|---|---|
| `PASS` | Code verified by running it. Invoke next agent automatically. |
| `PASS (STATIC ONLY)` | Code verified by reading files only — runtime verification not possible. Gate conditionally passed. Flag must be resolved before Gate 3. Stop and surface the reason. |
| `FAIL` | Stop. Report to user. Do not proceed. |
| `NEEDS-REVIEW` | Stop. Show issues. Ask user to decide. |
| Next = `GATE` | Stop. Report full pipeline status. Wait for approval. |
| Next = `END` | Pipeline complete. Update PROJECT_STATE.md. |

### PASS (STATIC ONLY) — mandatory surfacing

When an agent cannot verify its output by running it (e.g. no JDK for Android,
no browser for frontend rendering), it MUST use `PASS (STATIC ONLY)` and include:

```
Status: PASS (STATIC ONLY)
Issues: Runtime verification deferred — [reason, e.g. "no JDK/Android SDK in environment"]
        Must be resolved before Gate 3.
```

**Never use PASS for something you couldn't run. Never use PASS (STATIC ONLY)
for something you could run but chose not to.**

**To get the completion signal:** When invoking any agent, append to your
invocation prompt: "When complete, output the ---AGENT-DONE--- block with
your status, output file path, and the next agent from the pipeline."

### 2c. Optional roles — SKIP, do not substitute

Some pipeline roles have no agent file in the Developer Edition. The authoritative
list is [`agents/MANIFEST.md` §5](../agents/MANIFEST.md). They are:

`legacy-codebase-analyst` · `modernization-strategist` · `data-migration-planner` ·
`devops-automator` · `accessibility-auditor` · `reality-checker` ·
`performance-benchmarker`

When a template reaches one:

```
Issues: SKIPPED Gate 0.5 (data-migration-planner) — optional role, not shipped
        in Developer Edition. Schema mapping and validation queries written
        inline by engineering-senior-developer and recorded in
        specs/[feature]-api-contract.md.
```

**Rules:**
1. Do **not** substitute a different agent for the role.
2. Do **not** improvise the role inline and report it as a pass.
3. If the skipped role was a **prerequisite** for the next step, that step does not
   start. `PIPELINE-BROWNFIELD` and `PIPELINE-INTEGRATION-TEST` both depend on
   unshipped roles and therefore **cannot run end-to-end in this edition**. Detect
   this at template selection, not mid-pipeline.

Every skip is logged in `Issues`. A pipeline that skips silently has misreported
its own coverage.

---

### 2a. Surgical Scope Rule (mandatory for all agents that write or edit code)

This rule applies from the moment an agent begins any implementation task.
It is not optional and is not relaxed for "small" changes.

```
SURGICAL SCOPE — MANDATORY

1. TOUCH ONLY what the task description and acceptance criteria require.
   Every changed line must trace directly to the request.

2. DO NOT refactor, reformat, or improve adjacent code, comments, or
   formatting — even if you would do it differently.

3. MATCH the existing style of any file you edit.
   Do not impose your own conventions.

4. IF you notice unrelated issues (dead code, naming problems, inefficiencies):
   → Note them in the Issues field of ---AGENT-DONE---
   → Do NOT fix them

5. REMOVE only imports, variables, and functions that YOUR changes made unused.
   Do not clean up pre-existing orphans unless explicitly asked.

6. SCOPE field in ---AGENT-DONE--- is mandatory:
   List every file and function you changed.
   If you changed something not on this list, you violated surgical scope.
```

**The test:** Could a reviewer trace every changed line directly back to the
acceptance criteria? If not, revert the untraced changes before reporting DONE.

---

### 2b. Pre-Completion Self-Check (mandatory before every ---AGENT-DONE---)

Before emitting `---AGENT-DONE---`, every agent must run this internal check:

```
1. Re-read your output against the acceptance criteria in the feature playbook
2. Check your role's Self-Verification Checklist (defined in your agent file)
3. Verify surgical scope: did you touch anything outside the task boundary?
4. If any criterion is unmet or scope was exceeded: self-correct before reporting

Report in ---AGENT-DONE--- block:
Self-check: PASS | SELF-CORRECTED ([describe what was fixed])
```

---

## 3. When the Pipeline Stops for Human Input

The harness interrupts the user ONLY at these moments:

| Stop condition | What the user does |
|---|---|
| Agent emits `Status: FAIL` | Fix the issue or give a decision, then say "resume" |
| Agent emits `Status: NEEDS-REVIEW` | Review output, then say "approved" or give a redirect |
| Agent emits `Status: PASS (STATIC ONLY)` | Acknowledge and decide whether to defer or resolve now |
| Pipeline reaches a `GATE` step | Check the gate checklist, then say "approved" or list issues |
| Context hits 50% | Compact, then say "resume pipeline for [FEATURE-ID] from [AGENT]" |
| Non-negotiable constraint violated | Escalate — never proceed without explicit approval |

Everything else runs without interruption.

---

## 3a. Step 0 — Session Reconnaissance (read-only, before any file changes)

The agent does not create branches — the human does. But the agent must still know
what it is working on, and must warn the human about a bad starting state.

```bash
# 1. Where are we? (read-only)
git branch --show-current

# 2. Is the tree clean? Uncommitted work means someone else's session
#    is in progress. STOP and report if so.
git status --short

# 3. Are other AI sessions active on overlapping scope?
git branch -a | grep "ai/"
```

**What the agent does with the answer:**

| Finding | Action |
|---|---|
| On a feature branch, tree clean | Proceed normally. |
| On `main`, tree clean | Proceed, but the session-close proposal must open with "ran on `main` — branch first". |
| On `main` with uncommitted changes | **Stop.** Someone is mid-session. Report before touching anything. |
| Another `ai/` branch touching the same files | **Stop.** Two sessions on one module produce conflicting output. Report it. |
| Uncommitted changes on any branch | **Stop and ask.** Never modify or discard work you did not create. |

Editing files on whatever branch is checked out is fine — nothing is committed until
the human acts. The risk this guards against is the agent *silently* stacking its
changes on top of someone else's uncommitted work.

**Branch naming** (the human creates it; the agent proposes the name):
```
ai/[project-slug]-[phase]-[YYYY-MM-DD]
```

Examples:
```
ai/proggya-analytics-f01-f03-2026-05-18
ai/nfdms-billing-module-2026-05-20
```

The `ai/` prefix makes AI-generated branches immediately distinguishable from human
branches in the GitHub UI.

**If a human developer is active on the same files:**
1. Branch from the developer's branch, not from `main`
2. Name: `ai/[project]-[phase]-from-[dev-branch]-[date]`
3. The PR targets the developer's branch, not `main`

The human developer has final say over code that touches their module.

---

## 4. How to Invoke a Pipeline

In the harness session:

```
"Run the pipeline for [FEATURE-ID]"
```

The harness will:
1. Read the feature's playbook file
2. Identify the pipeline template from the `PIPELINE:` field in that file
3. Execute each step in sequence
4. Stop only at GATE or failure
5. Report status at every gate

**Running multiple features:**
```
"Run the full pipeline for [phase or service name]"
```

The harness executes all features in dependency order, stopping at each GATE
for approval before moving to the next feature.

**Resuming a paused pipeline:**
```
"Resume the pipeline for [FEATURE-ID] from [AGENT-NAME]"
```

The harness reads `PROJECT_STATE.md` to confirm position, then continues.

**Retry behaviour:** When an agent emits `FAIL` on a quality check, the
previous implementation agent fixes and re-runs — up to the retry limit
(Section 4.1). After the retry limit, escalate to `NEEDS-REVIEW`.

### 4.1 Standard Retry Defaults

Only shipped agents appear here. Optional roles (§2c) are not auto-retried — they
are skipped.

| Check type | Auto-retry limit | On limit exceeded |
|---|---|---|
| `security-check` | 2 | NEEDS-REVIEW |
| `API Tester` (`testing-api-tester`) | 2 | NEEDS-REVIEW |
| `integration-tester` (Gate 1.5) | 2 | NEEDS-REVIEW |
| `build-validator` | 1 | FAIL |
| `code-simplifier` | 1 | NEEDS-REVIEW |
| `demo-walkthrough-validator` (Gate 3) | 0 | NEEDS-REVIEW immediately (never auto-fix demo) |
| `deployment-topologist` (Gate 2.75) | 0 | NEEDS-REVIEW immediately (a wrong topology is a decision, not a bug) |

---

## 5. Pipeline Templates

Copy the relevant templates into your project's `CLAUDE.md` under a
`## Pipeline Templates` section. Adapt agent names to match your
project's active AGENT_REGISTRY.md.

Each feature's playbook file declares which template to use via the
`PIPELINE:` field. The harness reads this field to know which sequence
to execute.

### 5.0 Which Template? (Decision Tree)

Before starting any pipeline, answer these questions to select the right template:

```
1. Does the project start from an existing codebase that needs modernization?
   YES → PIPELINE-BROWNFIELD
          ⚠ NOT RUNNABLE in Developer Edition — requires 3 optional roles.
            STOP and tell the user before starting.
   NO  → continue

2. Does the project have a user-facing frontend (web UI, mobile app)?
   YES → select based on platform:
         - Web (React, Next.js, Livewire) → PIPELINE-UI-FRONTEND
         - Android native (Kotlin)       → PIPELINE-ANDROID
   NO  → continue

3. Is the project API/service only (no frontend)?
   YES → PIPELINE-API-ONLY
   NO  → continue

4. Is the project primarily infrastructure/deployment?
   YES → PIPELINE-DEVOPS
   NO  → continue

5. Is the project a cryptographic feature (QR, JWT, signing)?
   YES → PIPELINE-QR-CRYPTO
   NO  → continue

6. Is the project spec/design work only?
   YES → PIPELINE-SPEC
   NO  → PIPELINE-BACKEND-API (default)

Additional modifiers (apply to any template):
- Data model changes between old and new? → Add Gate 0.5 (optional role, SKIP per §2c)
- Client delivery (not internal)? → Gate 2.75 FULL mode is MANDATORY
- Internal project? → Gate 2.75 runs in LIGHTWEIGHT mode
```

**Template availability in Developer Edition.** Two templates depend on roles that
are not shipped (§2c). Detect this at selection time, not mid-pipeline:

| Template | Available | Blocked on |
|---|---|---|
| PIPELINE-BACKEND-API | ✅ | — |
| PIPELINE-UI-FRONTEND | ✅ | — |
| PIPELINE-API-ONLY | ✅ | — |
| PIPELINE-DEVOPS | ✅ with §2c skips | `devops-automator` |
| PIPELINE-ANDROID | ✅ with §2c skips | `devops-automator` |
| PIPELINE-SPEC | ✅ with §2c skips | `reality-checker` |
| PIPELINE-QR-CRYPTO | ✅ | — |
| PIPELINE-BROWNFIELD | ❌ | 3 optional roles |
| PIPELINE-INTEGRATION-TEST | ❌ | 2 optional roles |

**Note on Gate 1.5:** Every template that builds runnable software includes
Gate 1.5 (Runtime Verification) between Gate 1 and Gate 2. This gate is owned by
`integration-tester` and requires real running services. It cannot be skipped and
cannot be declared `PASS (STATIC ONLY)`. It has two modes — frontend+backend and
service-only — defined in Section 5.1. Select the mode from the template, not from
what is convenient to verify.

**Note on Gate 2.75:** All pipeline templates include Gate 2.75 (Deployment
Topology) after Build Validator. Owned by `deployment-topologist`. FULL mode for
client delivery, LIGHTWEIGHT for internal. See Section 5.2.

**Simplicity constraint (applies to every pipeline step that produces code):**
Before writing any implementation, every agent must ask: is this the minimum
code that solves the problem? Would a senior engineer say this is overcomplicated?
If yes — choose the simpler path before starting. `code-simplifier` runs
post-gate as cleanup, but simplicity is a build constraint, not a cleanup task.

---

### 5.1 Gate 1.5 — Runtime Verification

```
### Gate 1.5 — Runtime Verification

Owner: testing-integration-tester agent
Runs: After each runnable feature is built, before Gate 2
Modes: A (frontend + backend) | B (service-only)

────────────────────────────────────────────────────────────
MODE A — frontend + backend
────────────────────────────────────────────────────────────

Step 1: docker compose up — verify all containers reach healthy state
        (all services must use condition: service_healthy, not plain depends_on)

Step 2: For each user-facing page, verify it loads without errors:
        - No 404
        - No blank page (unstyled HTML = FAIL)
        - No JavaScript crash in console
        - Renders at 375px without horizontal scroll

Step 3: For each API endpoint, execute a real cURL on the happy path:
        curl -X POST http://localhost:[port]/api/[endpoint] \
          -H "Content-Type: application/json" \
          -d '[minimal valid payload from frontend API client]'
        Expected: 200 response with expected response shape

Step 4: Verify at least ONE complete end-to-end user flow:
        e.g. register → OTP → confirm → see result
        Every step must succeed — partial completion = FAIL

Step 5: Verify frontend API calls reach the backend:
        No CORS errors, no 404s, no auth blocks for dev requests
        (Auth bypass must return demo user when APP_ENV=development)

Gate 1.5 Mode A FAILS if:
  - Any container fails health check
  - Any page returns 404 or renders blank/unstyled
  - Any happy-path endpoint returns 4xx/5xx
  - The end-to-end flow cannot be completed
  - Frontend API calls don't reach the backend

────────────────────────────────────────────────────────────
MODE B — service only (no user-facing frontend)
────────────────────────────────────────────────────────────

Used by PIPELINE-API-ONLY and any backend feature with no UI. Steps 2 and the
browser half of Step 5 do not apply — there is nothing to render.

Step 1: start the service and its dependencies; verify all reach healthy state
        (condition: service_healthy, not plain depends_on)

Step 2: SKIP — no user-facing surface in this template

Step 3: For each endpoint in the API contract, execute a real cURL:
        - Happy path   → 2xx with the expected response shape
        - Auth path    → 401 without a token, 200 with a valid one
        - Input path   → 4xx (not 5xx) on malformed or oversized input
        Verify the response shape against specs/[feature]-api-contract.md,
        field by field — not just the status code.

Step 4: Verify at least ONE complete business flow across services:
        e.g. write to service A → read back from service B via the real client
        Partial completion = FAIL

Step 5: Verify consumers reach the service:
        - Any service that calls this one does so successfully in a running stack
        - Auth and RBAC enforced as specified (no dev bypass in non-development env)
        - Health/readiness endpoints respond

Gate 1.5 Mode B FAILS if:
  - Any dependency fails health check
  - Any contract endpoint returns 5xx, or returns 2xx with a wrong shape
  - Malformed input returns 5xx instead of 4xx
  - A dev auth bypass is active outside the development environment
  - The cross-service flow cannot be completed

Gate 1.5 PASS (STATIC ONLY) is NEVER acceptable, in either mode — this gate
requires a running system. If services cannot start, FAIL and report why.

Declare the mode in the Pre-Task Declaration before starting. Running Mode A
checks against a service-only project wastes the run; running Mode B against a
frontend project means the UI was never verified.
```

---

### 5.2 Gate 2.75 — Deployment Topology

Full gate definition and FAIL criteria live in the owning agent file,
[`agents/custom/deployment-topologist.md`](../agents/custom/deployment-topologist.md).
Summary:

```
Owner:   deployment-topologist agent
Runs:    After Build Validator, before Demo Walkthrough Validator (Gate 3)
Mode:    FULL (client delivery) | LIGHTWEIGHT (internal project)

Produces specs/deployment/[project]-topology.md covering:
  target + justification · infrastructure · multi-tenancy (FULL) ·
  compliance checklist (FULL) · cost at launch and 10x ·
  monitoring thresholds · rollback procedure

Gate 2.75 FAILS if:
  - Deployment target has no justification tied to a real constraint
  - A cost estimate omits any infrastructure component
  - Scaling has no stated trigger metric
  - No rollback procedure, or one that ignores schema changes
  - FULL mode: missing compliance checklist for a reachable geography
  - FULL mode: multi-tenancy claimed but isolation model unstated
```

---

### PIPELINE-BROWNFIELD
*Use for: Modernizing existing codebases — monolith decomposition, legacy migration, brownfield refactoring*

> **⚠ NOT RUNNABLE in the Developer Edition.** Phase -1 requires
> `legacy-codebase-analyst` and `modernization-strategist`, and Gate 0.5 requires
> `data-migration-planner` — all three are optional roles (§2c). Do not start this
> template and discover the gap halfway through. Either author the agents
> ([`docs/AGENT-LIFECYCLE.md`](AGENT-LIFECYCLE.md)) or fall back to
> PIPELINE-BACKEND-API scoped to the extracted module.

```
Phase -1, Step 1: legacy-codebase-analyst → analyze existing codebase
                  ⚠ OPTIONAL ROLE — not shipped
                  Output: knowledge/legacy-analysis/ (6 artifacts)
                  Prompt: "Legacy Codebase Analyst — analyze the codebase at [path].
                           Produce all 6 mandatory artifacts. Do NOT prescribe solutions.
                           Include ---AGENT-DONE--- on completion."

Phase -1, Step 2: modernization-strategist → produce modernization plan
                  ⚠ OPTIONAL ROLE — not shipped
                  Input: all artifacts from Step 1
                  Output: knowledge/modernization-strategy/ (5 artifacts)
                  Prompt: "Modernization Strategist — using the legacy analysis in
                           knowledge/legacy-analysis/, produce the modernization PRD,
                           architecture proposal, extraction sequence, risk assessment,
                           and phased roadmap. Include ---AGENT-DONE--- on completion."

GATE -1: Review modernization strategy
         Human reviews: extraction sequence, risk assessment, phased roadmap
         Approve or redirect before pipeline proceeds

Gate 0:  engineering-backend-architect → receives modernization PRD as input
         (same gate as greenfield, different input source)
         MANDATORY: Data Access Matrix in ARCHITECTURE.md

Gate 0.5: data-migration-planner → if data models change (see Section 5.3)
          ⚠ OPTIONAL ROLE — SKIP per §2c, schema mapping folded into Step 1

Step 1:  engineering-senior-developer → implement per extraction sequence
Step 2:  security-check → mandatory
         MANDATORY: dev bypass for auth middleware

GATE 1.5: testing-integration-tester → Runtime Verification, Mode A or B
          (Section 5.1) — declare the mode

GATE:    build-validator → feature complete check

Step 3:  code-simplifier → refactor (own changes only — AGENTS.md §3)

GATE 2.75: deployment-topologist → Deployment Topology (Section 5.2)

GATE 3:  testing-demo-walkthrough-validator → Pre-Handover Check
         Includes verification that legacy → new data migration is correct

Step 4:  engineering-technical-writer → document the modernization
```

---

### PIPELINE-API-ONLY
*Use for: Backend API/service projects with no user-facing frontend — skip design gates*

```
Step 1:  engineering-backend-architect → design the API contract
         Output: specs/[feature]-api-contract.md
         MANDATORY: Data Access Matrix in ARCHITECTURE.md

Step 2:  engineering-senior-developer → implement
         Stack: [stack]. Output to src/[service]/[module]

Step 3:  security-check → mandatory if touches auth, PII, or external APIs
         MANDATORY: dev bypass gated on APP_ENV=development

Step 4:  testing-api-tester → contract test individual endpoints against spec

GATE 1.5: testing-integration-tester → Runtime Verification, **Mode B**
          (Section 5.1) — service-only; no page rendering checks

GATE:    build-validator → feature complete check

Step 5:  code-simplifier → refactor (own changes only — AGENTS.md §3)

GATE 2.75: deployment-topologist → Deployment Topology (Section 5.2)
           Mode: depends on project (client = FULL, internal = LIGHTWEIGHT)

Step 6:  engineering-technical-writer → document the module
```

---

### 5.3 Gate 0.5 — Data Migration Planning (conditional, brownfield pipeline)

```
### Gate 0.5 — Data Migration Planning

Owner: data-migration-planner agent  ⚠ OPTIONAL ROLE — not shipped in this edition
Runs: After Gate 0 defines target architecture, before implementation starts
Condition: Only invoked when the extraction sequence flags data model changes

When the agent is not available (the default in this edition), SKIP per §2c and
have engineering-senior-developer write the five outputs below inline into
specs/[feature]-api-contract.md, recording the skip in Issues.

Outputs (whoever writes them):
  1. Schema mapping (field-by-field, legacy → target)
  2. ETL strategy (batch, CDC, or dual-write)
  3. Dual-write period plan (if applicable)
  4. Rollback plan (per migration phase)
  5. Data validation criteria (executable queries)

Gate 0.5 FAILS if:
  - Any legacy table has no mapping entry
  - Rollback plan is missing for any migration phase
  - Validation queries are pseudocode instead of executable SQL
  - Dual-write cutover criteria is "when we're confident" instead of measurable

Gate 0.5 is SKIPPED (not failed) when:
  - The extraction sequence explicitly states no data model changes for this phase
  - The owning role is an optional role that is not shipped (record the skip)
  - Document the skip reason in the pipeline log
```

---

### PIPELINE-SPEC
*Use for: Generating specification and architecture documents*

```
Step 1:  Backend Architect  → generate the spec document
         Prompt: "Backend Architect — generate [spec file] based on
                  CLAUDE.md and knowledge/specs/BRD.md. Output to
                  specs/[filename].md. Include ---AGENT-DONE--- on completion."
Step 2:  reality-checker      → validate the spec
         ⚠ OPTIONAL ROLE — not shipped; SKIP per §2c. Backend Architect
         self-checks the spec against BRD.md before submitting.
         Prompt: "Reality Checker — review specs/[filename].md.
                  Flag any assumptions that contradict BRD.md or
                  the architecture constraints in CLAUDE.md.
                  Include ---AGENT-DONE--- on completion."
Step 3 (if FAIL): engineering-backend-architect → revise and resubmit (max 1 retry)
GATE:   All spec files for this phase complete
```

---

### PIPELINE-BACKEND-API
*Use for: Backend API features (FastAPI, Node.js, etc.)*

```
Step 1:  engineering-backend-architect → design the API contract
         Output: specs/[feature]-api-contract.md
         MANDATORY additional output: Data Access Matrix in ARCHITECTURE.md
         (for every view: what data, which service/DB, how frontend gets it)

Step 2:  engineering-senior-developer → implement
         Stack: [stack]. Output to src/[service]/[module]

Step 3:  security-check → mandatory if touches auth, PII, or external APIs
         MANDATORY: verify dev bypass exists and is gated on APP_ENV=development

Step 4:  testing-api-tester → contract test individual endpoints against spec

GATE 1.5: testing-integration-tester → Runtime Verification (see Section 5.1)
          Verifies the contract at runtime with real API calls. Declare Mode A
          if a frontend consumes this feature, Mode B if it is service-only.

GATE:    build-validator → feature complete check

Step 5:  code-simplifier → refactor (own changes only — AGENTS.md §3)

GATE 2.75: deployment-topologist → Deployment Topology (Section 5.2)

Step 6:  engineering-technical-writer → document the module
```

---

### PIPELINE-UI-FRONTEND
*Use for: Frontend UI features (React, Next.js, React Native)*

```
Step 1:  ux-researcher        → journey map
         MANDATORY outputs before Frontend Developer starts:
         1. First-time user journey (what does user see on first visit?)
         2. Returning user journey (what happens on return visits?)
         3. Error recovery (what if session/data is lost?)
         4. Entry points (what does every URL path show?)
         5. Session management (how does login/logout work?)
         Output: specs/[feature]-ux-journeys.md
         Frontend Developer MUST NOT start until all 5 are answered.

Step 2:  design-ui-designer   → screen design spec (MANDATORY GATE — not optional)
         Output: specs/[feature]-ui.md with component specs and interaction states
         Gate 1.5a Visual Design Check:
         □ CSS framework configured (Tailwind smoke test: bg-red-500 renders)
         □ Every page styled (no bare HTML)
         □ 375px renders without horizontal scroll
         □ Touch targets >= 48dp
         □ Consistent color palette
         Full checklist: agents/third-party/design-ui-designer.md

Step 3:  engineering-frontend-developer → implement
         MANDATORY setup before any component work:
         - CSS framework configured and smoke-tested
         - API base URL uses env var, never hardcoded production domain
         - router.replace() for step transitions (not router.push())
         - Every protected page checks prerequisites on mount
         - i18n: every user-visible string through t(lang, key)

Step 4:  accessibility-auditor → WCAG review + i18n completeness audit
         ⚠ OPTIONAL ROLE — not shipped; SKIP per §2c. WCAG and i18n checks
         fold into the Gate 1.5a checklist and Gate 1.5 Mode A.
         (public-facing UI only; bilingual apps always)

Step 5:  security-check → if feature handles auth or user data

GATE 1.5: testing-integration-tester → Runtime Verification, **Mode A**
          (see Section 5.1) — frontend and backend both running

GATE:    build-validator → feature complete check
Step 6:  code-simplifier → refactor (own changes only — AGENTS.md §3)

GATE 2.75: deployment-topologist → Deployment Topology (Section 5.2)

Step 7:  engineering-technical-writer → document
```

---

### PIPELINE-ANDROID
*Use for: Native Android / Kotlin features*

```
Step 1:  engineering-backend-architect → design the module contract
         Output: specs/[module]-android-contract.md
         (SQLite schema, sync protocol, offline-failure modes)

Step 2:  devops-automator → create Android build system FIRST
         ⚠ OPTIONAL ROLE — not shipped; SKIP per §2c and let
         engineering-senior-developer create the build files.
         MANDATORY before any Kotlin code:
         □ app/build.gradle.kts (compileSdk, targetSdk, minSdk, all deps)
         □ build.gradle.kts (root, AGP version)
         □ settings.gradle.kts (project name, module include)
         □ gradlew + gradlew.bat (executable)
         □ gradle/wrapper/gradle-wrapper.properties (distribution URL)
         □ app/src/main/AndroidManifest.xml (package, permissions, activities)
         □ local.properties (sdk.dir)
         Compile verification: ./gradlew assembleDebug → BUILD SUCCESSFUL
         If environment lacks JDK/SDK: emit PASS (STATIC ONLY), list all 7 files

Step 3:  engineering-frontend-developer → implement in Kotlin
         Output: src/station-terminal/[module]

Step 4:  build-validator → verify offline scenario explicitly
         Capability declaration REQUIRED at start of session
         If ./gradlew assembleDebug cannot run: PASS (STATIC ONLY)

Step 5:  security-check → mandatory for QR, auth, and data modules
         MANDATORY: dev bypass gated on APP_ENV=development

GATE 1.5: testing-integration-tester → Runtime Verification, **Mode A**
          (see Section 5.1) — exercises the app's sync and offline paths
          against the real backend. Requires a device or emulator; without one
          this gate FAILS and reports the missing device rather than deferring.

Step 6:  code-simplifier → refactor (own changes only — AGENTS.md §3)

GATE 2.75: deployment-topologist → Deployment Topology (Section 5.2)
           (store submission, CI signing, rollout and staged release)

Step 7:  engineering-technical-writer → document
```

---

### PIPELINE-QR-CRYPTO
*Use for: Cryptographic features (QR signing, JWT, ECDSA, token validation)*

```
Step 1:  Backend Architect  → design the cryptographic contract
         Output: specs/[feature]-crypto-spec.md
         (algorithm, key management, token structure, verification flow,
          online and offline modes)

Step 2:  AI Engineer        → implement
         Use: [algorithm, e.g. ECDSA P-256 with JWT]
         Output: src/[service]/[module]

Step 3:  engineering-security-engineer → mandatory deep review
         (key generation, storage, signing, verification, replay attacks,
          cloning resistance)
         MANDATORY: dev bypass for any auth layer

Step 4:  testing-api-tester → test vectors and edge cases

GATE 1.5: testing-integration-tester → Runtime Verification (see Section 5.1)

GATE:    build-validator → feature complete check
Step 5:  code-simplifier → refactor (own changes only — AGENTS.md §3)

GATE 2.75: deployment-topologist → Deployment Topology (Section 5.2)

Step 6:  engineering-technical-writer → document the cryptographic design
```

---

### PIPELINE-DEVOPS
*Use for: CI/CD, infrastructure, deployment, Docker, Kubernetes*

```
Step 1:  engineering-backend-architect → infrastructure design
         Output: specs/[component]-infra.md
         (topology, scaling triggers, failover, secrets management)

Step 2:  devops-automator → implement
         ⚠ OPTIONAL ROLE — not shipped; SKIP per §2c and let
         engineering-senior-developer implement the infrastructure config.
         MANDATORY Docker Compose standards:
         - All services use condition: service_healthy (not plain depends_on)
         - healthcheck defined for every stateful service (postgres, redis, etc.)
         - Verify: docker compose up starts all services without connection errors

Step 3:  security-check → mandatory (secrets, network policies, access)

GATE 1.5: testing-integration-tester → Runtime Verification, **Mode B**
          (see Section 5.1) — verify all services start and respond correctly

GATE:    build-validator → deployment config complete check

GATE 2.75: deployment-topologist → Deployment Topology (Section 5.2)

Step 4:  engineering-technical-writer → deployment and operations runbook
```

---

### PIPELINE-INTEGRATION-TEST
*Use for: End-to-end testing, load testing, penetration test*

> **⚠ NOT RUNNABLE in the Developer Edition.** Step 1 requires
> `performance-benchmarker`, which is not shipped. Author it
> ([`docs/AGENT-LIFECYCLE.md`](AGENT-LIFECYCLE.md)) or run the template from
> Step 2 onward.

```
Step 1:  performance-benchmarker → load test
         ⚠ OPTIONAL ROLE — not shipped
         Output: tests/perf/[test-name]-results.md

Step 2:  engineering-security-engineer → penetration test
         Output: tests/security/pentest-[service].md
         (OWASP Top 10, auth bypass, injection, data exposure)

Step 3:  evidence-collector → compile handover proof artefacts
         Output: handover/evidence/ (INDEX.md is the deliverable)

GATE 3:  testing-demo-walkthrough-validator → Gate 3 Pre-Handover Check
         - Fresh start: docker compose down -v && docker compose up
         - Complete entire primary user flow from scratch
         - STUB_REGISTRY.md audit (every stub verified)
         - Visual completeness check (every page styled, 375px, i18n)
         Any failure = Gate 3 FAIL, handover blocked

Step 4:  engineering-technical-writer → deployment guide + operations runbook
```

---

## 6. Playbook Feature File Format

Every feature file must contain a `PIPELINE:` field. The harness reads
this field to know which template to run.

```markdown
# [FEATURE-ID] — [Feature Name]

## Linear Issue
TR-XXX

## Pipeline
PIPELINE: [template name, e.g. PIPELINE-BACKEND-API]

## Context Files
- [spec or schema files this feature depends on]

## Acceptance Criteria
- [criterion 1 — must be binary: pass/fail checkable]
- [criterion 2]

## Security Flag
[YES — triggers security-check | NO]

## Performance Target
[target or N/A]

## Done When
[definition of done — what build-validator checks against]
```

---

## 7. STUB_REGISTRY.md — Required Project Deliverable

Every project with stubbed external services must maintain `docs/STUB_REGISTRY.md`.
This file is a **required deliverable** — not optional, not created after the fact.
Create it at project setup. Update it whenever a stub is added.

```markdown
# Stub Registry — [Project Name]

Every external integration that is stubbed in development must have an entry here.
The demo-walkthrough-validator agent verifies this file at Gate 3.

| Integration | Production behaviour | Stub behaviour | Demo UX (what user sees) | Backdoor | Dev rate limit | Log output |
|---|---|---|---|---|---|---|
| SMS/OTP | Sends real SMS | Generates code, doesn't send | Green banner: "Demo OTP: [code]" | 1234 always works | 100/10min | [DEV STUB] OTP: {code} |
| Payment gateway | Processes real payment | Returns success immediately | "Demo mode: payment approved" | N/A | N/A | [DEV STUB] Payment simulated |
| Email service | Sends real email | Logs to console | N/A (background) | N/A | N/A | [DEV STUB] Email: {recipient} |

## Dev Auth Bypass
| Service | Auth method | Bypass condition | Bypass behaviour | Log output |
|---|---|---|---|---|
| admin-service | JWT + RBAC via Kong | APP_ENV=development AND no Authorization header | Returns demo admin user (highest privilege) | [DEV BYPASS] Auth skipped — demo user returned |
```

**Stub entry requirements (for every row):**
1. What does the USER see? (not just what the code does)
2. How does the user proceed without the real integration?
3. Is there a backdoor code/bypass? Document it explicitly.
4. What rate limits apply for testing? (>=100/10min for any demo-tested flow)
5. What does the stub log? Can a developer trace what happened?

**The demo-walkthrough-validator agent will FAIL Gate 3 if:**
- Any external integration is not in STUB_REGISTRY.md
- Any stub entry is missing the Demo UX column
- Any demo-tested flow has a rate limit below 100/10min
- Any dev auth bypass is undocumented
- A dev bypass is reachable outside the development environment

> **Security note.** The `[DEV BYPASS]` pattern returns a **highest-privilege demo
> user** with no credentials. It is gated on `APP_ENV=development` and must never
> be reachable in staging or production. Gate 1.5 Mode B and Gate 2 both verify
> that gating. A bypass that is not environment-gated is a `security-check` FAIL,
> not a `NEEDS-REVIEW`.

---

## 8. SESSION_CLOSE Protocol

**Owner: `project-shepherd` agent** — [`agents/custom/project-shepherd.md`](../agents/custom/project-shepherd.md)

At the end of every session, before exiting the harness, invoke it:

```
"project-shepherd — run SESSION_CLOSE"
```

The agent reconciles state against git and drafts the PR body. It does **not**
commit, push, or open the PR — those stay human actions under
[`GIT-WORKFLOW.md`](GIT-WORKFLOW.md).

It handles:
1. Reconciles `PROJECT_STATE.md` — session position, completed features with
   evidence, outstanding items, blockers
2. Updates `playbook/PROGRESS.md` — feature and milestone completion log
3. Updates `README.md` — features/milestones only if something was built
4. Drafts the **PR description** with a specific *review focus*

**Escalation:** if local and remote HEAD disagree, or the state files claim work
git cannot support, it stops and reports the conflict rather than editing state to
match the claim.

Then, **the developer** runs — `project-shepherd` proposes these, it does not run them:

```bash
# Review the diff first
git status --short && git diff --stat && git diff

# Branch (if the session ran on main)
git checkout -b ai/[project-slug]-[phase]-[YYYY-MM-DD]

# Commit on the session branch (NOT main)
git add <paths>
git commit -m "[session-close] brief description of what was built"

# Push the session branch
git push -u origin ai/[project-slug]-[phase]-[YYYY-MM-DD]

# Verify the push landed — empty output = success
git fetch origin && git log HEAD...origin/ai/[project-slug]-[phase]-[YYYY-MM-DD] --oneline

# Open PR for review using the body project-shepherd drafted
gh pr create --title "[AI] [Project] [phase range] — [summary]" \
             --body "[paste drafted body]" \
             --base main
```

**Important:** the PR description is not optional, and a *specific review focus* is
mandatory — "please review" is the most common reason an AI-generated PR gets
rubber-stamped instead of read.

Then report to the team channel:

```
Build update:
Completed: [issue IDs and titles]
Next planned: [next issue ID]
Decisions needed: [from Open decisions in the topology/state docs]
Linear to update: [which issues to mark Done / In Progress]
```
