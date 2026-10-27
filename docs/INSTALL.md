# INSTALL — Getting the AI OS running

**For:** anyone setting up the ported system to run the build loop. **Internal only.**

The fast path is one command — from the cloned team repo, run `bash docs/install.sh`; it wires the team skills and agents into your harness (opencode by default). The manual steps below are the fallback and explain what that script does. If all you need is to load a single skill for a one-off task, skip both.

---

## Before you start

- A terminal, `git`, and **Node.js** — used only to verify the capability index and run the workflow integrity check. No other runtime is required.
- A POSIX shell. The fast path is a `bash` script; on Windows use **Git Bash**, which ships with Git for Windows. It needs no `rsync`, no `python3`, and no WSL.
- One AI harness. Preferred order: **opencode** (default) → Antigravity → Claude Code. Pick opencode unless you have a reason not to; the rest of this doc assumes it and calls out the Claude Code difference where it matters.

---

## 1. Get the team repo

```sh
git clone https://github.com/rahman-tawhid/ai-operating-system-team.git
cd ai-operating-system-team
```

This is a **build output** — a read-only mirror. Never commit to it or edit its files by hand; changes are overwritten on the next sync from master. You pull updates, you don't push them.

## 2. Point your harness at the skills

Team skills live in `skills/team/`. Make them available to your harness by placing (or symlinking) that directory into the harness's skill location. Symlink rather than copy so a `git pull` updates every skill at once:

```sh
# opencode
ln -s "$(pwd)/skills/team" ~/.config/opencode/skills/team

# Claude Code
ln -s "$(pwd)/skills/team" ~/.claude/skills/team
```

## 3. Wire the portable instruction file

`AGENTS.md` is the single instruction file every harness reads — it owns the gate sequence. On most harnesses it is picked up automatically from the repo root. On **Claude Code**, symlink `CLAUDE.md` to it so one instruction set drives both:

```sh
ln -s AGENTS.md CLAUDE.md
```

Agents in `agents/` are harness-loaded definitions. The canonical registry is [`agents/MANIFEST.md`](../agents/MANIFEST.md) — read it to see which agent owns which gate, and which roles are optional and will be skipped.

## 4. Connect the tools the skills expect

The skills and agents assume two connectors are reachable from the harness:

- **A knowledge/workspace connector** (Notion) — where project state, briefs, and canonical references live.
- **A filesystem connector** — so the harness can read and write project files on your machine.

Add both through your harness's MCP/connector settings. Use the connection your team lead gives you; do not hardcode workspace or database identifiers into any skill or doc — skills reference those by placeholder (`<page-id>`, `<db-id>`) and are wired to the live values through the connector, not the text.

An **issue tracker** (Linear, GitHub Issues) is optional. `claude-code-protocol` uses it for traceability when connected and falls back to the PR description when it is not — it will not block a session over a missing tracker.

## 5. Verify

Two checks, both using only Node:

```sh
# 1. The shipped capability index is present and parses
node -e "const d=require('./capability-index.json'); console.log('ok:', d.capabilities.length, 'capabilities')"

# 2. Full workflow integrity — links, agent registry, skill capabilities, gates
node tools/verify-workflow.mjs
```

Check 2 **must exit 0**. It is the same command CI runs. If it reports errors, the
repo is inconsistent — fix it before starting a build.

Then, in the harness, load the skill your role's [`FOR-DEVELOPERS.md`](FOR-DEVELOPERS.md) doc names, confirm it acknowledges, and give it a small task. A correct, context-rich answer means you're set.

---

## What you did *not* have to do

- No local edits to the repo — everything came from the pull.
- No skill counts or IDs to maintain — the index ships with the repo.
- No per-skill agent install — the harness loads agents from the repo.
- No `rsync`, `python3`, or WSL.

## When it doesn't work

| Symptom | Fix |
|---|---|
| Harness can't find the skills | The symlink in step 2 points at the wrong skill dir. opencode uses `~/.config/opencode/skills/`, Claude Code uses `~/.claude/skills/`. |
| Instruction file ignored | On Claude Code, confirm the `CLAUDE.md → AGENTS.md` symlink (step 3). On others, confirm the harness reads from the repo root. |
| A skill loads but never triggers | It has no `capabilities:` key in its frontmatter, so the planner cannot bind it. Run `node tools/verify-workflow.mjs`. |
| `verify-workflow.mjs` reports errors | The repo is inconsistent — a dead link, an unlisted agent, or a gate mismatch. Fix it before building; do not work around it. |
| Skills load but have no workspace context | A connector from step 4 isn't wired. Re-add it in harness settings. |
| Anything else | Contact the team lead. Don't edit team-repo files to work around it. |
