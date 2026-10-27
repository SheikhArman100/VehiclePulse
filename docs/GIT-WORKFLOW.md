# Git Workflow — Softograph Team

How we use git across all Softograph projects. This applies to everyone:
developers, designers, AI coding tools (Claude Code, Gemini, OpenCode, Cursor).

> ## Who executes this?
>
> | Action | AI agent | Human |
> |---|---|---|
> | Read state — `status`, `log`, `diff`, `branch --show-current` | ✅ | ✅ |
> | Edit project files | ✅ | ✅ |
> | `git add`, `git commit` | ❌ | ✅ |
> | `git push` (any form, including `--force`) | ❌ | ✅ |
> | Create or switch branch | ❌ | ✅ |
> | `merge`, `rebase`, `reset`, `checkout` | ❌ | ✅ |
> | Open or close a PR | ❌ | ✅ |
>
> **AI agents propose; humans execute.** At the end of a session an agent emits a
> `## Proposed Git Workflow` block — branch name, exact file list, commit message,
> push and PR commands — which it does **not** run. You review the diff, adjust what
> you want, and run the commands yourself.
>
> Rationale: a commit is the moment work becomes history. Reviewing after that is
> archaeology. The human should see the diff while it is still reversible.
> → Protocol: [`AGENTS.md` §0](../AGENTS.md)

**Version:** 2.0 — October 2026 (AI proposes, human executes)

---

## The One Rule

**Nothing reaches `main` except through a reviewed pull request.** That includes you.

---

## Branch Types

| Prefix | Who uses it | Example |
|---|---|---|
| `feature/` | Developers | `feature/proggya-chart-filters` |
| `fix/` | Any dev, fixing a bug | `fix/data-dialogue-timeout` |
| `ai/` | AI coding sessions (any tool) | `ai/proggya-f01-f03-2026-05-11` |
| `design/` | External designer | `design/token-update-may` |
| `hotfix/` | Tech Lead only, emergency prod fix | `hotfix/nfdms-auth-bypass` |

---

## Starting Work

Before writing any code:

```bash
# 1. Get latest main
git checkout main && git pull origin main

# 2. Create your branch
git checkout -b [prefix]/[descriptive-name]

# 3. Confirm you are on your branch (NOT main)
git branch --show-current
```

Branch from `main` unless told otherwise. Do not branch from a stale
local copy — always pull first.

---

## Rules

**Rule 1 — One branch per task.** Don't accumulate multiple unrelated changes
on one branch. If you're fixing a bug and notice another bug, make a second
branch for the second bug.

**Rule 2 — PR before going offline.** If you're done for the day and your
work isn't merged, push your branch and open a draft PR. This tells the team
where you are and prevents lost work.

**Rule 3 — AI branches need human review.** Every `ai/` branch requires
the Tech Lead's approval before merge. No exceptions. AI-generated code is
fast but not always contextually aware of what other modules expect.

**Rule 4 — Delete branches after merge.** Merged branches are dead. Delete
them on GitHub and locally: `git branch -d [branch]` + click "delete branch"
on the merged PR page.

**Rule 5 — Never force push to a shared branch.** If someone else might be
working on or reviewing a branch, do not `git push --force`. Rebase locally
or create a new branch.

---

## Pull Request Process

When your work is ready for review:

```bash
# Push your branch
git push origin [your-branch-name]
```

Then open a PR on GitHub. Every PR must include:

**Title format:**
```
[module] Brief description
```

**Description (required, not optional):**
```markdown
## What This Does
One paragraph explaining the change.

## Files Changed
- list the main files

## How to Test
Steps someone can follow to verify this works.

## Checklist
- [ ] Branch is up to date with main (no conflicts)
- [ ] Code runs locally
- [ ] No debug logs or commented-out code left in
- [ ] No hardcoded credentials, API keys, or secrets
- [ ] If touching a shared interface — tagged the relevant developer
```

---

## Who Reviews What

| Change type | Primary reviewer | Secondary |
|---|---|---|
| AI-generated code (`ai/` branch) | Tech Lead | — |
| Backend module | Tech Lead | Peer dev spot-check |
| Frontend / UI | Tech Lead | Peer dev spot-check |
| Design tokens / system | Tech Lead | CEO (for brand-level changes) |
| Hotfix | Tech Lead self-reviews, notifies CEO | — |

---

