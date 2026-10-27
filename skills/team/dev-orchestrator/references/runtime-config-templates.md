# Claude Code Runtime Configuration Templates

Ready-to-use templates for personal Claude Code configuration (`~/.claude/`).

---

## Directory Structure

```
~/.claude/
├── settings.json              # Permissions & preferences
├── CLAUDE.md                  # Global development context (optional)
├── commands/                  # Slash commands
│   ├── commit-push-pr.md
│   ├── quick-test.md
│   ├── review-code.md
│   ├── start-feature.md
│   └── end-session.md
└── agents/                    # Subagents
    ├── code-simplifier.md
    ├── verify-app.md
    ├── security-check.md
    ├── build-validator.md
    └── oncall-guide.md
```

---

## 1. SUBAGENTS

### code-simplifier.md

```markdown
---
name: code-simplifier
description: Simplifies code after feature completion without changing behavior
---

You are a code simplification specialist. Review recently modified files and:

## Tasks

### 1. Remove Dead Code
- Unused imports
- Commented-out code (unless marked TODO)
- Unreachable code paths
- Unused variables and functions

### 2. Consolidate Duplicates
- Extract repeated logic into functions
- Create shared utilities for common patterns
- DRY up similar code blocks

### 3. Improve Readability
- Better variable/function names
- Clearer control flow
- Add brief comments for complex logic only

### 4. Type Improvements
- Replace `any` with specific types
- Add missing return types
- Use stricter types where possible
- Prefer `unknown` over `any`

## Rules
- ❌ Do NOT change behavior
- ❌ Do NOT add new features
- ❌ Do NOT refactor architecture
- ✅ Make minimal, surgical changes
- ✅ Run tests after each change
- ✅ Commit after each verified improvement
```

---

### verify-app.md

```markdown
---
name: verify-app
description: End-to-end application verification before merge/deploy
---

Perform comprehensive verification:

## 1. Static Checks
```bash
npm run typecheck   # TypeScript compilation
npm run lint        # Linting rules
```

## 2. Test Suites
```bash
npm run test        # Unit + integration tests
npm run test:e2e    # End-to-end (if available)
```

## 3. Build Verification
```bash
npm run build       # Production build succeeds
```

## 4. Runtime Checks (if dev server available)
- Start with `npm run dev`
- Check browser console for errors
- Verify main navigation works
- Test primary user flows

## 5. Report Format

```
╔══════════════════════════════════════╗
║       VERIFICATION REPORT            ║
╠══════════════════════════════════════╣
║ Typecheck:  ✅ Pass / ❌ Fail        ║
║ Lint:       ✅ Pass / ❌ Fail (Xw)   ║
║ Tests:      ✅ X pass / ❌ X fail    ║
║ Build:      ✅ Pass / ❌ Fail        ║
║ Runtime:    ✅ Pass / ❌ Fail        ║
╠══════════════════════════════════════╣
║ VERDICT:    ✅ READY / ❌ BLOCKED    ║
╚══════════════════════════════════════╝
```

If BLOCKED, list specific issues that must be fixed.
```

---

### security-check.md

```markdown
---
name: security-check
description: Security review before merging to main
---

Perform security review of changes:

## 1. Secrets Scan
Check for:
- Hardcoded API keys or tokens
- Passwords in source code
- Private keys committed
- .env files with real values in git

```bash
# Quick grep for common patterns
grep -r "API_KEY\|SECRET\|PASSWORD\|TOKEN" --include="*.ts" --include="*.js" src/
```

## 2. Injection Vulnerabilities

### SQL Injection
- Look for raw SQL with string concatenation
- Verify parameterized queries used

### XSS (Cross-Site Scripting)
- Check for `dangerouslySetInnerHTML`
- Verify user input is sanitized before display

### Command Injection
- Check for shell exec with user input
- Verify input validation on system calls

## 3. Auth/AuthZ Review
- Protected routes have auth middleware
- API endpoints verify permissions
- Session handling is secure
- Passwords properly hashed (bcrypt/argon2)

## 4. Data Exposure
- No sensitive data in logs
- API responses don't leak internal data
- Error messages don't expose internals

## 5. Dependency Audit
```bash
npm audit
# or
pnpm audit
```

## Report Format

```
╔══════════════════════════════════════╗
║       SECURITY SCAN REPORT           ║
╠══════════════════════════════════════╣
║ 🔴 CRITICAL (must fix):              ║
║    - [list items]                    ║
║                                      ║
║ 🟡 WARNING (should review):          ║
║    - [list items]                    ║
║                                      ║
║ 🟢 INFO (suggestions):               ║
║    - [list items]                    ║
╠══════════════════════════════════════╣
║ VERDICT: SAFE / NEEDS FIXES          ║
╚══════════════════════════════════════╝
```
```

