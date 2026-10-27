# AI OS — Developer Guide Hub

**For:** Softograph Developers, Software Engineers, and QA Teams · **Internal only.**  
This is the documentation hub for the engineering build loop: the skills, autonomous agents, and verification protocols that drive software development.

---

## 1. Quick Navigation

| Focus Area | Document | What it covers |
|---|---|---|
| 🛠️ **Developer Quickstart** | [FOR-DEVELOPERS.md](FOR-DEVELOPERS.md) | Day-to-day command cheat sheet, skills to load, build loop basics |
| 📋 **Pipeline Execution** | [PIPELINE_PROTOCOL.md](PIPELINE_PROTOCOL.md) | Autonomous agent handoffs, `---AGENT-DONE---` format, gate sequences |
| 🔄 **Git Workflow** | [GIT-WORKFLOW.md](GIT-WORKFLOW.md) | Branch claim protocol, post-commit push verification, session close |
| 🏗️ **Architecture & Models** | [DEVELOPER-GUIDE.md](DEVELOPER-GUIDE.md) | The Brain-Soul-Body model, custom skill/agent authoring |
| 🚀 **Setup & Installation** | [INSTALL.md](INSTALL.md) | Harness installation (opencode, Antigravity, Claude Code) |
| 📦 **Project Scaffolding** | [NEW_PROJECT_SETUP.md](NEW_PROJECT_SETUP.md) | Step-by-step setup for new applications |
| 🤝 **Project Handover** | [NEW-PROJECT-HANDOVER.md](NEW-PROJECT-HANDOVER.md) | Pre-flight and post-flight checklists for delivery |

---

## 2. The Developer Build Loop

Engineering work follows a disciplined four-beat loop:

1. **Front-load context**: Load [`skills/team/dev-orchestrator`](../skills/team/dev-orchestrator) with your feature spec or PRD.
2. **Decompose & Scaffold**: Generate a milestone plan mapping steps to agent capabilities.
3. **Drive the build**: The harness dispatches specialized agents for implementation.
4. **Enforce runtime gates**: Validate functionality with runtime testing (`testing-integration-tester`), visual review (`design-ui-designer`), and automated security checks (`security-check`).

The authoritative gate sequence is [`AGENTS.md`](../AGENTS.md). The authoritative agent
registry is [`agents/MANIFEST.md`](../agents/MANIFEST.md). This page is an index, not a
definition — if these disagree, those two win.

---

## 3. Harness Hierarchy

Preferred harness order for development tasks:
1. **`opencode`** (default & primary)
2. **`Antigravity`** (DeepMind / advanced paired agent workflows)
3. **`Claude Code`** (terminal CLI sessions)

---

## 4. Manuals & Worked Runs

| Document | Format | Description |
|---|---|---|
| [Team Guide](ai-os-team-guide.pdf) | PDF / [HTML](ai-os-team-guide.html) | Comprehensive developer build guide end to end. |
| [Team Playbook](ai-os-team-playbook.pdf) | PDF / [HTML](ai-os-team-playbook.html) | Worked runs of the loop on real development tasks. |

---

## 5. Developer Rules of Thumb

- **Never trust a model's summary of its own work.** Always verify runtime functionality at Gate 1.5.
- **Push before emitting `---AGENT-DONE---`.** Unpushed local commits break multi-agent handoffs.
- **Keep code simple.** Use `code-simplifier` to refactor working code for clarity before merging.
