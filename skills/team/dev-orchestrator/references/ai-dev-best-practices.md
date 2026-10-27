# AI-Assisted Development Best Practices

A tool-agnostic playbook for working effectively with AI coding assistants (Claude Code, Gemini CLI, Cursor, Windsurf, etc.).

---

## Philosophy

> "Treat AI like a brilliant junior engineer who has read every Stack Overflow post but has never worked at your company."

The AI knows syntax, patterns, and best practices globally—but lacks context about YOUR codebase, YOUR conventions, and YOUR business logic. Your job is to provide that context efficiently.

---

## Part 1: Session Management

### 1.1 Start Every Session with Context

Before asking the AI to do anything:

1. **Load project context** - Ensure CLAUDE.md (or equivalent) exists and is read
2. **State the goal clearly** - "I want to add user authentication using Supabase"
3. **Specify constraints** - "We use TypeScript strict mode, no `any` types"

**Bad prompt:**
> "Add auth"

**Good prompt:**
> "Add email/password authentication using Supabase Auth. Follow our existing patterns in `/src/lib/`. Update the CLAUDE.md if you make architectural decisions."

### 1.2 Plan Before Executing

Most AI tools have a "plan mode" or can be asked to plan first.

| Tool | How to Enable Plan Mode |
|------|------------------------|
| Claude Code | `Shift+Tab` twice, or ask "plan this first" |
| Gemini CLI | Prefix with "Plan how to..." |
| Cursor | Use composer with "think step by step" |
| Generic | "Before writing code, outline your approach" |

**Why plan first?**
- Catches misunderstandings before wasted effort
- Lets you steer the architecture
- Creates a checklist you can verify against

### 1.3 Monitor Context Window Usage

All AI tools have context limits. Quality degrades as context fills.

| Threshold | Action |
|-----------|--------|
| 0-30% | Work normally |
| 30-50% | Consider summarizing progress |
| 50-70% | ⚠️ Prepare to restart session |
| 70%+ | 🛑 Start new session, carry over summary |

**Before restarting:**
1. Ask AI to summarize what was accomplished
2. Ask AI to list what remains
3. Save this summary to SYSTEM_CONTEXT.md or PROGRESS.md
4. Start fresh session with summary as first input

### 1.4 Parallel Sessions (Advanced)

Power users run multiple AI sessions simultaneously:

- **Session 1**: Main feature development
- **Session 2**: Writing tests for Session 1's code
- **Session 3**: Documentation updates
- **Session 4**: Refactoring/cleanup
- **Session 5**: Research/exploration

**Tips:**
- Number your terminal tabs (1-5)
- Use system notifications for when AI needs input
- Hand off completed work between sessions

---

## Part 2: Effective Prompting

### 2.1 The CRISPE Framework

| Element | Description | Example |
|---------|-------------|---------|
| **C**ontext | Background information | "We're building a B2B SaaS for inventory management" |
| **R**ole | What role should AI assume | "Act as a senior TypeScript developer" |
| **I**nstructions | What to do | "Implement the API endpoint for creating orders" |
| **S**pecifics | Constraints and details | "Use Zod for validation, return proper HTTP codes" |
| **P**urpose | Why this matters | "This is for our MVP launch next week" |
| **E**xamples | Show don't tell | "Similar to how we did `/api/products` endpoint" |

### 2.2 Prompt Patterns That Work

**Incremental Building:**
```
"First, create the database schema for orders.
Then, create the API route.
Then, add validation.
Finally, write tests."
```

**Verification Requests:**
```
"After making changes, run `npm run typecheck` and `npm run test` to verify."
```

**Pattern Matching:**
```
"Follow the same pattern as [existing file] but for [new feature]."
```

**Constraint Setting:**
```
"Do NOT modify any files in /src/core/. Only work in /src/features/orders/."
```

### 2.3 When AI Gets Stuck

Signs of trouble:
- Repeating the same error
- Making contradictory changes
- Excessive apologizing
- "Let me try a different approach" more than twice

**Recovery tactics:**
1. **Reset context**: "Stop. Let's step back. Here's what we're trying to do..."
2. **Simplify scope**: "Forget the edge cases. Just make the happy path work first."
3. **Ask for diagnosis**: "Don't fix it yet. First explain what you think is wrong."
4. **Manual intervention**: Fix the issue yourself, then explain what you did

