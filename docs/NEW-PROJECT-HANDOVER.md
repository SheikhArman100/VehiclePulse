# New Build Project — Handover Guide

Everything needed to start a Claude Code build project using the Softograph AI Operating System. Read this once, then follow the setup steps in order.

---

## Part 1 — Create Your Claude.ai Project

Every build gets a dedicated Claude.ai Project. Do not use the AI OS automation project for builds.

### What to add to Project Knowledge

| Item | What to add | How |
|---|---|---|
| Product spec | Your whitepaper, concept note, or brief | Paste or upload |
| CLAUDE.md (configured) | The filled-in CLAUDE.md for this project (generate below) | Paste |
| AGENT_REGISTRY.md | Full agent registry from the orchestrator | Paste from `autonomous-agent-orchestrator/knowledge/specs/AGENT_REGISTRY.md` |
| Architecture decisions | Any specs already written | Paste |
| PROJECT_STATE.md | Created at end of first session | Paste and update each session |

**What NOT to add:** The full AI OS PROJECT_CONTEXT.md. That's Softograph operational context, not build context. Keep them separate.

### How the split works during a build

| Tool | Role |
|---|---|
| **Claude.ai (this project)** | Strategic PM — update Linear, review agent outputs, make decisions, check next steps |
| **Claude Code (terminal)** | Execution — runs agents, writes code, commits to git |

During a session: Claude Code builds. When it pauses at an approval gate, come to Claude.ai, review the output, decide, then go back to Claude Code with the instruction. Use `/compact` in Claude Code when context hits 50%.

---

## Part 2 — One-Time Machine Setup

Run these once. If you've already done them, skip to Part 3.

### Install agents and skills globally

Skip this if you already ran `bash docs/install.sh` from the team repo — it does all
of it. Manual equivalent:

```bash
REPO=~/Developer/ai-operating-system-team

# Agents (20 shipped in the Developer Edition)
cp "$REPO"/agents/custom/*.md ~/.claude/agents/
cp "$REPO"/agents/third-party/*.md ~/.claude/agents/

# Team skills
cp -r "$REPO"/skills/team/* ~/.claude/skills/

# Verify — the count must match agents/MANIFEST.md, and integrity must pass
ls ~/.claude/agents/*.md | wc -l
node "$REPO"/tools/verify-workflow.mjs
```

On opencode the equivalent targets are `~/.config/opencode/agents/` and
`~/.config/opencode/skills/`. See [INSTALL.md](INSTALL.md).

### Verify Claude Code CLI is installed

```bash
which claude
# If missing:
npm install -g @anthropic-ai/claude-code
```

---

## Part 3 — Per-Project Setup

Do this for every new build project.

### Step 1 — Create the GitHub repo

```bash
# Create repo on GitHub first (via UI or gh CLI)
gh repo create rahman-tawhid/[project-name] --private

# Clone it
git clone https://github.com/rahman-tawhid/[project-name]
cd [project-name]
```

### Step 2 — Generate your CLAUDE.md

Option A — Use the dev-orchestrator skill in Claude.ai:

```
[Load dev-orchestrator skill in Claude.ai]

Generate a CLAUDE.md for a new project:

Project name: [name]
Product: [which Softograph product or new product]
Project type: [new-feature / new-product / rfp-response / client-delivery]
Archetype: [web-app / api-only / content-platform / minimal / custom]
Tech stack: [your stack, e.g. Laravel/Livewire, Next.js/Supabase]
Repo URL: https://github.com/rahman-tawhid/[project-name]
Objective: [1-2 sentences on what this builds]
Key constraints: [performance, security, timeline, anything important]
Approval mode: hybrid

Generate the complete CLAUDE.md using the standard template.
```

Option B — Copy and fill the template manually:

```bash
cp ~/Developer/AI-Operating-System/docs/CLAUDE-template.md ./CLAUDE.md
# Fill in all [CONFIGURE] fields
```

### Step 3 — Create the Brain files

The Brain layer must exist before any architecture or code. Create these first:

```bash
mkdir -p knowledge/specs
mkdir -p knowledge/schema
```

Then populate:
- `knowledge/specs/BRD.md` — what problem this solves, what success looks like
- `knowledge/schema/SCHEMA.md` — data models and key interfaces
- `knowledge/specs/AGENT_REGISTRY.md` — copy from `autonomous-agent-orchestrator/knowledge/specs/AGENT_REGISTRY.md`

**Do not write a line of code until BRD.md and SCHEMA.md exist.** This is the Brain-Soul-Body constraint.

### Step 4 — Copy project-level agents (optional)

Only needed if you want an isolated agent set for this project:

```bash
mkdir -p .claude/agents
cp ~/Developer/AI-Operating-System/agents/custom/*.md .claude/agents/
cp ~/Developer/AI-Operating-System/agents/third-party/*.md .claude/agents/
```

If you installed globally in Part 2, skip this — global agents are already available.

### Step 5 — Initial commit

```bash
git add .
git commit -m "[init] project scaffold — CLAUDE.md, Brain files, agent directory"
git push
```

---

## Part 4 — Model Selection

| Task | Tool | Model | Why |
|---|---|---|---|
| Brain layer — BRD, architecture reasoning, requirements | Claude.ai chat | **Opus** | Deep multi-constraint reasoning. Worth the cost at planning stage. |
| Soul layer — CLAUDE.md generation, schema, specs | Claude.ai chat | **Sonnet** | Structured output. Sonnet handles this cleanly. |
| All Claude Code execution | Claude Code (terminal) | **Sonnet** | Speed + cost. CC sessions burn tokens fast. |
| Genuinely complex architectural problem in CC | Claude Code | Switch to Opus | Only if Sonnet hits a clear reasoning wall on a specific function. |

