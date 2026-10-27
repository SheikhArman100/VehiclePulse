# Developer Guide — Extending the AI OS

For the team lead or a developer adding skills, agents, or gates to the AI
Operating System.

**If you are here to *build software*, you want [FOR-DEVELOPERS.md](FOR-DEVELOPERS.md).**
This doc is for changing the system itself.

| You need | Read |
|---|---|
| Set up a harness | [INSTALL.md](INSTALL.md) |
| Run a build | [FOR-DEVELOPERS.md](FOR-DEVELOPERS.md) |
| Add or upgrade an agent | **[this doc](DEVELOPER-GUIDE.md)** and [AGENT-LIFECYCLE.md](AGENT-LIFECYCLE.md) |
| Add a skill | [Adding a New Skill](#adding-a-new-skill) |
| Understand a gate | [PIPELINE_PROTOCOL.md](PIPELINE_PROTOCOL.md) |

---

## Repository Layout

```
ai-operating-system-team/     ← this repo — the team build of the AI OS
├── AGENTS.md                 ← entry point every harness reads; owns the gate sequence
├── capability-index.json     ← skill/agent inventory the planner dispatches against
├── agents/
│   ├── MANIFEST.md           ← CANONICAL AGENT REGISTRY
│   ├── custom/               ← authored by Softograph
│   └── third-party/          ← imported, never edited in place
├── skills/
│   └── team/                 ← the three Developer Edition skills
├── docs/                     ← protocols and guides
└── tools/
    └── verify-workflow.mjs   ← CI gate; must exit 0
```

### Master vs team repo

The **master** repo (`ai-operating-system`) is the single source of truth and holds
the full skill catalogue, including the personal skills and the business-function
skills. This repo is a **team build output**: a developer-only subset, synced from
master.

| | Edit here? |
|---|---|
| Authoring a new skill or agent | **No** — author it in master, then re-sync |
| Fixing a wrong gate definition or broken link | **Yes** — and fix it in master too, or the next sync reverts it |
| Project code, feature work | Never — that lives in the project's own repo |

**Never edit `agents/third-party/` in place.** Copy the file to `agents/custom/`,
change `source:` to `softograph-adapted`, and edit the copy. This keeps provenance
traceable when the upstream version is refreshed.

---

## Adding a New Skill

### 1. Decide: team or personal?

| Profile | Location | Synced to team repo? |
|---|---|---|
| Team skill | `skills/team/[skill-name]/` | Yes |
| Personal skill | `skills/personal/[skill-name]/` | No — master only |

This edition ships three team skills: `dev-orchestrator`, `claude-code-protocol`,
`frontend-design`.

### 2. Required frontmatter

```yaml
---
name: skill-name              # must match the directory name exactly
capabilities: [some.capability-id]
produces: [what-it-outputs]
consumes: [what-it-inputs]
description: "Trigger phrases and use cases — this is what the harness reads to decide when to activate the skill."
domain: team
version: 1.0.0
---
```

**`capabilities:` is not optional.** The planner dispatches skills by exact match on
this key — a skill without it is invisible and will never be reached for, no matter
how good its description is. `node tools/verify-workflow.mjs` fails the build without
it. This is not theoretical: `claude-code-protocol` shipped for months with no
capability key and was silently undispatchable.

Add the same id to [`capability-index.json`](../capability-index.json) so the index
and the frontmatter agree.

### 3. Body structure

```markdown
# Skill Name

One-paragraph summary of what this skill does.

## Workflow Overview
[phases and steps]

## Phase 1: [Name]
[detailed instructions for each phase]

## Quality Standards
[output checklist]

## Reference Documents
[links to any reference files]
```

### 4. Reference documents

```bash
mkdir skills/team/[skill-name]/references
```

Reference files load on demand, not automatically. The skill body must tell the
agent *when* to load each one.

### 5. Register and verify

- Add a row to `agents/MANIFEST.md` if the skill owns a gate or a pipeline role.
- Add a `## CHANGELOG` section to `SKILL.md`.
- Run `node tools/verify-workflow.mjs` — it must exit 0.

---

## Adding a New Agent

Full protocol including token cost estimates, isolation testing, versioning, and
upgrade procedures: **[AGENT-LIFECYCLE.md](AGENT-LIFECYCLE.md)**.

### 1. Placement

| Type | Location | `source:` |
|---|---|---|
| Built from scratch | `agents/custom/` | `softograph-custom` |
| External, unmodified | `agents/third-party/` | `agency-agents` |
| External, modified | `agents/custom/` (copy first) | `softograph-adapted` |

### 2. Required frontmatter

```yaml
---
name: human-readable-agent-name   # kebab-case; this is the id docs refer to
description: What this agent does and when to activate it. Be specific — this is what the planner reads.
source: softograph-custom
version: 1.0
added: YYYY-MM-DD
---
```

`verify-workflow.mjs` requires `name` and `description` on every agent file.

### 3. Body structure

Every agent file in this repo follows the same shape. Match it:

```markdown
# Agent Name

## Role Definition          ## Gate Ownership (if it owns one)
## Core Capabilities         ## Scope rule
## Workflow                 ## Pre-Task Declaration
## Output Format            ## Self-Verification Checklist
## Quality Standards
```

Two conventions are load-bearing across every agent file:

- **Pre-Task Declaration** — before starting, the agent states its assumptions, any
  interpretation choice it made, its scope boundary, and what it will not check.
- **Self-Verification Checklist** — before reporting done, it answers fixed
  questions about its own output. This is the last defence against a confident
  report of unverified work.

### 4. Register — this is not optional

An agent file that is not in `agents/MANIFEST.md` does not exist as far as the
workflow is concerned. `verify-workflow.mjs` fails the build on any role referenced
in a doc that has no manifest row.

1. Add a row to the right table in [`agents/MANIFEST.md`](../agents/MANIFEST.md)
2. If it appears in a pipeline template, update that template in
   [`PIPELINE_PROTOCOL.md`](PIPELINE_PROTOCOL.md)
3. Add it to [`capability-index.json`](../capability-index.json)
4. Run `node tools/verify-workflow.mjs`

### 5. Optional roles

A role can exist in a template without having a shipped agent — see
[`MANIFEST.md` §5](../agents/MANIFEST.md). Optional roles **must** be declared in
both `MANIFEST.md` §5 and `capability-index.json` `optionalRoles`, with the effect
of their absence (`template-unavailable` or `skip-inline`). A template that depends
on an undeclared optional role will break mid-pipeline.

---

## Skill vs Agent

```
Does the task need multi-step orchestration across phases?
  YES → Skill (skills orchestrate; agents execute one function)
  NO  → Agent

Is it a single focused role with one clear output?
  YES → Agent
  NO  → Skill

Does it need to run inside a harness session?
  BOTH can, but only agents are dispatched per-gate by the pipeline
```

**When to use both:** a skill briefs an agent. The skill defines strategy and
context; the agent produces the output. Run them in sequence, never in parallel on
the same task — e.g. `frontend-design` (skill) sets the design bar, then the
`engineering-frontend-developer` agent (agent) writes the code against it.

---

## Repository Integrity

This repo *is* the workflow. A broken link or an unlisted agent is a broken build
loop, not a cosmetic issue.

```bash
node tools/verify-workflow.mjs
node tools/verify-workflow.mjs --strict   # warnings also fail
```

| Check | What it catches |
|---|---|
| A/links | Relative markdown links that resolve to nothing |
| B/agents | A role referenced in a doc with no agent file and no optional declaration |
| C/skills | Missing `capabilities:`, duplicate names, name/directory mismatch |
| D/agents | Missing `name` or `description` frontmatter |
| E/gates | Gate ids that disagree between `AGENTS.md` and `PIPELINE_PROTOCOL.md` |
| F/assets | A referenced repo asset that does not exist |

Errors fail the build. Warnings report drift you may want to fix but that does not
block. CI runs the same command — see [`.github/workflows/verify.yml`](../.github/workflows/verify.yml).

### Editing `docs/install.sh`

The `write_rules()` function writes a global-rules file into each harness config.
**That body must stay consistent with `AGENTS.md`** — same gate sequence, same
agent names, same skill names. The verifier cannot check a shell heredoc, so this
is a manual obligation. If you change a gate in `AGENTS.md`, change it there too.

---

## Deploying Changes

```bash
# 1. Author in master
cd ~/Developer/AI-Operating-System
git checkout -b ai/<change-slug>-<YYYY-MM-DD>
git add -A && git commit -m "[component] brief description"
git push origin $(git branch --show-current)

# 2. Sync to the team repo, then verify it landed
cd ~/Developer/ai-operating-system-team
git pull origin
git fetch origin && git log HEAD...origin/$(git branch --show-current) --oneline
```

Commit format: `[component] brief description` — e.g. `[claude-code-protocol]
correct git protocol`. Branch rules: [GIT-WORKFLOW.md](GIT-WORKFLOW.md).

Then have each developer re-run `bash docs/install.sh` and start a new harness
session so it re-reads skills and agents.

---

## Troubleshooting

**`verify-workflow.mjs` reports an unlisted agent role.**
The role exists in a doc but not in `agents/MANIFEST.md`. Either author the agent
or declare it optional in §5. Do not silence it by adding the token to the
allowlist in the script — that hides the drift, it does not fix it.

**A skill loads but the planner never reaches for it.**
It has no `capabilities:` key, or the key does not match the plan step's capability
exactly. Check the frontmatter and `capability-index.json`.

**A gate ran in the wrong mode.**
Gate 1.5 has two modes (A: frontend+backend, B: service-only). Mode must be
declared in the template and in the agent's Pre-Task Declaration — running Mode B
against a frontend project means the UI was never verified.

**Install script fails partway.**
On Windows, run it under Git Bash rather than PowerShell or WSL. It needs no
`rsync`, `python3`, or other external tools — only `git`, `cp`, and `node`.

**Changes to this repo vanished.**
They were overwritten by a sync from master. This repo is a build output. Author in
master. See [Master vs team repo](#master-vs-team-repo).