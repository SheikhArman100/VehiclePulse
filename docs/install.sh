#!/bin/bash

# install.sh — one-command setup for the Softograph AI Operating System (team build).
#
# Canonical, opencode-first installer. This is the successor to the older
# team-setup.sh and is the version the docs point to.
#
# WHAT IT DOES
#   Wires the team skills + agents from this cloned repo into whichever AI
#   harnesses you use, in the team's preferred order:
#     1. opencode      (default)      -> ~/.config/opencode/{skills,agents,AGENTS.md}
#     2. Antigravity   (reads AGENTS.md; MCP guidance printed — see notes)
#     3. Claude Code                  -> ~/.claude/{skills,agents,CLAUDE.md}
#     4. OpenAI / Codex (rare)        -> ~/.codex/AGENTS.md
#   It writes each harness's config unconditionally: a config for a harness you
#   don't have installed simply sits unused. No harness is required to be present.
#
#   Gemini CLI is intentionally NOT configured — it is being retired from the
#   stack. The previous installer that did configure it is preserved under the
#   repo's legacy/ area.
#
#   No secrets are written. Connectors (Notion, Filesystem) are wired by YOU in
#   each harness's own settings — this script only prints where. The script never
#   sees or stores a credential.
#
# HOW TO RUN  (from the root of the cloned team repo)
#   cd ~/Developer/ai-operating-system-team
#   bash docs/install.sh
#
# AFTER REPO UPDATES
#   git pull && bash docs/install.sh
#   # then start a new harness session so it re-reads skills/agents

set -e

# --- Resolve the repo root -------------------------------------------------
# This script lives in docs/, so the repo root is normally its parent. Fall
# back to the script's own dir if it was copied to the repo root instead.
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ "$(basename "$SELF_DIR")" = "docs" ]; then
  REPO_ROOT="$(dirname "$SELF_DIR")"
else
  REPO_ROOT="$SELF_DIR"
fi

echo ""
echo "=== Softograph AI OS — Install ==="
echo "Repo: $REPO_ROOT"
echo ""

# Sanity: this must look like the team repo.
if [ ! -d "$REPO_ROOT/skills/team" ] || [ ! -d "$REPO_ROOT/agents" ]; then
  echo "ERROR: this does not look like the ai-operating-system-team repo."
  echo "Expected skills/team/ and agents/ under: $REPO_ROOT"
  echo "Run from the root of the cloned team repo:  bash docs/install.sh"
  exit 1
fi

# --- Shared: the slim global-rules body ------------------------------------
# One rules body, written into each harness's global-rules file.
#
# This body MUST stay consistent with AGENTS.md. If the gate sequence, agent
# names, or skill names change there, change them here too — `node
# tools/verify-workflow.mjs` will not catch a rules file, so keep them in sync
# by hand. Everything named below must exist in this repository.
write_rules() {
  # $1 = destination file, $2 = harness label (for the skills mechanism line)
  local dest="$1"
  local skills_line="$2"
  cat > "$dest" << RULES_EOF
# Softograph AI OS — Global Rules

You are operating within the Softograph AI Operating System (Developer Edition).
Softograph Limited is a B2B software company (est. 2012, Dhaka, Bangladesh).

Do NOT state Softograph's product line, its markets, or anything on the
do-not-use list from memory — those change. Read them from the canonical
record (the Notion workspace wired as a connector) at the start of a session,
and treat the most recent timestamp as authoritative.

## Skills
$skills_line
When a task matches a skill's domain, load and follow that skill before
proceeding — skills carry full specialist instructions; do not guess when one
exists. This edition ships three:
  - dev-orchestrator    — scaffold a project and decompose it into steps
  - claude-code-protocol — session discipline, gates, handoff block
  - frontend-design     — production-grade UI and component quality

## Gate sequence
Canonical order (AGENTS.md owns it; agents/MANIFEST.md maps gates to agents):
  Gate 0    Architecture & Data Access Matrix — engineering-backend-architect
  Gate 0.5  Data Migration Planning            — conditional, brownfield only
  Gate 1    Feature Implementation             — engineering-senior-developer /
                                                   engineering-frontend-developer
  Gate 1.5a UI & Visual Design                 — design-ui-designer
  Gate 1.5  Runtime Integration Verification   — testing-integration-tester
  Gate 2    Simplification & Security         — code-simplifier + security-check
  Gate 2.75 Deployment Topology                — deployment-topologist
  Gate 3    Demo UX Walkthrough                — testing-demo-walkthrough-validator

Gate 1.5 requires a running system and can never be PASS (STATIC ONLY).
Some pipeline roles have no agent file; SKIP them and log the skip rather than
substituting another agent. See agents/MANIFEST.md §5.

## Coding conventions
- TypeScript with strict mode unless the project specifies otherwise.
- Shared code in packages/core/ with proper exports.
- Always run build-validator before handoff.
- The agent never pushes to main. Session branch + PR, always.

## Verification
- Verify from runtime reality, never from a summary of your own work.
- Run: node tools/verify-workflow.mjs  before committing a change to this repo.
RULES_EOF
}

