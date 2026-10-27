# Agent Lifecycle Protocol

How to add new agents and upgrade existing ones without burning tokens or breaking
pipelines.

**Owner:** the team lead  
**Applies to:** the master `ai-operating-system` repo and this team build

> Steps that mention the `autonomous-agent-orchestrator` runtime are **optional** —
> that is a separate TypeScript repo used only for unattended loop/graph dispatch.
> The Developer Edition does not require it. Where this doc mentions it, treat the
> step as skippable unless you have that runtime installed.

---

## The Token Cost Reality

Before doing anything, understand what each action costs:

| Action | Approximate token cost | Risk if wrong |
|---|---|---|
| Isolation test (`npm run agent`) | ~$0.01–0.05 | Zero — no pipeline state touched |
| Single pipeline run (5–7 agents) | ~$0.50–2.00 | Medium — state written, outputs generated |
| Full pipeline re-run after bad upgrade | ~$0.50–2.00 wasted | High — all prior outputs may be invalidated |
| `--rerun` on one agent | ~$0.05–0.20 | Low — only one agent's state and output reset |

**Rule:** Always isolation-test before any pipeline run. A 5-minute isolation test costs 50x less than discovering the problem mid-pipeline.

---

## Adding a New Agent

### Step 1 — Define before you write

Answer these before creating any file:

```
AGENT INTAKE CHECKLIST
──────────────────────
Name:          [What you'll call it in MANIFEST.md and AGENT_REGISTRY.md]
ID:            [kebab-case slug — this is the filename without .md]
Category:      [Which Softograph business function? CEO/Engineering/Sales/Marketing/Design/PM]
Source type:   [custom (build from scratch) | adapted (modify existing third-party) | third-party (use as-is)]
Purpose:       [One sentence: what specific task does this agent perform?]
Inputs needed: [What context does it need to do good work?]
Output format: [What does it produce? File? Summary? Decision?]
Pipeline fit:  [Does it slot into an existing archetype sequence, or is it standalone?]
Replaces:      [Is this replacing an existing agent? If so, which one?]
Test scenario: [What's the minimal task you'll use to isolation-test it?]
```

If you can't answer all of these in under 5 minutes, the agent isn't well-defined enough to build yet. Stop and think.

### Step 2 — Choose placement

| Type | Location | When to use |
|---|---|---|
| Built by Softograph from scratch | `agents/custom/` | No existing agent does this job |
| External agent, used unmodified | `agents/third-party/` | Fits well as-is |
| External agent, modified | `agents/custom/` (copy there first) | Fits mostly but needs adjustments |

**Never edit `agents/third-party/` directly.** If you need to modify a third-party agent, copy it to `agents/custom/`, rename it if needed, change `source:` to `softograph-adapted`, and edit the copy.

### Step 3 — Write the agent file

Required frontmatter (minimum):

```yaml
---
name: Human-Readable Agent Name
description: Precise trigger description — one or two sentences covering when to activate this agent and what it produces. Be specific. This is what the router reads.
source: softograph-custom          # or: agency-agents | softograph-adapted
version: 1.0
added: YYYY-MM-DD
---
```

Body structure:

```markdown
# Agent Name

## Role Definition
Who this agent is and what their mission is.

## Core Capabilities
- Specific capability 1
- Specific capability 2

## Workflow
Step-by-step process this agent follows.

## Output Format
What the agent produces, how it's structured, where it's saved.

## Quality Standards
How to know if the output is good.
```

Keep the body focused. An agent that tries to do too much produces mediocre output. If you find yourself writing more than 3–4 workflow steps, consider splitting into two agents.

### Step 4 — Register in both places

**AI OS MANIFEST.md** (`agents/MANIFEST.md`):
Add a row under the correct Softograph business function section:

```markdown
| `your-agent.md` | Your Agent Name | What it does for Softograph |
```

**Orchestrator AGENT_REGISTRY.md** (`knowledge/specs/AGENT_REGISTRY.md` in the orchestrator repo):
Add a full YAML entry:

```yaml
### `your-agent-id`
\`\`\`yaml
id: your-agent-id
source: .claude/agents/your-agent.md
role: >
  One or two sentences describing what this agent does.
inputs:
  - what it needs
outputs:
  - what it produces
sequence_hints:
  before: [agent-that-should-follow-this-one]
  after: [agent-that-should-precede-this-one]
approval_flag: false    # true if human review is recommended after this agent
\`\`\`
```

### Step 5 — Deploy to Claude Code

```bash
cp agents/custom/your-agent.md ~/.claude/agents/
# or for third-party
cp agents/third-party/your-agent.md ~/.claude/agents/
```

### Step 6 — Isolation test (mandatory before any pipeline use)

Create a minimal `context.json` for testing:

```json
{
  "projectName": "agent-test",
  "projectPath": "/tmp/agent-test",
  "objective": "Test the new agent with a minimal task",
  "archetype": "custom",
  "constraints": [],
  "approvalMode": "auto"
}
```

Run the isolation test:

```bash
cd ~/Developer/autonomous-agent-orchestrator
npm run agent -- --agent your-agent-id --context /tmp/test-context.json
```

**What to check in the output:**
- Did the agent activate with the right persona? (read `outputs/your-agent-id/raw-output.txt`)
- Did it produce the expected output format?
- Did it stay within scope (not try to do things outside its defined role)?
- Status: `complete` or `needs_review` — not `failed`

If the output is wrong, fix the agent file and test again. Do not proceed to pipeline testing until isolation passes.

