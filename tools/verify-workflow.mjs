#!/usr/bin/env node
/**
 * verify-workflow.mjs — structural integrity check for the AI OS team repo.
 *
 * This repo is documentation-as-code: the *workflow* is the product. Every
 * failure mode below was a real defect that shipped because nothing checked it.
 *
 * Checks:
 *   A. Relative markdown links resolve to a file that exists.
 *   B. Every agent role referenced in docs resolves to a real agent file, or is
 *      explicitly declared OPTIONAL in agents/MANIFEST.md.
 *   C. Every SKILL.md declares a unique name, a description, and a non-empty
 *      `capabilities:` key (the key the harness dispatches on).
 *   D. Every agent file declares a name and a description.
 *   E. Gate identifiers agree between AGENTS.md and docs/PIPELINE_PROTOCOL.md.
 *   F. Referenced repo assets (e.g. capability-index.json) exist.
 *
 * Usage:  node tools/verify-workflow.mjs [--strict]
 * Exit:   0 = pass, 1 = errors found (warnings never fail the build).
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = process.argv.includes("--strict");

const errors = [];
const warnings = [];
const err = (check, msg) => errors.push(`[${check}] ${msg}`);
const warn = (check, msg) => warnings.push(`[${check}] ${msg}`);

// ---------------------------------------------------------------- utilities

/** Repo-relative POSIX path, for stable messages across platforms. */
const rel = (abs) => relative(ROOT, abs).split(/[\\/]/).join("/");

/** Recursively list files, skipping .git and node_modules. */
function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs, out);
    else if (e.isFile()) out.push(abs);
  }
  return out;
}

const ALL_FILES = walk(ROOT);
const ALL_RELPATHS = new Set(ALL_FILES.map(rel));
const MD_FILES = ALL_FILES.filter((f) => extname(f) === ".md");

const read = (abs) => readFileSync(abs, "utf8");

/** Parse YAML-ish frontmatter delimited by --- into a flat key -> string map. */
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

/** Strip fenced code blocks so we only lint prose, not illustrative snippets. */
function stripFences(text) {
  return text.replace(/```[\s\S]*?```/g, "");
}

// ------------------------------------------------- A. markdown link integrity

/**
 * Files that legitimately reference paths inside a *downstream project* rather
 * than inside this repo. Their links are illustrative templates the agent emits
 * when scaffolding someone else's codebase, so they are not resolved here.
 */
const PROJECT_TEMPLATE_DOCS = new Set([
  "docs/CLAUDE-template.md",
  "skills/team/dev-orchestrator/references/claude-md-template.md",
  "skills/team/dev-orchestrator/references/spec-chunking-guide.md",
  "skills/team/dev-orchestrator/references/playbook-template.md",
]);

