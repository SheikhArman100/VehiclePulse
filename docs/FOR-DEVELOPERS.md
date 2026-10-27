# FOR DEVELOPERS

**You are here from** [the docs hub](README.md). This is the development starter kit. Unlike the other roles, your work runs *through* the system rather than loading a single skill — you drive multi-step builds through a harness. Set the harness up once with [INSTALL.md](INSTALL.md), then this doc points you at the right skills and the loop.

---

## What the system does for development

It takes a product idea, whitepaper, or spec and gets you to a project you can actually build: an archetype-appropriate scaffold, a plan decomposed into steps, and a set of skills the harness can dispatch against as it works. You stay the driver — the harness proposes and executes; you verify.

## Your skills

Loaded from `skills/team/<name>/`.

| Skill | What it does | Reach for it when |
|---|---|---|
| **Dev Orchestrator** | Turns an idea/whitepaper into a scaffolded project + step plan, preps the harness session | Starting a new build, or preparing a Claude Code / opencode session |
| **Agent Workflow Protocol** | The conventions for running work through the coding harness — session shape, scope, gates, handoffs | You're driving a build and want it to follow house protocol |
| **Frontend Design** | UI/UX critique, component design, layout audits | You're building or reviewing an interface |

Scaffolding is **agent-driven** — Dev Orchestrator builds the project tree from the archetype references; there's no bundled generator to run.

## How to run them

1. Install the harness and point it at the team skills — [INSTALL.md](INSTALL.md). Preferred order: **opencode** (default) → Antigravity → Claude Code.
2. Load **Dev Orchestrator** and give it the idea or whitepaper. It scaffolds and decomposes.
3. Drive the build through the loop — the harness dispatches skills against plan steps by exact capability match, runs them, and you verify each step before it earns the next.
4. The gate sequence, agent registry, and detailed protocol live in [`AGENTS.md`](../AGENTS.md), [`agents/MANIFEST.md`](../agents/MANIFEST.md), and [`PIPELINE_PROTOCOL.md`](PIPELINE_PROTOCOL.md).

## The one thing to internalize

The harness can only dispatch against what a skill has **declared**. A skill auto-binds to a plan step when its exact `capabilities:` key matches — trigger phrases and purpose text only help discovery. If the harness won't reach for something you know exists, it's almost always an undeclared or unregistered capability.

Check it yourself:

```bash
head -25 skills/team/<name>/SKILL.md | grep capabilities:
```

No output means the skill is invisible to the planner. That's a real fix — add the key and register the id in [`capability-index.json`](../capability-index.json) — not a workaround. See [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md).

## Starting prompt

New build:
> Load **Dev Orchestrator**. Here's the whitepaper/idea: [paste or path]. Scaffold the project for the right archetype and decompose it into a step plan. Tell me which steps map to existing skills and which need new ones before we start.

## Rules that matter here

- **Never push to `main`.** Session branch, PR, human merge. See [GIT-WORKFLOW.md](GIT-WORKFLOW.md).
- **Team repo is a build output.** Pull, don't push. Anything you change there is overwritten on the next sync from master.
- **Verify before advancing.** The loop earns autonomy step by step — don't wave through a step you didn't check.
- **New skill or agent needed?** Author it in master, not the team repo — see [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md).
- **Before committing a change to this repo:** `node tools/verify-workflow.mjs` must exit 0.
