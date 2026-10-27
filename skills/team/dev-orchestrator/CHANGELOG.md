# Changelog — dev-orchestrator

All notable changes to this skill are documented here.
Format: [semver] — YYYY-MM-DD — summary.

---

## 1.1.0 — 2026-09-16

- Brought the 11 `references/*.md` files into the skill directory. Prior to this the team-synced skill shipped as SKILL.md only — every `references/…` pointer was dangling.
- Removed the `scripts/init_project.py` and `scripts/diagnose_system.py` dependencies. The scripts never lived in the repo (only in unsynced `~/Developer/Claude Skills/` trees), so their invocations were broken for the team. Scaffolding and the readiness check are now agent-driven from `references/project-archetypes.md` and `references/claude-code-setup-guide.md` (Part 8) — harness-agnostic across opencode / Antigravity / Claude Code.
- Dropped the dangling `references/setup-guardian-protocol.md` pointers (file never existed; Phase 0 protocol is inline).

## 1.0.0 — 2026-05-11

- Initial versioned release. Existing skill baselined at 1.0.0.
