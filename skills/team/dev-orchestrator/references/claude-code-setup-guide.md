# Claude Code Setup Guide

Complete guide to setting up Claude Code from scratch, including all prerequisites, configurations, and first-run verification.

---

## Prerequisites Checklist

Before installing Claude Code, ensure your system has:

| Requirement | Check Command | Install If Missing |
|-------------|---------------|-------------------|
| macOS/Linux/WSL | `uname -s` | Windows users need WSL2 |
| Node.js 18+ | `node --version` | See Section 1.1 |
| Git | `git --version` | See Section 1.2 |
| GitHub/GitLab SSH | `ssh -T git@github.com` | See Section 1.3 |
| Text Editor | `code --version` or `cursor --version` | VS Code, Cursor, etc. |

---

## Part 1: System Prerequisites

### 1.1 Install Node.js

**Recommended: Use fnm (Fast Node Manager)**

```bash
# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Restart terminal, then install Node
fnm install --lts
fnm use lts-latest
fnm default lts-latest

# Verify
node --version   # Should be 18.x or higher
npm --version    # Should be 9.x or higher
```

**Alternative: Use nvm**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc
nvm install --lts
nvm use --lts
```

### 1.2 Install and Configure Git

```bash
# Install (macOS)
xcode-select --install

# Install (Ubuntu/Debian)
sudo apt update && sudo apt install git

# Configure identity (REQUIRED)
git config --global user.name "Your Full Name"
git config --global user.email "your.email@example.com"

# Useful defaults
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global push.autoSetupRemote true

# Verify
git config --list | grep user
```

### 1.3 Set Up SSH for GitHub/GitLab

```bash
# Check for existing SSH key
ls -la ~/.ssh/id_ed25519.pub

# If not found, generate new key
ssh-keygen -t ed25519 -C "your.email@example.com"
# Press Enter for default location
# Enter passphrase (optional but recommended)

# Start SSH agent
eval "$(ssh-agent -s)"

# Add key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to clipboard (macOS)
pbcopy < ~/.ssh/id_ed25519.pub

# Or display it to copy manually
cat ~/.ssh/id_ed25519.pub
```

**Add to GitHub:**
1. Go to GitHub → Settings → SSH and GPG keys
2. Click "New SSH key"
3. Paste the public key
4. Save

**Verify connection:**
```bash
ssh -T git@github.com
# Should see: "Hi username! You've successfully authenticated..."
```

### 1.4 Install Additional Tools (Recommended)

```bash
# Bun - faster than npm for many operations
curl -fsSL https://bun.sh/install | bash

# pnpm - efficient package manager
npm install -g pnpm

# TypeScript tools
npm install -g typescript tsx

# Common CLIs (install as needed)
npm install -g vercel          # Vercel deployments
npm install -g supabase        # Supabase CLI
npm install -g @anthropic-ai/claude-code  # Claude Code itself
```

---

## Part 2: Install Claude Code

### 2.1 Installation

```bash
# Install globally via npm
npm install -g @anthropic-ai/claude-code

# Or via Homebrew (macOS)
brew install claude-code

# Verify installation
claude --version
```

### 2.2 Authentication

```bash
# Login with Anthropic account
claude login

# This opens browser for OAuth
# Follow prompts to authenticate
```

### 2.3 First Run Test

```bash
# Create a test directory
mkdir ~/claude-test && cd ~/claude-test

# Initialize git (Claude Code works best with git)
git init

# Start Claude Code
claude

# Try a simple prompt:
> Create a file called hello.js that prints "Hello from Claude Code"
```

---

## Part 3: Personal Configuration

Claude Code uses `~/.claude/` for personal settings that apply to all projects.

### 3.1 Directory Structure

```bash
# Create personal config directory
mkdir -p ~/.claude/{commands,agents}

# Structure:
~/.claude/
├── settings.json      # Personal permissions & preferences
├── CLAUDE.md          # Global context (optional)
├── commands/          # Personal slash commands
│   ├── commit-push-pr.md
│   └── quick-test.md
└── agents/            # Personal subagents
    ├── code-simplifier.md
    └── security-check.md