---

### build-validator.md

```markdown
---
name: build-validator
description: Pre-deployment build validation
---

## 1. Clean Build
```bash
# Clear caches
rm -rf node_modules/.cache .next dist build out

# Fresh install (optional, if deps changed)
npm ci

# Production build
npm run build
```

## 2. Environment Check
Verify for production:
- [ ] All required env vars documented
- [ ] No development URLs in production config
- [ ] No debug flags enabled
- [ ] Correct API endpoints configured

## 3. Bundle Analysis
```bash
# If analyze script exists
npm run analyze

# Or check build output size
du -sh .next/ dist/ build/ 2>/dev/null
```

Flag concerns:
- Any chunk > 500KB
- Duplicate dependencies
- Dev dependencies in bundle

## 4. Production Readiness Checklist
- [ ] No `console.log` (except error handlers)
- [ ] No `debugger` statements
- [ ] No `// TODO` in critical paths
- [ ] Error boundaries in place (React)
- [ ] Loading states implemented
- [ ] 404/error pages exist

## 5. Report

```
╔══════════════════════════════════════╗
║     BUILD VALIDATION REPORT          ║
╠══════════════════════════════════════╣
║ Clean Build:    ✅/❌                ║
║ Env Check:      ✅/❌                ║
║ Bundle Size:    XXX KB (main)        ║
║ Prod Ready:     ✅/❌                ║
╠══════════════════════════════════════╣
║ DEPLOY: ✅ APPROVED / ❌ BLOCKED     ║
║ Blockers: [list if any]              ║
╚══════════════════════════════════════╝
```
```

---

### oncall-guide.md

```markdown
---
name: oncall-guide
description: Help debug production issues
---

You are an on-call debugging assistant. Help diagnose and fix production issues.

## Diagnostic Protocol

### 1. Gather Context
- What is the error message?
- When did it start?
- What changed recently? (Check git log)
- How many users affected?

### 2. Check Logs
```bash
# If using Vercel
vercel logs --follow

# If using Docker
docker logs <container> --tail 100

# If using PM2
pm2 logs --lines 100
```

### 3. Reproduce Locally
```bash
git checkout main
git pull
npm ci
npm run dev
# Try to reproduce the issue
```

### 4. Common Issues

#### Database Connection
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### Memory Issues
- Check for memory leaks
- Review recent changes for unbounded arrays/objects

#### API Failures
- Check external service status
- Verify API keys haven't expired
- Check rate limits

### 5. Quick Fixes

#### Revert Last Deploy
```bash
# Vercel
vercel rollback

# Git-based
git revert HEAD
git push
```

#### Restart Services
```bash
# PM2
pm2 restart all

# Docker
docker-compose restart
```

## Incident Report Template
```
## Incident: [Brief description]
**Severity:** P1/P2/P3
**Duration:** [start] - [end]
**Impact:** [users/systems affected]

### Timeline
- HH:MM - Issue reported
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Issue resolved

### Root Cause
[Description]

### Resolution
[What was done to fix]

### Prevention
[How to prevent recurrence]
```
```

---

## 2. SLASH COMMANDS

### commit-push-pr.md

```markdown
---
description: Commit changes, push to origin, create PR
---

## Pre-Commit Checks
```bash
git status
git diff --stat
```

## Commit Process

1. **Stage changes:**
```bash
git add -A
```

2. **Craft commit message** using conventional commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation
   - `style:` - Formatting
   - `refactor:` - Code restructuring
   - `test:` - Adding tests
   - `chore:` - Maintenance

3. **Commit:**
```bash
git commit -m "<type>(<scope>): <description>"
```

4. **Push:**
```bash
git push origin HEAD
```

5. **Output PR URL if new branch:**
```
Create PR at: https://github.com/<org>/<repo>/compare/<branch>
```
```

---

### quick-test.md

```markdown
---
description: Run typecheck, lint, and tests in sequence
---

Run verification suite:

```bash
# 1. Type checking
npm run typecheck

# 2. Linting (with auto-fix)
npm run lint --fix

# 3. Tests
npm run test
```

Report format:
```
Typecheck: ✅ Pass
Lint:      ✅ Pass (2 warnings)
Tests:     ✅ 42 passed, 0 failed
```

Stop and report on first failure.
```

---

### review-code.md

```markdown
---
description: Review staged changes before committing
---

## Show Changes
```bash
git diff --cached
```

## Review Checklist