**Default rule:** Plan on Opus in Claude.ai. Build on Sonnet in Claude Code. Don't overthink it.

---

## Part 5 — Starting a Claude Code Session

```bash
cd ~/Developer/[project-name]
claude
```

Claude Code reads `CLAUDE.md` automatically on startup.

**First thing Claude Code will do:** Run the Session Start Protocol (artifact scan, depth declaration, prerequisites check). Let it complete before giving any instructions.

**Depth modes** — declare at session start:
- `(a) FULL PIPELINE` — run from current position forward
- `(b) SINGLE PHASE` — work within one phase only
- `(c) SINGLE FUNCTION` — one specific task
- `(d) REVIEW ONLY` — assess state, no execution

### Key Claude Code commands

```bash
# Run the full pipeline via the orchestrator
npm run orchestrate -- --project ./

# Resume an interrupted pipeline
npm run resume -- --project ./

# Check pipeline status
npm run status -- --project ./

# Re-run one agent without restarting the pipeline
npm run agent -- --agent senior-developer --project ./ --rerun

# Compact context when at 50% (use slash command inside CC session)
/compact

# Autonomous mode (only after manual experience with this codebase)
claude --dangerously-skip-permissions
```

---

## Part 6 — Agents Quick Reference

Invoke agents inside a Claude Code session with natural language. All of these are in `~/.claude/agents/` after the global install.

### Engineering

```
"Use the Backend Architect for this API design"
"Switch to the Senior Developer for implementation"
"Run the Frontend Developer on this component"
"Security Engineer — review this before we merge"
"Technical Writer — generate docs for this module"
"AI Engineer — integrate this model endpoint"
"Rapid Prototyper — I need a working demo by tomorrow"
"deployment-topologist — where does this run and what does it cost?"
```

### Quality gates (run between features — non-negotiable)

```
"build-validator — check this feature is complete"
"security-check — review anything touching auth or data"
"testing-api-tester — contract test this endpoint"
"testing-integration-tester — verify it works at runtime, Gate 1.5"
"verify-app — end-to-end check before this PR"
"code-simplifier — refactor what I just changed"
```

### Sales / proposal work (Phase 6)

```
"Proposal Strategist — structure this RFP response"
"Sales Engineer — write the technical section"
"Discovery Coach — prep questions for this prospect"
```

### When you need multiple agents in sequence

```
"Agents Orchestrator — I need to coordinate [agent A], [agent B],
and [agent C] in sequence for [task]. Define the handoff contract."
```

---

## Part 7 — Quality Gates (Do Not Skip)

These are hard stops. Work does not continue past a gate until it passes.

| Gate | When | What to verify |
|---|---|---|
| Gate 0 — Environment | Phase 04 entry | BRD.md, SCHEMA.md, directory structure, CLAUDE.md configured |
| Gate 1 — Architecture | Phase 04→05 | specs/ complete, playbook/ created, backend-architect sign-off |
| Gate 2 — Feature complete | After every feature in Phase 05 | build-validator ✅, security-check ✅ (if applicable), PROGRESS.md updated |
| Gate 3 — Pre-launch | Phase 05→06 | All features at Gate 2, verify-app ✅, docs complete |
| Gate 4 — Launch ready | Phase 06 | Brief approved, assets produced, tracking configured |

---

## Part 8 — End of Session Protocol

Before closing any Claude Code session:

```bash
# 1. Update PROJECT_STATE.md (Claude Code will do this if you ask)
"Update PROJECT_STATE.md for this session end"

# 2. Update PROGRESS.md if in Phase 05
"Update PROGRESS.md with what was completed this session"

# 3. Commit everything
git add .
git commit -m "[phase-05] [feature-name] — brief description of what was done"
git push
```

Then **update your Claude.ai Project Knowledge** with the new `PROJECT_STATE.md` content so the next session has full context.

---

## Part 9 — PM Handover Back to AI OS Project

When you want to update Linear or make strategic decisions, come back to the AI OS Claude.ai project (this project) and say:

```
Build update for [project name]:
- Completed: [what was done]
- Blocked: [any blockers]
- Decision needed: [what you need to decide]
- Linear: [what to update]
```

I will update Linear, suggest the next priority, and give you the instruction to take back to Claude Code.

---

## Quick Checklist — New Project in 10 Minutes

```
□ Create Claude.ai Project for the build
□ Create GitHub repo + clone locally
□ Copy CLAUDE-template.md → CLAUDE.md → fill [CONFIGURE] fields
□ Create knowledge/specs/BRD.md (what problem, what success looks like)
□ Create knowledge/schema/SCHEMA.md (data models)
□ Copy AGENT_REGISTRY.md from orchestrator repo into knowledge/specs/
□ Verify agents are installed: ls ~/.claude/agents/ | wc -l
□ git add . && git commit -m "[init] scaffold" && git push
□ cd [project] && claude
□ Declare depth mode at session start
□ Begin Phase 04 (or wherever you're entering)
```

---

*This document lives at `ai-operating-system/docs/NEW-PROJECT-HANDOVER.md`*  
*Raw link: `https://raw.githubusercontent.com/rahman-tawhid/ai-operating-system/main/docs/NEW-PROJECT-HANDOVER.md`*