```

### 3.2 Global Settings (settings.json)

Create `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(bun run *)",
      "Bash(pnpm run *)",
      "Bash(git status)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git branch*)",
      "Bash(git checkout*)",
      "Bash(git add*)",
      "Bash(git commit*)",
      "Bash(git push*)",
      "Bash(git pull*)",
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(wc *)",
      "Bash(mkdir *)",
      "Bash(touch *)",
      "Bash(cp *)",
      "Bash(mv *)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(sudo *)",
      "Bash(chmod 777 *)"
    ]
  },
  "preferences": {
    "model": "claude-sonnet-4-20250514",
    "thinking": true
  }
}
```

### 3.3 Global CLAUDE.md (Optional)

Create `~/.claude/CLAUDE.md` for conventions that apply to all your projects:

```markdown
# Global Development Conventions

## My Preferences
- Always use TypeScript with strict mode
- Prefer `type` over `interface`
- Never use `any` - use `unknown` if needed
- Use named exports, not default exports
- Prefer async/await over .then() chains

## My Stack
- Runtime: Bun preferred, Node.js fallback
- Package Manager: pnpm or bun
- Framework: Next.js 14+ (App Router)
- Database: Supabase (PostgreSQL)
- Styling: Tailwind CSS
- Validation: Zod

## Commit Conventions
- Use conventional commits (feat:, fix:, docs:, etc.)
- Keep commits atomic and focused
- Write meaningful commit messages

## When I Say...
- "Ship it" = commit, push, and create PR
- "Clean up" = refactor for readability without changing behavior
- "Make it work" = focus on functionality, ignore edge cases for now
```

---

## Part 4: Slash Commands

Slash commands are reusable prompts saved as `.md` files in `~/.claude/commands/` (personal) or `.claude/commands/` (project).

### 4.1 commit-push-pr.md

```markdown
---
description: Commit changes, push, and create a PR
---

1. Run `git status` to see changes
2. Run `git diff --stat` for summary
3. Craft a conventional commit message based on the changes
4. Run `git add -A`
5. Run `git commit -m "<your message>"`
6. Run `git push`
7. If this is a new branch, output the PR creation URL

Use these conventional commit types:
- feat: New feature
- fix: Bug fix  
- docs: Documentation
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance
```

### 4.2 quick-test.md

```markdown
---
description: Run typecheck, lint, and tests quickly
---

Run the following checks in sequence. Stop and report if any fail:

1. `npm run typecheck` (or `bun run typecheck`)
2. `npm run lint` (or `bun run lint`)
3. `npm run test` (or `bun run test`)

Report results as:
✅ Typecheck: passed
✅ Lint: passed (X warnings)
✅ Tests: X passed, 0 failed
```

### 4.3 review-code.md

```markdown
---
description: Review staged changes before committing
---

1. Run `git diff --cached` to see staged changes
2. Review for:
   - Type safety issues
   - Missing error handling
   - Security concerns (exposed secrets, SQL injection, XSS)
   - Performance issues (N+1 queries, unnecessary re-renders)
   - Missing tests for new functionality
3. Provide feedback in format:
   - 🔴 Critical: Must fix before commit
   - 🟡 Warning: Should consider fixing
   - 🟢 Suggestion: Nice to have
```

---

## Part 5: Subagents

Subagents are specialized AI assistants for specific tasks. Store in `~/.claude/agents/` (personal) or `.claude/agents/` (project).

### 5.1 code-simplifier.md

```markdown
---
name: code-simplifier
description: Simplifies and cleans up code after feature completion
---

You are a code simplification specialist. Review the recently modified files and:

1. **Remove Dead Code**
   - Unused imports
   - Commented-out code (unless marked with TODO)
   - Unreachable code paths

2. **Consolidate Duplicates**
   - Extract repeated logic into functions
   - Create shared utilities for common patterns

3. **Improve Readability**
   - Better variable/function names
   - Clearer control flow
   - Add brief comments for complex logic

4. **Type Improvements**
   - Replace `any` with specific types
   - Add missing return types
   - Use stricter types where possible

**Rules:**
- Do NOT change behavior
- Do NOT add new features
- Make minimal, surgical changes
- Run tests after each change to verify
```

### 5.2 verify-app.md

```markdown
---
name: verify-app
description: End-to-end application verification
---

