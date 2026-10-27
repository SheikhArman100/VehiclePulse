# Specification Chunking Strategy

Prevent context decay by breaking large specifications into LLM-digestible chunks.

---

## The Problem

Large specifications (40k-80k tokens) cause:
- **Context decay** - LLM "forgets" early content
- **Hallucination** - Fills gaps with invented details
- **Inconsistency** - Contradicts itself across sections

## The Solution

Chunk specifications into **8k-15k token files** that can be loaded individually.

---

## Chunking Structure

```
project/
├── CLAUDE.md                    # Always loaded - current focus only
├── SYSTEM_CONTEXT.md            # Implementation status tracker
├── specs/
│   ├── 00-OVERVIEW.md           # 2-3k tokens - quick reference
│   ├── 01-ARCHITECTURE.md       # 8-15k tokens
│   ├── 02-DATA_MODELS.md        # 8-15k tokens
│   ├── 03-API_SPEC.md           # 8-15k tokens (if applicable)
│   ├── 04-AUTH_FLOW.md          # 5-10k tokens
│   ├── 05-UI_COMPONENTS.md      # 8-15k tokens
│   └── 06-INTEGRATION.md        # 5-10k tokens
├── docs/
│   ├── 10-INFRASTRUCTURE.md     # DevOps, CI/CD
│   ├── 11-DEPLOYMENT.md         # Platform-specific guides
│   └── 12-RUNBOOK.md            # Operations procedures
└── playbook/
    ├── PROGRESS.md              # Current status
    └── features/
        ├── FEATURE_01_xxx.md    # 3-5k tokens each
        └── ...
```

---

## File Size Guidelines

| File Type | Target Size | Max Size | Rationale |
|-----------|-------------|----------|-----------|
| CLAUDE.md | 2-4k tokens | 5k | Loaded every session |
| SYSTEM_CONTEXT.md | 1-2k tokens | 3k | Status snapshot |
| Overview spec | 2-3k tokens | 5k | Quick reference |
| Detail spec | 8-12k tokens | 15k | Deep dive content |
| Feature playbook | 3-5k tokens | 8k | Task-focused |

**Rule of thumb:** If a file exceeds 15k tokens, split it.

---

## SYSTEM_CONTEXT.md Template

This file tracks implementation status - update after each session:

```markdown
# System Context

## Current Implementation Status

**Last Updated:** 2026-01-25 14:30 UTC
**Last Session:** Feature F3 - User Dashboard
**Context Health:** Fresh (new session)

## Completed Components

| Component | Status | Tests | Notes |
|-----------|--------|-------|-------|
| Auth System | ✅ Done | ✅ Passing | Using Supabase Auth |
| User Model | ✅ Done | ✅ Passing | |
| API Routes | ⚠️ Partial | ⚠️ 3 failing | /api/users incomplete |

## In Progress

**Current Feature:** F3 - User Dashboard
**Current Task:** Task 2 - Implement dashboard layout
**Blocked By:** None

## Tech Stack (Locked)

- Framework: Next.js 14.1.0
- Database: Supabase (PostgreSQL)
- ORM: Prisma 5.8.0
- Auth: Supabase Auth
- Styling: Tailwind CSS 3.4

## Key Decisions This Session

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dashboard layout | Grid with sidebar | User preference for quick navigation |

## Files Modified This Session

- `src/app/dashboard/page.tsx` - Created
- `src/components/DashboardSidebar.tsx` - Created
- `prisma/schema.prisma` - Added DashboardWidget model

## Next Session Priorities

1. Complete dashboard widget components
2. Add tests for dashboard
3. Implement data fetching

## Context Loading Order

When starting new session, load in this order:
1. `CLAUDE.md` (always first)
2. `SYSTEM_CONTEXT.md` (this file)
3. `specs/01-ARCHITECTURE.md` (if architecture questions)
4. `playbook/features/FEATURE_03_dashboard.md` (current feature)
```

---

## Chunking Patterns

### Pattern 1: By Domain

Split by functional area:

```
specs/
├── 01-core-domain.md        # Core business logic
├── 02-user-domain.md        # User management
├── 03-content-domain.md     # Content/data domain
├── 04-billing-domain.md     # Payments/subscriptions
└── 05-admin-domain.md       # Admin functionality
```