# Sanitize agent frontmatter for OpenCode's strict schema: named colors -> hex,
# string `tools:` lines stripped. (Claude Code accepts both as-is, so its copy
# is raw — applying this rewrite there would corrupt Claude Code agents.)
sanitize_agent_for_opencode() {
  sed \
    -e 's/^color: *"\{0,1\}teal"\{0,1\}$/color: "#14B8A6"/' \
    -e 's/^color: *"\{0,1\}blue"\{0,1\}$/color: "#3B82F6"/' \
    -e 's/^color: *"\{0,1\}green"\{0,1\}$/color: "#22C55E"/' \
    -e 's/^color: *"\{0,1\}purple"\{0,1\}$/color: "#A855F7"/' \
    -e 's/^color: *"\{0,1\}red"\{0,1\}$/color: "#EF4444"/' \
    -e 's/^color: *"\{0,1\}orange"\{0,1\}$/color: "#F97316"/' \
    -e 's/^color: *"\{0,1\}cyan"\{0,1\}$/color: "#06B6D4"/' \
    -e 's/^color: *"\{0,1\}slate"\{0,1\}$/color: "#64748B"/' \
    -e 's/^color: *"\{0,1\}yellow"\{0,1\}$/color: "#EAB308"/' \
    -e 's/^color: *"\{0,1\}pink"\{0,1\}$/color: "#EC4899"/' \
    -e 's/^color: *"\{0,1\}indigo"\{0,1\}$/color: "#6366F1"/' \
    -e '/^tools: *[A-Za-z].*,/d' \
    "$1" > "$2"
}

# ================================================================
# 1. opencode  (default)  — ~/.config/opencode/
#    skills/   indexed, on-demand   ·   agents/   individual files
#    AGENTS.md slim global rules (read natively; also used by Antigravity)
# ================================================================
echo "> opencode: installing skills, agents, and rules..."
OC_CONFIG="$HOME/.config/opencode"
OC_SKILLS="$OC_CONFIG/skills"
OC_AGENTS="$OC_CONFIG/agents"
mkdir -p "$OC_SKILLS" "$OC_AGENTS"

# Skills — clean stale, then copy, injecting description from purpose if needed.
for existing in "$OC_SKILLS"/*/; do
  [ -d "$existing" ] || continue
  name="$(basename "$existing")"
  if [ ! -d "$REPO_ROOT/skills/team/$name" ]; then
    echo "   cleanup: removing stale skill $name"
    rm -rf "$existing"
  fi
done
OC_SKILL_COUNT=0
OC_SKILL_WARN=0
for skill_dir in "$REPO_ROOT"/skills/team/*/; do
  name="$(basename "$skill_dir")"
  file="${skill_dir}SKILL.md"
  [ -f "$file" ] || continue
  has_name=$(head -25 "$file" | grep -c '^name:' || true)
  has_desc=$(head -25 "$file" | grep -c '^description:' || true)
  has_purpose=$(head -25 "$file" | grep -c '^purpose:' || true)
  if [ "$has_name" -eq 0 ]; then
    echo "   WARNING: $name — no 'name' in frontmatter"; OC_SKILL_WARN=$((OC_SKILL_WARN+1))
  elif [ "$(head -25 "$file" | grep '^name:' | head -1 | sed 's/^name:[[:space:]]*//' | tr -d "\"'" )" != "$name" ]; then
    echo "   WARNING: $name — frontmatter name does not match directory"; OC_SKILL_WARN=$((OC_SKILL_WARN+1))
  fi
  mkdir -p "$OC_SKILLS/$name"
  if [ "$has_desc" -eq 0 ] && [ "$has_purpose" -gt 0 ]; then
    purpose_val=$(head -25 "$file" | grep '^purpose:' | head -1 | sed 's/^purpose:[[:space:]]*//')
    awk -v d="$purpose_val" '/^name:/{print; print "description: \"" d "\""; next} {print}' "$file" > "$OC_SKILLS/$name/SKILL.md"
  else
    [ "$has_desc" -eq 0 ] && { echo "   WARNING: $name — no description or purpose; may not be discovered"; OC_SKILL_WARN=$((OC_SKILL_WARN+1)); }
    cp "$file" "$OC_SKILLS/$name/SKILL.md"
  fi
  OC_SKILL_COUNT=$((OC_SKILL_COUNT+1))