Perform comprehensive verification of the application:

## 1. Build Checks
- Run `npm run typecheck`
- Run `npm run lint`
- Run `npm run build`

## 2. Test Suites
- Run `npm run test`
- Report coverage if available

## 3. Runtime Verification
- Start dev server: `npm run dev`
- Check for console errors
- Verify main routes are accessible

## 4. Report Format
```
=== VERIFICATION REPORT ===

Build Status: ✅/❌
- Typecheck: [result]
- Lint: [result]  
- Build: [result]

Tests: ✅/❌
- Passed: X
- Failed: X
- Coverage: X%

Runtime: ✅/❌
- Server starts: [yes/no]
- Console errors: [count]
- Main routes: [status]

Overall: PASS/FAIL
```
```

### 5.3 security-check.md

```markdown
---
name: security-check
description: Security review before merging
---

Perform security review of the codebase:

## Check For:

### 1. Secrets Exposure
- Hardcoded API keys
- Passwords in code
- Tokens in git history
- .env files committed

### 2. Injection Vulnerabilities
- SQL injection (raw queries)
- XSS (unescaped user input)
- Command injection (shell exec with user input)

### 3. Authentication/Authorization
- Missing auth checks on protected routes
- Improper session handling
- Weak password requirements

### 4. Data Exposure
- Sensitive data in logs
- Overly permissive API responses
- Missing rate limiting

### 5. Dependencies
- Run `npm audit` or `pnpm audit`
- Check for known vulnerabilities

## Report Format
```
=== SECURITY SCAN ===

🔴 Critical: [list items that must be fixed]
🟡 Warning: [list items that should be reviewed]
🟢 Info: [suggestions for improvement]

Recommendation: SAFE TO MERGE / NEEDS FIXES
```
```

### 5.4 build-validator.md

```markdown
---
name: build-validator
description: Validates build before deployment
---

Run comprehensive pre-deployment checks:

## 1. Clean Build
```bash
rm -rf node_modules/.cache .next dist build
npm run build
```

## 2. Environment Check
- Verify all required env vars are set
- Check for development-only values in production config

## 3. Bundle Analysis (if available)
- Run `npm run analyze` or equivalent
- Flag any bundles over 500KB

## 4. Production Readiness
- No console.log statements (except error handling)
- No debugger statements
- No TODO comments in critical paths
- Error boundaries in place

## Report
```
=== BUILD VALIDATION ===

Build: ✅/❌
Env Check: ✅/❌
Bundle Size: [X]KB (largest chunk)
Prod Ready: ✅/❌

Deploy: APPROVED / BLOCKED
Blockers: [list if any]
```
```

---

## Part 6: Hooks Configuration

Hooks run automatically at specific points in Claude Code's workflow.

### 6.1 PostToolUse Hook (Auto-Format)

Add to project `.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npm run format || true"
      }
    ]
  }
}
```

This runs formatter after every file write/edit.

### 6.2 PreCommit Hook

```json
{
  "hooks": {
    "PreCommit": [
      {
        "command": "npm run typecheck && npm run lint"
      }
    ]
  }
}
```

---

## Part 7: MCP Server Configuration

MCP (Model Context Protocol) servers extend Claude Code's capabilities.

### 7.1 Basic .mcp.json

Create `.mcp.json` in project root:

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "/path/to/allowed/dir"]
    }
  }
}
```

### 7.2 Common MCP Servers

```json
{
  "mcpServers": {
    "slack": {
      "type": "http",
      "url": "https://slack.mcp.anthropic.com/mcp"
    },
    "github": {
      "type": "http",
      "url": "https://github.mcp.anthropic.com/mcp"
    },
    "linear": {
      "type": "http",
      "url": "https://linear.mcp.anthropic.com/mcp"
    }
  }
}
```

---

## Part 8: System Diagnostics

### 8.1 Pre-Flight Check Script

Run this to verify your system is ready:

```bash
#!/bin/bash
echo "=== Claude Code Pre-Flight Check ==="

# Node
echo -n "Node.js: "
node --version 2>/dev/null || echo "❌ NOT INSTALLED"

# npm
echo -n "npm: "
npm --version 2>/dev/null || echo "❌ NOT INSTALLED"

# Git
echo -n "Git: "
git --version 2>/dev/null || echo "❌ NOT INSTALLED"

# Git config
echo -n "Git user.name: "
git config --global user.name || echo "❌ NOT SET"

echo -n "Git user.email: "
git config --global user.email || echo "❌ NOT SET"

# SSH
echo -n "SSH key: "
[ -f ~/.ssh/id_ed25519.pub ] && echo "✅ Found" || echo "❌ NOT FOUND"

# GitHub connection
echo -n "GitHub SSH: "
ssh -T git@github.com 2>&1 | grep -q "successfully" && echo "✅ Connected" || echo "❌ NOT CONNECTED"

# Claude Code
echo -n "Claude Code: "
claude --version 2>/dev/null || echo "❌ NOT INSTALLED"

# Claude auth
echo -n "Claude Auth: "
[ -f ~/.claude/auth.json ] && echo "✅ Logged in" || echo "⚠️ May need to run 'claude login'"

echo ""
echo "=== Directory Structure ==="
[ -d ~/.claude ] && echo "✅ ~/.claude exists" || echo "❌ ~/.claude missing"
[ -d ~/.claude/commands ] && echo "✅ ~/.claude/commands exists" || echo "⚠️ ~/.claude/commands missing"
[ -d ~/.claude/agents ] && echo "✅ ~/.claude/agents exists" || echo "⚠️ ~/.claude/agents missing"
[ -f ~/.claude/settings.json ] && echo "✅ ~/.claude/settings.json exists" || echo "⚠️ ~/.claude/settings.json missing"

echo ""
echo "=== Check Complete ==="
```

Save as `~/claude-preflight.sh` and run with:
```bash
chmod +x ~/claude-preflight.sh
~/claude-preflight.sh
```

---

## Part 9: Troubleshooting

### Git Push Fails

**Problem:** `Permission denied (publickey)`

**Solution:**
```bash
# Check SSH agent has key
ssh-add -l

# If empty, add key
ssh-add ~/.ssh/id_ed25519

# Test connection
ssh -T git@github.com
```

**Problem:** `remote: Repository not found`

**Solution:**
```bash
# Check remote URL
git remote -v

# If using HTTPS, switch to SSH
git remote set-url origin git@github.com:username/repo.git
```

### Claude Code Won't Start

**Problem:** `command not found: claude`

**Solution:**
```bash
# Reinstall
npm install -g @anthropic-ai/claude-code

# Check npm global bin is in PATH
npm config get prefix
# Add [prefix]/bin to your PATH in ~/.bashrc or ~/.zshrc
```

### Context Window Issues

**Problem:** Claude responses degrading in quality

**Solution:**
- Check token usage (shown in Claude Code UI)
- If over 50%, start new session
- Save progress summary before restarting

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────┐
│              CLAUDE CODE QUICK REFERENCE                │
├─────────────────────────────────────────────────────────┤
│ KEYBOARD SHORTCUTS                                      │
│   Shift+Tab (x2)    Enter Plan Mode                     │
│   Shift+Tab (x1)    Toggle auto-accept edits            │
│   Ctrl+C            Stop current operation              │
│   Esc               Cancel current input                │
├─────────────────────────────────────────────────────────┤
│ COMMON COMMANDS                                         │
│   /help             Show available commands             │
│   /permissions      Manage tool permissions             │
│   /config           View configuration                  │
│   /clear            Clear conversation                  │
├─────────────────────────────────────────────────────────┤
│ FILE LOCATIONS                                          │
│   ~/.claude/               Personal config              │
│   ~/.claude/settings.json  Permissions & prefs          │
│   ~/.claude/commands/      Personal slash commands      │
│   ~/.claude/agents/        Personal subagents           │
│   .claude/                 Project-specific config      │
│   CLAUDE.md                Project context (git root)   │
├─────────────────────────────────────────────────────────┤
│ THINKING MODES                                          │
│   "think about..."         Standard thinking            │
│   "think hard about..."    Extended thinking            │
│   "ultrathink..."          Maximum thinking             │
└─────────────────────────────────────────────────────────┘
```