### Step 7 — Register in the team repo

If this agent runs in a standard pipeline, it must be discoverable. Registration is
not optional — `node tools/verify-workflow.mjs` fails the build on a role referenced
in a doc that has no manifest row.

```bash
# 1. Add a row to agents/MANIFEST.md (the canonical registry)
# 2. Add it to capability-index.json
# 3. If it appears in a pipeline template, update that template in PIPELINE_PROTOCOL.md
# 4. Verify
node tools/verify-workflow.mjs
```

See [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md#4-register--this-is-not-optional) for
the full registration checklist, including how to declare a role as optional.

> If your team also runs the separate `autonomous-agent-orchestrator` runtime, add
> an entry to its `AGENT_REGISTRY.md` and router in that repo. That runtime is
> optional — the Developer Edition works without it.

### Step 8 — Commit and sync

```bash
# In ai-operating-system (master) — this repo is a build output, do not edit directly
cd ~/Developer/AI-Operating-System
git checkout -b ai/[agent-name]-<YYYY-MM-DD>
git add -A
git commit -m "[agent-name] add new agent — [brief description]"
git push origin $(git branch --show-current)
# then sync to the team repo and verify the push landed:
git fetch origin && git log HEAD...origin/$(git branch --show-current) --oneline
```

---

## Upgrading an Existing Agent

Upgrades fall into two types with different risk profiles:

| Upgrade type | Examples | Risk | Protocol |
|---|---|---|---|
| **Prompt refinement** | Better instructions, clearer output format, tighter scope | Low | Isolation test → deploy |
| **Capability change** | New output format, different workflow steps, changed inputs | Medium | Isolation test → `--rerun` on real pipeline state → deploy |
| **Breaking change** | Changed agent ID, removed expected outputs, incompatible format | High | Full protocol below |

### Prompt refinement (low risk)

1. Edit the agent file in `agents/custom/` or create an adapted copy from `agents/third-party/`
2. Bump `version:` in frontmatter (e.g. `1.0` → `1.1`)
3. Add a `changelog` entry at the bottom of the file:
   ```yaml
   # Changelog
   # v1.1 (2026-03-27): Tightened output format, added quality checklist
   # v1.0 (2026-03-13): Initial version
   ```
4. Isolation test with the same minimal context you used when first adding it
5. If isolation passes, deploy and sync

### Capability change (medium risk)

Same as prompt refinement, but also:

4. After isolation test passes, test against **real pipeline state** using `--rerun`:
   ```bash
   npm run agent -- --agent your-agent-id --project ./a-real-project --rerun
   ```
   This runs the upgraded agent with real prior-agent context, resets only that agent's state, and preserves everything else.

5. Check: does the upgraded agent's output still serve as valid input for the agent that follows it in the sequence?

6. If yes — deploy. If the output format changed in a way that breaks the next agent, you need to update the downstream agent too before deploying either.

### Breaking change (high risk)

A breaking change is anything that would cause a currently-running pipeline to fail or produce different results if the agent was swapped mid-run.

**Do not deploy a breaking change to an agent that is currently being used in active pipelines.**

Protocol:
1. Create a **new agent file** with a new ID (e.g. `engineering-senior-v2`) rather than modifying the existing one
2. Test the new agent in complete isolation
3. Test it in a fresh pipeline run (`npm run init` → `npm run orchestrate`)
4. Only after the new version is confirmed working: update AGENT_REGISTRY.md and router to point to the new ID
5. Archive the old agent file (move to `agents/archived/`, don't delete — pipeline state files reference agent IDs by name)
6. Update MANIFEST.md to reflect the change

---

## Versioning Reference

Always bump `version:` in the agent frontmatter when making changes:

| Change type | Version bump | Example |
|---|---|---|
| Typo fix, formatting | Patch: x.x → x.x+0.1 | 1.0 → 1.01 |
| Prompt refinement | Minor: x.x → x.(x+1) | 1.0 → 1.1 |
| New capability or workflow step | Minor | 1.1 → 1.2 |
| Changed output format | Minor | 1.2 → 1.3 |
| Changed ID or breaking output change | Major: x → x+1 | 1.3 → 2.0 |

---

## Token Budget Guidelines

Before running any test, estimate the cost:

**Isolation test cost estimate:**
- Small agent (simple task, short output): ~500–1000 tokens → ~$0.01
- Medium agent (multi-step task): ~2000–5000 tokens → ~$0.03–0.08
- Large agent (research or analysis): ~5000–15000 tokens → ~$0.08–0.25

**When to stop and reassess:**
- If isolation test output is completely wrong → fix the agent description first, the prompt second
- If two isolation tests produce inconsistent output → the agent scope is too broad, split it
- If the agent is producing 3x more text than expected → the instructions are underspecified, tighten them

**The rerun budget:**
- `--rerun` on one agent costs the same as an isolation test, plus the context from prior agents (~500–2000 extra tokens)
- Still 5–10x cheaper than re-running the full pipeline from scratch

---

## Quick Reference

```bash
# Add new agent — isolation test
npm run agent -- --agent new-agent-id --context /tmp/test-context.json

# Upgrade agent — test against real pipeline state
npm run agent -- --agent upgraded-agent-id --project ./my-project --rerun

# Check what agents are in your Claude Code install
ls ~/.claude/agents/

# Check the current pipeline state before a rerun
npm run status -- --project ./my-project

# After a --rerun completes successfully, continue the pipeline
npm run resume -- --project ./my-project
```