### Type Safety
- [ ] No `any` types
- [ ] Proper null checks
- [ ] Return types explicit

### Error Handling
- [ ] Try/catch where needed
- [ ] Errors logged properly
- [ ] User-friendly error messages

### Security
- [ ] No secrets in code
- [ ] Input validated
- [ ] Output sanitized

### Performance
- [ ] No obvious N+1 queries
- [ ] No unnecessary re-renders
- [ ] Large data paginated

### Tests
- [ ] New code has tests
- [ ] Edge cases covered

## Feedback Format
- 🔴 **Critical:** Must fix before commit
- 🟡 **Warning:** Should consider fixing
- 🟢 **Suggestion:** Nice to have improvement
```

---

### start-feature.md

```markdown
---
description: Start a new feature branch with proper setup
---

## Branch Creation
```bash
# Ensure on latest develop/main
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/<feature-name>
```

## Context Setup

1. Create/update CLAUDE.md with feature context:
```markdown
## Current Focus
Feature: <feature-name>
Branch: feature/<feature-name>
Goal: <brief description>
```

2. Outline approach before coding:
   - What files will change?
   - What new files needed?
   - What tests required?
   - Any dependencies to add?

3. Enter Plan Mode to discuss architecture
```

---

### end-session.md

```markdown
---
description: Properly end a coding session with progress saved
---

## Session Wrap-up

### 1. Save Progress
```bash
# Stage and commit current work
git add -A
git status
git commit -m "wip: session checkpoint - <brief description>"
git push origin HEAD
```

### 2. Update SYSTEM_CONTEXT.md
Document:
- What was completed
- What's in progress
- What's next
- Any blockers or issues found

### 3. Run Verification
```bash
npm run typecheck
npm run lint
npm run test
```

### 4. Context Summary
Provide summary for next session:
```
## Session Summary - [DATE]

### Completed
- [x] Task 1
- [x] Task 2

### In Progress
- [ ] Task 3 (80% done, need to add tests)

### Next Session
1. Finish Task 3 tests
2. Start Task 4

### Notes
- [Any gotchas or decisions made]
```
```

---

## 3. SETTINGS.JSON (Permissions)

### Minimal Safe Preset

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git status)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(cat *)",
      "Bash(ls *)"
    ]
  }
}
```

### Developer Preset

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npx *)",
      "Bash(bun run *)",
      "Bash(bun *)",
      "Bash(pnpm run *)",
      "Bash(git *)",
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
      "Bash(mv *)",
      "Bash(curl *)",
      "Bash(which *)",
      "Bash(echo *)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Bash(sudo *)",
      "Bash(chmod 777 *)",
      "Bash(> /dev/*)"
    ]
  }
}
```

### Full Trust Preset (Use Carefully)

```json
{
  "permissions": {
    "allow": [
      "Bash(*)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(rm -rf ~)",
      "Bash(sudo rm *)",
      "Bash(dd if=*)"
    ]
  }
}
```

---

## 4. HOOKS CONFIGURATION

### Auto-Format on Write

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npm run format || true"
          }
        ]
      }
    ]
  }
}
```

### Prettier Specific

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write \"$FILE\" || true"
          }
        ]
      }
    ]
  }
}
```

### Lint on Write

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "npx eslint --fix \"$FILE\" || true"
          }
        ]
      }
    ]
  }
}
```

---

## 5. MCP SERVER CONFIGURATION

### .mcp.json Template

```json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "."]
    },
    "slack": {
      "type": "http",
      "url": "https://slack.mcp.anthropic.com/mcp"
    },
    "github": {
      "type": "http",
      "url": "https://github.mcp.anthropic.com/mcp"
    }
  }
}
```

### Supabase MCP

```json
{
  "mcpServers": {
    "supabase": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    }
  }
}
```

---

## Installation Script

Save this as `setup-claude-config.sh` and run to install all templates:

```bash
#!/bin/bash
set -e

echo "Setting up Claude Code personal configuration..."

# Create directories
mkdir -p ~/.claude/{commands,agents}

# Create settings.json if not exists
if [ ! -f ~/.claude/settings.json ]; then
  cat > ~/.claude/settings.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(bun run *)",
      "Bash(git *)",
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(grep *)"
    ],
    "deny": [
      "Bash(rm -rf /)",
      "Bash(sudo *)"
    ]
  }
}
EOF
  echo "✅ Created settings.json"
fi

echo "✅ Directory structure ready at ~/.claude/"
echo ""
echo "Next steps:"
echo "1. Copy desired command templates to ~/.claude/commands/"
echo "2. Copy desired agent templates to ~/.claude/agents/"
echo "3. Customize settings.json for your workflow"
```