{
  // Paths that are intentionally repo-external or example placeholders.
  const isExternal = (t) =>
    /^(?:https?:|mailto:|tel:|#)/i.test(t) ||
    /^\{/.test(t) ||
    /^[A-Za-z]+:/.test(t) || // "concept:reference" style prose
    t.includes("<") || // placeholders like /path/to/[file]
    /^\[[^\]]+\]$/.test(t) || // [t] marker
    t === "";

  for (const file of MD_FILES) {
    const relPath = rel(file);
    // Fenced code blocks hold emitted templates, not navigable repo links.
    const text = stripFences(read(file));
    const dir = dirname(file);
    for (const m of text.matchAll(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = m[2];
      if (isExternal(target)) continue;
      const [pathPart] = target.split("#");
      if (!pathPart) continue; // pure anchor link
      if (PROJECT_TEMPLATE_DOCS.has(relPath)) continue;
      // Repo-root-relative links appear as (/docs/x.md) or (docs/x.md)
      const abs = pathPart.startsWith("/")
        ? join(ROOT, pathPart.slice(1))
        : resolve(dir, pathPart);
      if (!existsPath(abs)) {
        err("A/links", `${relPath} -> ${target} (not found)`);
      }
    }
  }
}

function existsPath(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

// -------------------------------------- B. agent role reference integrity

/** Build the role vocabulary from agents/ + MANIFEST.md. */
const AGENT_FILES = ALL_FILES.filter(
  (f) => /agents[\\/](custom|third-party)[\\/].+\.md$/.test(rel(f)),
);

const agentIds = new Set(); // kebab-case file stems, e.g. "build-validator"
const roleNames = new Set(); // human names, e.g. "Build Validator"

for (const f of AGENT_FILES) {
  agentIds.add(rel(f).split("/").pop().replace(/\.md$/, ""));
  const fm = frontmatter(read(f));
  if (fm?.name) roleNames.add(fm.name.trim().toLowerCase());
}

// Skills are first-class workflow roles too — a doc may reference one by id.
const SKILL_FILES = ALL_FILES.filter((f) =>
  /skills[\\/].+[\\/]SKILL\.md$/.test(rel(f)),
);
for (const f of SKILL_FILES) {
  const id = rel(f).split("/").slice(0, -1).pop();
  agentIds.add(id);
  const fm = frontmatter(read(f));
  if (fm?.name) roleNames.add(fm.name.trim().toLowerCase());
}

// Optional roles are declared in agents/MANIFEST.md as `- `optional-name` — ...`
// in the "Optional" table. They are real pipeline roles with no shipped agent
// file; a pipeline that needs one must SKIP and log, not hallucinate it.
const manifestPath = join(ROOT, "agents", "MANIFEST.md");
const optionalRoles = new Set();
if (existsPath(manifestPath)) {
  for (const m of read(manifestPath).matchAll(/`([a-z]+(?:-[a-z0-9]+)+)`/g)) {
    if (!agentIds.has(m[1])) optionalRoles.add(m[1]);
  }
}

// A role is known if it has an agent file, a frontmatter `name:`, or is
// explicitly declared optional in the manifest.
const KNOWN = new Set([...agentIds, ...optionalRoles, ...roleNames]);

/**
 * Repo names that are legitimately referenced but are not workflow roles.
 * Kept explicit so the allowlist stays auditable rather than a regex hole.
 */
const NOT_ROLES = new Set([
  "softograph-custom",
  "softograph-adapted",
  "agency-agents",
  "pull-rebase",
  "context-agents",
  "user-entity",
  // Repo names, not roles.
  "ai-operating-system",
  "ai-operating-system-team",
  "autonomous-agent-orchestrator",
  // Hypothetical example in AGENT-LIFECYCLE.md's breaking-change protocol.
  "engineering-senior-v2",
  // Effect values used to describe what happens when an optional role is absent.
  "template-unavailable",
  "skip-inline",
  "skip-fold-into-gate",
]);

/**
 * A backticked token is treated as an agent reference when it appears near
 * agent-ish vocabulary or when it is kebab-case and matches the agent id shape.
 * We only check tokens in the doc set that define the workflow — a false
 * positive costs one edit, a false negative ships a broken pipeline.
 *
 * KNOWN LIMITATION: only *backticked* references are checked. A role named in
 * bare prose ("run the DevOps Automator for CI/CD") is invisible to this check,
 * because prose cannot be distinguished from an ordinary hyphenated phrase. The
 * house convention is to backtick role names in every doc — keeping it is what
 * makes this check meaningful.
 */
const ROLE_CONTEXT =
  /\b(?:agent|owner|role|gateway|gate|orchestrator|step\s*\d)/i;

for (const file of MD_FILES) {
  const relPath = rel(file);
  if (relPath === "tools/verify-workflow.mjs") continue;
  // Template docs describe roles from the master repo's wider catalogue;
  // this edition ships a developer subset.
  if (PROJECT_TEMPLATE_DOCS.has(relPath)) continue;
  const text = stripFences(read(file));

  for (const m of text.matchAll(/`([a-z][a-z0-9]*(?:-[a-z0-9]+)+)`/g)) {
    const token = m[1];
    if (KNOWN.has(token) || NOT_ROLES.has(token)) continue;
    // Context window: the rest of the line plus the previous line.
    const upto = text.indexOf(m[0]);
    const lineStart = text.lastIndexOf("\n", upto) + 1;
    const prevStart = text.lastIndexOf("\n", lineStart - 2) + 1;
    const context = text.slice(prevStart, lineStart + m[0].length + 200);
    if (!ROLE_CONTEXT.test(context)) continue;
    warn(
      "B/agents",
      `${relPath}: references role \`${token}\` — no agent file and not declared OPTIONAL in agents/MANIFEST.md`,
    );
  }
}

// ---------------------------------------------- C/D. frontmatter integrity

const skillIds = new Set();

for (const f of SKILL_FILES) {
  const id = rel(f).split("/").slice(0, -1).pop();
  const text = read(f);
  const fm = frontmatter(text);
  const where = rel(f);

  if (!fm) {
    err("C/skills", `${where}: missing YAML frontmatter`);
    continue;
  }
  if (fm.name !== id) {
    err("C/skills", `${where}: frontmatter name '${fm.name}' != directory '${id}'`);
  }
  if (skillIds.has(fm.name)) {
    err("C/skills", `${where}: duplicate skill name '${fm.name}'`);
  }
  skillIds.add(fm.name);

  if (!fm.description) err("C/skills", `${where}: missing 'description'`);
  const caps = fm.capabilities;
  if (!caps) {
    err(
      "C/skills",
      `${where}: missing 'capabilities' — the harness only dispatches on this key`,
    );
  } else if (!/\[.+\]/.test(caps)) {
    err("C/skills", `${where}: 'capabilities' is empty — ${caps}`);
  }
}

for (const f of AGENT_FILES) {
  const where = rel(f);
  const fm = frontmatter(read(f));
  if (!fm) {
    err("D/agents", `${where}: missing YAML frontmatter`);
    continue;
  }
  if (!fm.name) err("D/agents", `${where}: missing 'name'`);
  if (!fm.description) err("D/agents", `${where}: missing 'description'`);
}

// ------------------------------------------------------ E. gate consistency

// Pipeline templates live inside fenced blocks, so gate ids must be read from
// the raw text — stripping fences would hide every gate declared in a template.
const gateIdsIn = (text) =>
  new Set(
    [...text.matchAll(/\bGate\s+(\d+(?:\.\d+)?[a-z]?)\b/gi)].map((m) =>
      m[1].replace(/\.$/, ""),
    ),
  );

const agentsMd = ALL_RELPATHS.has("AGENTS.md") ? read(join(ROOT, "AGENTS.md")) : "";
const pipelineMd = existsPath(join(ROOT, "docs", "PIPELINE_PROTOCOL.md"))
  ? read(join(ROOT, "docs", "PIPELINE_PROTOCOL.md"))
  : "";

if (agentsMd && pipelineMd) {
  const a = gateIdsIn(agentsMd);
  const p = gateIdsIn(pipelineMd);
  const onlyPipeline = [...p].filter((g) => !a.has(g)).sort();
  const onlyAgents = [...a].filter((g) => !p.has(g)).sort();

  if (onlyPipeline.length || onlyAgents.length) {
    warn(
      "E/gates",
      `gate taxonomy differs — only in PIPELINE_PROTOCOL.md: [${
        onlyPipeline.join(", ") || "none"
      }]; only in AGENTS.md: [${onlyAgents.join(", ") || "none"}]. ` +
        `AGENTS.md is the entry point the harness reads — make it canonical and have the ` +
        `protocol defer to it.`,
    );
  }
}

// -------------------------------------------------- F. referenced repo assets

/**
 * Files that docs describe as living at the repo root and that the install
 * path depends on. Explicit rather than inferred, so the list stays auditable.
 */
const REQUIRED_REPO_ASSETS = ["capability-index.json"];

for (const asset of REQUIRED_REPO_ASSETS) {
  if (!ALL_RELPATHS.has(asset)) {
    err("F/assets", `${asset} is required by the install/verify path but is not in the repo`);
  }
}

// F2 — the capability index must agree with what is actually on disk. It is the
// planner's view of the system; if it drifts, the harness dispatches against
// agents that do not exist.
const EFFECT_VOCABULARY = new Set([
  "template-unavailable",
  "skip-inline",
  "skip-fold-into-gate-1.5a",
]);

if (ALL_RELPATHS.has("capability-index.json")) {
  let idx = null;
  try {
    idx = JSON.parse(read(join(ROOT, "capability-index.json")));
  } catch (e) {
    err("F/index", `capability-index.json does not parse: ${e.message}`);
  }

  if (idx) {
    for (const c of idx.capabilities ?? []) {
      if (!c.source) err("F/index", `capability '${c.id}' has no source path`);
      else if (!ALL_RELPATHS.has(c.source)) {
        err("F/index", `capability '${c.id}' points at ${c.source}, which does not exist`);
      }
    }
    // Every shipped agent and skill must appear in the index, or the planner
    // cannot see it. Derive the id from the path: skills/team/<id>/SKILL.md
    // and agents/<dir>/<id>.md both resolve to <id>.
    const idFromSource = (src = "") => {
      const parts = src.split("/");
      return parts[parts.length - 1] === "SKILL.md"
        ? parts[parts.length - 2]
        : (parts[parts.length - 1] || "").replace(/\.md$/, "");
    };
    const indexed = new Set((idx.capabilities ?? []).map((c) => idFromSource(c.source)));
    for (const id of agentIds) {
      if (!indexed.has(id)) warn("F/index", `agent/skill '${id}' is not in capability-index.json`);
    }
    for (const r of idx.optionalRoles ?? []) {
      if (!EFFECT_VOCABULARY.has(r.effect)) {
        err(
          "F/index",
          `optional role '${r.id}' has effect '${r.effect}', not in the vocabulary [${[
            ...EFFECT_VOCABULARY,
          ].join(", ")}]`,
        );
      }
      if (!optionalRoles.has(r.id)) {
        warn("F/index", `optional role '${r.id}' is not declared in agents/MANIFEST.md §5`);
      }
    }
    for (const id of optionalRoles) {
      if (!(idx.optionalRoles ?? []).some((r) => r.id === id)) {
        warn("F/index", `MANIFEST optional role '${id}' is missing from capability-index.json`);
      }
    }
  }
}

// ------------------------------ G. the AI never executes git writes

/**
 * The operating model is "agents propose, humans execute".
 *
 * KNOWN LIMITATION: we cannot reliably tell "run git push" from "never run
 * git push" with a regex — an earlier version of this check scanned line by line
 * and fired on its own prohibition tables and on every human-facing command
 * block. A check that cries wolf on correct content is worse than no check,
 * because it teaches people to ignore it.
 *
 * So this check verifies the *declarations* instead: the rule must be stated in
 * the files an agent actually reads, and the agent must have a block to emit.
 * The editorial discipline of writing role names and git commands clearly is
 * what keeps the rest of the workflow legible — same convention as check B.
 */

/** Agent-facing files, and the phrasing each must use to state the rule. */
const GIT_MODEL_FILES = [
  "AGENTS.md",
  "docs/PIPELINE_PROTOCOL.md",
  "docs/GIT-WORKFLOW.md",
  "skills/team/claude-code-protocol/SKILL.md",
  "agents/custom/project-shepherd.md",
];

const STATES_THE_RULE =
  /never run[s]? a git command that writes|never executes? a git|proposes?, the human|propose, the human|human executes?|never run[s]? a writing git/i;

for (const required of GIT_MODEL_FILES) {
  if (!ALL_RELPATHS.has(required)) {
    err("G/git-model", `${required} is missing but is agent-facing`);
    continue;
  }
  const text = read(join(ROOT, required));
  if (!STATES_THE_RULE.test(text)) {
    err(
      "G/git-model",
      `${required} does not state the "agent proposes, human executes" git rule`,
    );
  }
}

// The agent needs something concrete to emit, not just a prohibition.
for (const required of ["AGENTS.md", "docs/PIPELINE_PROTOCOL.md"]) {
  if (!ALL_RELPATHS.has(required)) continue;
  const text = read(join(ROOT, required));
  if (!/##\s*Proposed Git Workflow/i.test(text)) {
    err(
      "G/git-model",
      `${required} does not define a "## Proposed Git Workflow" block for the agent to emit`,
    );
  }
}

// ------------------------------------------------------------------ report

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code, s) => (useColor ? `[${code}m${s}[0m` : s);
const dim = (s) => paint("2", s);
const red = (s) => paint("31", s);
const yel = (s) => paint("33", s);
const grn = (s) => paint("32", s);

console.log("");
console.log(dim("  AI OS — workflow integrity check"));
console.log(dim(`  ${ALL_RELPATHS.size} files · ${agentIds.size} agents · ${skillIds.size} skills`));
console.log("");

if (warnings.length) {
  console.log(yel(`  ${warnings.length} warning(s):`));
  for (const w of warnings) console.log(yel(`    ! ${w}`));
  console.log("");
}
if (errors.length) {
  console.log(red(`  ${errors.length} error(s):`));
  for (const e of errors) console.log(red(`    x ${e}`));
  console.log("");
}

if (errors.length || (STRICT && warnings.length)) {
  console.log(red(`  FAIL${STRICT ? " (--strict)" : ""}`));
  console.log("");
  process.exit(1);
}

console.log(grn(`  PASS${warnings.length ? " (with warnings)" : ""}`));
console.log("");