---

## Part 3: Code Quality Loops

### 3.1 The Verification Principle

> "The single most important thing for quality: give AI a way to verify its work."

Verification methods by domain:

| Domain | Verification |
|--------|-------------|
| Backend API | Run tests, curl endpoints |
| Frontend UI | Browser testing, screenshot comparison |
| Database | Run migrations, check schema |
| CLI tools | Run with sample inputs |
| Libraries | Unit tests + integration tests |

### 3.2 The TDD Rhythm

Best results come from Test-Driven Development:

```
1. Write failing test first
2. AI implements minimum code to pass
3. Run test to verify
4. Refactor if needed
5. Repeat
```

**Prompt pattern:**
```
"Write a failing test for [feature]. Then implement the minimum code to make it pass."
```

### 3.3 Continuous Validation Commands

Always have these ready:

```bash
# Fast feedback (run constantly)
npm run typecheck        # or: bun run typecheck
npm run lint -- --fix    # auto-fix what's possible

# Before committing
npm run test             # full test suite
npm run build            # catch build errors

# Before PR
npm run lint && npm run test && npm run build
```

---

## Part 4: Project Configuration

### 4.1 The CLAUDE.md File (or equivalent)

Every project needs a context file the AI reads automatically.

**Essential sections:**

```markdown
# Project Name

## Commands
- `npm run dev` - Start development server
- `npm run test` - Run tests
- `npm run build` - Production build

## Architecture
- /src/features/ - Feature modules
- /src/lib/ - Shared utilities
- /src/types/ - TypeScript types

## Conventions
- Use `type` not `interface`
- Prefer named exports
- No `any` types - use `unknown` if needed

## Current Focus
Working on: Order management feature
Branch: feature/orders
```

### 4.2 Update CLAUDE.md Continuously

> "Anytime you see AI do something incorrectly, add it to CLAUDE.md so it knows not to do it next time."

Examples of learnings to add:

```markdown
## Learned Conventions
- Never use enums, use string literal unions instead
- Always use absolute imports (@/lib/...) not relative
- API routes must validate with Zod before processing
- Don't use console.log in production code
```

### 4.3 Slash Commands (Reusable Prompts)

Create reusable prompts for common workflows:

**Example: `/commit-push-pr`**
```markdown
Commit current changes with a descriptive message, push to origin, 
and create a PR with:
- Summary of changes
- Testing done
- Screenshots if UI changed
```

**Example: `/refactor-component`**
```markdown
Analyze this component for:
1. Unnecessary re-renders
2. Missing error boundaries
3. Accessibility issues
4. Type safety improvements

Then refactor following React best practices.
```

### 4.4 Subagents (Specialized Assistants)

Create specialized prompts for specific tasks:

**`code-simplifier`** - Runs after feature complete
```markdown
Review the code just written. Simplify without changing behavior:
- Remove dead code
- Consolidate duplicate logic
- Improve naming
- Add missing types
```

**`verify-app`** - End-to-end verification
```markdown
Test the application end-to-end:
1. Start the dev server
2. Run all test suites
3. Check for console errors
4. Verify main user flows work
Report any issues found.
```

**`security-check`** - Pre-PR security review
```markdown
Review for security issues:
- SQL injection possibilities
- XSS vulnerabilities
- Exposed secrets
- Missing authentication checks
- Insecure dependencies
```

---

## Part 5: Git Workflow for AI Development

### 5.1 Golden Rules

1. **Never commit directly to main** - Always use feature branches
2. **Small, atomic commits** - One logical change per commit
3. **Conventional commit messages** - `feat:`, `fix:`, `docs:`, `refactor:`
4. **Human reviews AI code** - Don't trust blindly

### 5.2 Branch Strategy

```
main (protected)
  └── develop (integration)
        ├── feature/auth
        ├── feature/orders  
        └── fix/login-bug
```

### 5.3 Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructure
- `test:` - Adding tests
- `chore:` - Maintenance

### 5.4 Recovering from AI Mistakes

```bash
# See what changed
git diff

# Undo all uncommitted changes
git checkout -- .

# Undo last commit but keep changes
git reset --soft HEAD~1

# Nuclear option: reset to remote state
git fetch origin
git reset --hard origin/main
```