### Pattern 2: By Layer

Split by technical layer:

```
specs/
├── 01-data-layer.md         # Database, models, queries
├── 02-api-layer.md          # Endpoints, validation
├── 03-business-layer.md     # Business logic, services
├── 04-presentation-layer.md # Components, UI
└── 05-infrastructure.md     # DevOps, deployment
```

### Pattern 3: By Feature (Recommended)

Split by user-facing features:

```
specs/
├── 00-overview.md           # System overview
├── 01-auth.md               # Authentication feature
├── 02-dashboard.md          # Dashboard feature
├── 03-settings.md           # Settings feature
└── 04-integrations.md       # Third-party integrations
```

---

## Cross-Reference Strategy

### Internal Links

Use relative markdown links:

```markdown
## User Model

See [Data Models](./02-DATA_MODELS.md#user-entity) for schema details.

## Authentication

Implements flow from [Auth Spec](./04-AUTH_FLOW.md).
```

### Dependency Tags

Mark dependencies at file top:

```markdown
---
depends_on:
  - 01-ARCHITECTURE.md
  - 02-DATA_MODELS.md
blocks:
  - 06-INTEGRATION.md
---

# API Specification
...
```

### Summary Blocks

Each file starts with a summary:

```markdown
# API Specification

## Quick Summary
- 12 REST endpoints
- JWT authentication
- Rate limited: 100 req/min
- OpenAPI spec available

## This Document Covers
1. Endpoint definitions
2. Request/response schemas
3. Error handling
4. Authentication flow

## Related Documents
- [Data Models](./02-DATA_MODELS.md) - Entity schemas
- [Auth Flow](./04-AUTH_FLOW.md) - Token management
```

---

## Context Loading Protocol

### For Claude Code Sessions

**Starting a session:**
```
"I'm continuing work on {project}. Please read these files in order:
1. CLAUDE.md
2. SYSTEM_CONTEXT.md
3. specs/{relevant-spec}.md
4. playbook/features/{current-feature}.md

Then confirm what you understand about the current state."
```

**Mid-session context refresh:**
```
"Context check: What is the current feature and task we're working on?
What files have we modified this session?"
```

**Before ending session:**
```
"Before we end, update SYSTEM_CONTEXT.md with:
1. What we completed
2. Current implementation status
3. Files modified
4. Next session priorities"
```

### Loading Priority

| Priority | File | When to Load |
|----------|------|--------------|
| Always | CLAUDE.md | Every session start |
| Always | SYSTEM_CONTEXT.md | Every session start |
| As needed | specs/00-OVERVIEW.md | New to project |
| As needed | Current feature playbook | Active development |
| On demand | Detailed specs | Specific questions |

---

## Token Estimation

Rough token counts for planning:

| Content Type | Tokens/Page | Tokens/1000 words |
|--------------|-------------|-------------------|
| Markdown prose | ~400 | ~1,300 |
| Code blocks | ~300 | ~1,000 |
| Tables | ~250 | ~800 |
| JSON/YAML | ~200 | ~700 |

**Quick estimate:** Word count × 1.3 ≈ token count

---

## Anti-Patterns

### ❌ Monolithic Spec
```
specs/
└── EVERYTHING.md  # 50k tokens - DO NOT DO THIS
```

### ❌ Too Granular
```
specs/
├── user-id-field.md
├── user-email-field.md
├── user-name-field.md  # Too fragmented
└── ...
```

### ❌ Duplicate Content
```
specs/
├── architecture.md     # Describes User model
└── data-models.md      # Also describes User model differently
```

### ✅ Right-Sized Chunks
```
specs/
├── 00-overview.md      # 3k tokens - system summary
├── 01-architecture.md  # 10k tokens - technical design
├── 02-data-models.md   # 8k tokens - all entities
└── 03-api-spec.md      # 12k tokens - all endpoints
```

---

## Maintenance Rules

1. **Review sizes monthly** - Files grow; split when needed
2. **Update cross-references** - Broken links cause confusion
3. **Prune obsolete content** - Dead specs mislead LLMs
4. **Version major changes** - Note when specs change significantly
5. **Test context loading** - Verify LLM can reconstruct understanding