done

# Agents — clean stale, then copy custom + third-party (sanitized).
for existing in "$OC_AGENTS"/*.md; do
  [ -f "$existing" ] || continue
  fn="$(basename "$existing")"
  if [ ! -f "$REPO_ROOT/agents/custom/$fn" ] && [ ! -f "$REPO_ROOT/agents/third-party/$fn" ]; then
    echo "   cleanup: removing stale agent $fn"; rm -f "$existing"
  fi
done
OC_AGENT_COUNT=0
for sub in custom third-party; do
  [ -d "$REPO_ROOT/agents/$sub" ] || continue
  for af in "$REPO_ROOT"/agents/$sub/*.md; do
    [ -f "$af" ] || continue
    sanitize_agent_for_opencode "$af" "$OC_AGENTS/$(basename "$af")"
    OC_AGENT_COUNT=$((OC_AGENT_COUNT+1))
  done
done

write_rules "$OC_CONFIG/AGENTS.md" "This environment exposes indexed skills via the native skill tool."
echo "   ok: $OC_SKILL_COUNT skills, $OC_AGENT_COUNT agents, AGENTS.md"
[ "$OC_SKILL_WARN" -gt 0 ] && echo "   note: $OC_SKILL_WARN skill frontmatter warning(s) — fix in master, then re-sync."

# ================================================================
# 2. Antigravity  — reads AGENTS.md natively; MCP config is separate.
#    We do NOT auto-write Antigravity's config: its skill-loading path is not
#    pinned in the team docs, and its MCP file shares ~/.gemini/ with the
#    Gemini CLI we are retiring, so touching it blindly is unsafe. Guidance only.
# ================================================================
echo "> Antigravity: guidance (no files written)"
echo "   - It reads AGENTS.md natively. Keep an AGENTS.md at your project root"
echo "     (the dev-orchestrator scaffolds one; on Claude Code it symlinks to CLAUDE.md)."
echo "   - MCP servers: add them in ~/.gemini/config/mcp_config.json — note the key"
echo "     is \"serverUrl\" (NOT \"url\"). Add Notion + Filesystem there yourself."

# ================================================================
# ================================================================
# 3. Claude Code  — ~/.claude/{skills,agents,CLAUDE.md}
#    Skills mirrored with a portable copy. Deliberately not rsync — rsync is
#    absent on stock Windows and in minimal containers, and `set -e` would
#    abort the installer halfway through, leaving opencode half-configured.
# ================================================================
echo "> Claude Code: installing skills, agents, and rules..."
mkdir -p ~/.claude/skills ~/.claude/agents
CC_SKILL_COUNT=0
CC_SKILL_WARN=0
# Remove skills that no longer exist upstream, so a deprecated skill cannot
# resurrect at runtime from a previous install.
for existing in ~/.claude/skills/*/; do
  [ -d "$existing" ] || continue
  name="$(basename "$existing")"
  if [ ! -d "$REPO_ROOT/skills/team/$name" ]; then
    echo "   cleanup: removing stale skill $name"
    rm -rf "$existing"
  fi