---

## Part 6: Environment Setup Checklist

Before starting any AI-assisted development:

### 6.1 Git Configuration

```bash
# Identity
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# SSH key (check/generate)
ls ~/.ssh/id_ed25519.pub || ssh-keygen -t ed25519

# Add to GitHub/GitLab
cat ~/.ssh/id_ed25519.pub
# Copy and add to GitHub → Settings → SSH Keys

# Verify
ssh -T git@github.com
```

### 6.2 Development Tools

```bash
# Node.js (use nvm or fnm)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install --lts

# Bun (faster alternative)
curl -fsSL https://bun.sh/install | bash

# Package managers
npm install -g pnpm

# Common CLIs
npm install -g typescript tsx vercel supabase
```

### 6.3 Environment Variables

```bash
# Create .env.local for secrets (never commit!)
touch .env.local
echo ".env.local" >> .gitignore

# Common variables
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...
```

### 6.4 Editor/IDE Setup

- Install recommended extensions for your stack
- Configure auto-format on save
- Enable TypeScript strict mode
- Set up ESLint + Prettier

---

## Part 7: Daily Workflow

### Morning Startup

```bash
# 1. Pull latest
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/todays-task

# 3. Start AI session with context
# Load CLAUDE.md, state today's goal

# 4. Plan mode first
# Get agreement on approach before coding
```

### During Development

```bash
# Frequent verification
npm run typecheck  # After each file change
npm run test       # After each feature

# Small commits
git add -p         # Stage selectively
git commit -m "feat: add order validation"

# Monitor AI context
# Restart session if degrading
```

### Before Ending

```bash
# 1. Run full verification
npm run lint && npm run test && npm run build

# 2. Commit remaining changes
git add .
git commit -m "chore: end of day checkpoint"

# 3. Push for backup
git push origin feature/todays-task

# 4. Update SYSTEM_CONTEXT.md with progress
```

---

## Part 8: Anti-Patterns to Avoid

### ❌ Don't: Trust AI Blindly

Always verify:
- Security-sensitive code
- Database operations
- Payment/financial logic
- Authentication/authorization

### ❌ Don't: Let Context Rot

- Restart sessions before 50% context
- Keep CLAUDE.md updated
- Don't let the AI "forget" conventions

### ❌ Don't: Skip Planning

"Just make it work" leads to:
- Architectural debt
- Inconsistent patterns
- Wasted iterations

### ❌ Don't: Ignore Errors

If AI keeps hitting the same error:
- Stop and diagnose manually
- The AI might be in a loop
- Reset context and try different approach

### ❌ Don't: Work Without Tests

AI code without tests is dangerous:
- No way to verify correctness
- Breaks silently during refactors
- Impossible to maintain

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│                 AI DEV QUICK REFERENCE                  │
├─────────────────────────────────────────────────────────┤
│ START SESSION                                           │
│   1. Load context (CLAUDE.md)                           │
│   2. State goal clearly                                 │
│   3. Enter plan mode                                    │
│   4. Agree on approach                                  │
├─────────────────────────────────────────────────────────┤
│ DURING WORK                                             │
│   • Verify after each change                            │
│   • Commit small and often                              │
│   • Watch context usage (restart at 50%)                │
│   • Update CLAUDE.md with learnings                     │
├─────────────────────────────────────────────────────────┤
│ BEFORE COMMIT                                           │
│   • typecheck → lint → test → build                     │
│   • Review diff for mistakes                            │
│   • Write conventional commit message                   │
├─────────────────────────────────────────────────────────┤
│ WHEN STUCK                                              │
│   1. Ask AI to diagnose (not fix)                       │
│   2. Simplify scope                                     │
│   3. Reset context                                      │
│   4. Manual intervention                                │
├─────────────────────────────────────────────────────────┤
│ RECOVERY                                                │
│   git diff              # See changes                   │
│   git checkout -- .     # Undo all                      │
│   git reset --soft HEAD~1  # Undo commit                │
│   git reset --hard origin/main  # Nuclear               │
└─────────────────────────────────────────────────────────┘
```

---

## References

- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Boris Cherny's Claude Code Tips](https://twitter.com/bcherny) (Creator of Claude Code)