## Review Response Time

| PR type | Expected review time |
|---|---|
| Bug fix / small feature | Same day |
| AI-generated (`ai/` branch) | Within 24 hours |
| Module addition | Within 48 hours |
| Design tokens / UI changes | Within 24 hours |

---

## Commit Message Format

```
[module] short description (max 72 chars)

Optional body if the change needs explanation.
Separate from subject with blank line.
```

Examples:

```
[auth] fix token expiry not resetting on refresh
[dashboard] add drill-down to FMCG category chart
[ai-pipeline] F03 output — entity extraction agent complete
[design] update spacing tokens to 8pt grid
```

The `[module]` tag is mandatory. It makes `git log` scannable and maps to
Trello cards cleanly.

---

## AI Coding Sessions — Who Does What

These rules apply when using Claude Code, Gemini, OpenCode, Cursor, or any AI tool
that writes code. **The agent never runs a writing git command.**

### Before an AI Session — you do this

```bash
# 1. Pull latest main
git checkout main && git pull origin main

# 2. Check for other AI sessions on overlapping scope
git branch -a | grep "ai/"
# If a branch exists for the same project/module, STOP.
# Talk to the Tech Lead before proceeding — two AI sessions on the
# same files will produce conflicting outputs.

# 3. Create the session branch
git checkout -b ai/[project-slug]-[phase]-[YYYY-MM-DD]
```

The `ai/` prefix makes AI-generated branches immediately distinguishable from human
branches in the GitHub UI.

The agent checks the same things read-only (`git branch --show-current`,
`git status --short`, `git branch -a | grep "ai/"`) and **stops and reports** if it
finds uncommitted changes or an overlapping branch. It will not proceed on top of
someone else's work.

### After an AI Session — the agent proposes, you run

The agent ends with a block like this (it does not execute any of it):

```text
## Proposed Git Workflow  — not executed, for your review
⚠ Ran on `main`? → branch first.
Working tree: 12 files changed, +380 −220
```

Then you run:

```bash
# 1. Read the diff before you accept anything
git status --short
git diff --stat
git diff

# 2. Branch (if the session ran on main)
git checkout -b ai/[project-slug]-[phase]-[YYYY-MM-DD]

# 3. Commit — use the agent's suggested message, or write your own
git add <paths>
git commit -m "[component] brief description"

# 4. Push
git push -u origin ai/[branch-name]

# 5. Confirm it landed — empty output = success
git fetch origin && git log HEAD...origin/ai/[branch-name] --oneline

# 6. Open the PR
gh pr create \
  --title "[AI] [Project] [scope] — [brief description]" \
  --body "## Session Summary

**Completed:** F0X–F0Y
**Files changed:** [list]
**Verification:** [commands run → actual results]

## Checklist
- [ ] I read the diff myself
- [ ] Tests pass
- [ ] No hardcoded credentials
- [ ] Nothing outside the declared scope

**Review focus:** [the 2–3 things a reviewer should actually look at]" \
  --base main
```

The PR description is not optional, and **review focus** is mandatory — "please
review" is the most common reason an AI-generated PR gets rubber-stamped.

### When Another Developer Is Active on the Same Files

1. Branch from that developer's branch, not from `main`
2. Branch name: `ai/[project]-[phase]-from-[dev-branch]-[date]`
3. PR targets the developer's branch, not `main`
4. The developer reviews AI additions before their own PR merges to `main`

The human developer has final say over code that touches their module.

---

## What Happens When Rules Are Broken

If someone pushes to `main` directly (bypassing a PR):

1. It's not the end of the world — but do not make it a habit
2. Notify the Tech Lead immediately
3. If the push broke something, the Tech Lead creates a `hotfix/` branch to fix it
4. We treat it as a learning moment, not a disciplinary issue

Currently GitHub branch protection is not enabled (requires Pro plan).
The discipline is on us, not on a tool.

---

## Quick Reference

| I want to... | Command |
|---|---|
| Start new work | `git checkout main && git pull && git checkout -b feature/name` |
| See all branches | `git branch -a` |
| Switch branches | `git checkout [branch-name]` |
| Push my branch | `git push origin [branch-name]` |
| Update from main | `git checkout main && git pull && git checkout [my-branch] && git merge main` |
| Delete merged branch | `git branch -d [branch-name]` |
| Check if I'm on main | `git branch --show-current` |