done
for skill_dir in "$REPO_ROOT"/skills/team/*/; do
  [ -d "$skill_dir" ] || continue
  name="$(basename "$skill_dir")"
  rm -rf "$HOME/.claude/skills/$name"
  cp -R "$skill_dir" "$HOME/.claude/skills/$name"
  CC_SKILL_COUNT=$((CC_SKILL_COUNT+1))
  grep -q '^capabilities:' "$skill_dir/SKILL.md" 2>/dev/null || {
    echo "   WARNING: $name — no 'capabilities:' key; the harness will not dispatch it"
    CC_SKILL_WARN=$((CC_SKILL_WARN+1))
  }
done
for existing in ~/.claude/agents/*.md; do
  [ -f "$existing" ] || continue
  fn="$(basename "$existing")"
  if [ ! -f "$REPO_ROOT/agents/custom/$fn" ] && [ ! -f "$REPO_ROOT/agents/third-party/$fn" ]; then
    echo "   cleanup: removing stale agent $fn"
    rm -f "$existing"
  fi
done
cp "$REPO_ROOT"/agents/custom/*.md ~/.claude/agents/ 2>/dev/null || true
cp "$REPO_ROOT"/agents/third-party/*.md ~/.claude/agents/ 2>/dev/null || true
CC_AGENT_COUNT=$(ls ~/.claude/agents/*.md 2>/dev/null | wc -l | tr -d ' ')
write_rules ~/.claude/CLAUDE.md "Skills in ~/.claude/skills/ are discovered automatically."
echo "   ok: $CC_SKILL_COUNT skills, $CC_AGENT_COUNT agents, CLAUDE.md"
[ "$CC_SKILL_WARN" -gt 0 ] && echo "   note: $CC_SKILL_WARN skill(s) missing 'capabilities:' — run 'node tools/verify-workflow.mjs'."
echo "   note: AGENTS.md is the portable instruction file; on Claude Code, symlink"
echo "         it per project:  ln -s AGENTS.md CLAUDE.md"

# ================================================================
# 4. OpenAI / Codex  (rare)  — ~/.codex/AGENTS.md (agents concatenated)
# ================================================================
echo "> Codex (rare): building ~/.codex/AGENTS.md..."
mkdir -p ~/.codex
{
  echo "# Softograph AI OS — Agent Registry (Codex)"
  echo "# Auto-generated by docs/install.sh — do not edit manually."
  echo "# Invoke any agent by name: \"Backend Architect — design the auth module\""
} > ~/.codex/AGENTS.md
CODEX_AGENT_COUNT=0
for sub in custom third-party; do
  [ -d "$REPO_ROOT/agents/$sub" ] || continue
  for af in "$REPO_ROOT"/agents/$sub/*.md; do
    [ -f "$af" ] || continue
    { echo ""; echo "---"; echo ""; echo "# Agent: $(basename "$af" .md)"; echo ""; cat "$af"; } >> ~/.codex/AGENTS.md
    CODEX_AGENT_COUNT=$((CODEX_AGENT_COUNT+1))
  done
done
echo "   ok: $CODEX_AGENT_COUNT agents"

# ================================================================
# Verify — capability index + full workflow integrity.
# The index is shipped in this repo; do not regenerate it by hand. The
# verifier is the real check: links, agent registry, skill capabilities,
# and gate taxonomy. Node is the only requirement (python3 is not assumed).
# ================================================================
echo "> verify: capability index"
INDEX="$REPO_ROOT/capability-index.json"
if [ ! -f "$INDEX" ]; then
  echo "   WARNING: capability-index.json missing. Run 'git pull'."
elif command -v node >/dev/null 2>&1; then
  node -e '
    const d = require(process.argv[1]);
    const n = (d.capabilities || d).length;
    const missing = (d.capabilities || []).filter(c => !c.source).length;
    if (missing) { console.log("   WARNING: " + missing + " entries have no source path"); process.exit(1); }
    console.log("   ok: capability index parses (" + n + " entries)");
  ' "$INDEX" || echo "   WARNING: capability-index.json did not validate — re-pull the repo."
else
  echo "   ok: capability-index.json present (node not found — skipped parse check)."
fi

echo "> verify: workflow integrity"
if command -v node >/dev/null 2>&1; then
  node "$REPO_ROOT/tools/verify-workflow.mjs" || echo "   WARNING: workflow integrity check failed — see above."
else
  echo "   WARNING: node not found. Install Node to run tools/verify-workflow.mjs."
fi

# ================================================================
# Connectors — wired by YOU, never by this script (no secrets).
# ================================================================
echo ""
echo "> connectors (do this yourself, once, in each harness's settings):"
echo "   - Notion      — the record: project state, briefs, canonical facts."
echo "   - Filesystem  — lets the assistant read your repo to verify from source."
echo "   Use the connection your team lead gives you. Never hardcode workspace or"
echo "   database IDs into a skill or doc — skills reference them by placeholder."

# ================================================================
# Optional: orchestration runtime (loop/graph dispatch) — advisory only.
# A separate clone on its own release cadence. Not required; nothing here fails.
# ================================================================
echo ""
echo "> optional: orchestration runtime (only if you need unattended loop/graph dispatch)"
if [ -f "$INDEX" ]; then
  echo "   git clone git@github.com:rahman-tawhid/autonomous-agent-orchestrator.git"
  echo "   cd autonomous-agent-orchestrator && npm ci && npm run build"
  echo "   export AIOS_CAPABILITY_INDEX=\"$INDEX\""
else
  echo "   (capability index not present yet — pull the repo first.)"
fi

# ================================================================
echo ""
echo "=== Install complete ==="
echo "  opencode    : ~/.config/opencode/skills + agents + AGENTS.md   (default)"
echo "  Claude Code : ~/.claude/skills + agents + CLAUDE.md"
echo "  Codex       : ~/.codex/AGENTS.md"
echo "  Antigravity : reads your project AGENTS.md; wire its MCP yourself (see above)"
echo ""
echo "Next: cd into a project and start your harness (opencode by default)."
echo "      Load the skill your role's FOR-*.md doc names, confirm it acknowledges,"
echo "      then give it your task. Manual fallback + troubleshooting: docs/INSTALL.md"
echo ""
echo "After updates:  git pull && bash docs/install.sh  (then start a new session)"
echo ""
