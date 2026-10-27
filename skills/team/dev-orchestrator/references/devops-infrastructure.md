# DevOps & Infrastructure Playbook

Zero-maintenance infrastructure for solo developers using AI-assisted development.

---

## Philosophy

> "The best infrastructure is the one you never think about."

For solo/small team projects, optimize for:
1. **Zero-ops** - No servers to manage
2. **Auto-scaling** - Handles traffic spikes automatically
3. **Built-in observability** - Know when things break
4. **AI-friendly** - LLM-readable configs and schemas

---

## Standard Stack Recommendations (2025-2026)

### Tier 1: The "Ship Fast" Stack

For MVPs and early-stage products:

| Layer | Technology | Why |
|-------|------------|-----|
| **Runtime** | Node.js (TypeScript) or Bun | Ecosystem, AI understands it well |
| **Framework** | Next.js 14+ (App Router) | Full-stack, serverless-ready |
| **Database** | Supabase | PostgreSQL + Auth + Realtime + Free tier |
| **ORM** | Prisma | LLM-readable schemas, migrations |
| **Hosting** | Vercel | Zero-config, auto-scaling |
| **Auth** | Supabase Auth or Clerk | Don't roll your own |
| **Payments** | Stripe | Industry standard |
| **Email** | Resend or Postmark | Transactional email |
| **File Storage** | Supabase Storage or Cloudflare R2 | S3-compatible, cheap |

### Tier 2: The "Scale Ready" Stack

For products expecting growth:

| Layer | Technology | Why |
|-------|------------|-----|
| **Runtime** | Node.js or Go | Performance at scale |
| **Framework** | Next.js + separate API | Separation of concerns |
| **Database** | PlanetScale or Neon | Serverless MySQL/PostgreSQL |
| **Cache** | Upstash Redis | Serverless Redis |
| **Queue** | Inngest or Trigger.dev | Background jobs |
| **Hosting** | Vercel + Railway | Frontend + Backend separation |
| **CDN** | Cloudflare | Global edge caching |

### Mobile Stack

| Platform | Technology | Why |
|----------|------------|-----|
| **Cross-platform** | React Native + Expo | One codebase, both platforms |
| **iOS-only** | SwiftUI | Native performance, Apple ecosystem |
| **Android-only** | Kotlin + Jetpack Compose | Modern Android |
| **Backend** | Same as web | Supabase works great with mobile |

---

## Infrastructure-as-Code Setup

### 1. GitHub Repository Structure

```
project/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml              # Lint, test, typecheck on PR
│   │   ├── deploy-preview.yml  # Deploy PR previews
│   │   └── deploy-prod.yml     # Deploy to production on main
│   └── CODEOWNERS              # Require review for critical files
├── .env.example                # Template for environment variables
├── .env.local                  # Local development (gitignored)
├── vercel.json                 # Vercel configuration
├── prisma/
│   └── schema.prisma           # Database schema
└── ...
```

### 2. GitHub Actions: CI Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run typecheck
      
      - name: Lint
        run: npm run lint
      
      - name: Test
        run: npm run test
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run security audit
        run: npm audit --audit-level=high
```

### 3. Vercel Configuration

Create `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret"
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

### 4. Prisma Schema (LLM-Readable)

```prisma
// prisma/schema.prisma
// This schema is designed to be readable by LLMs
// Each model includes comments explaining its purpose

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // For migrations
}

// User: Core user account information
// Relations: Has many Posts, has many Comments
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  avatar    String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  posts     Post[]
  comments  Comment[]
}

enum Role {
  USER
  ADMIN
}

// Add more models with clear comments
```

---

## Git Workflow for AI Agents

### Golden Rules

1. **Never commit directly to `main`** - Always use feature branches
2. **Use Conventional Commits** - Enables auto-changelog generation
3. **Small, focused commits** - One logical change per commit
4. **Review before merge** - Human validates AI work

### Branch Strategy

```
main (protected)
  └── develop (integration)
       ├── feature/auth-system
       ├── feature/user-dashboard
       ├── fix/login-redirect
       └── chore/update-deps
```

### Conventional Commits

| Prefix | Use For |
|--------|---------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `style:` | Formatting, no logic change |
| `refactor:` | Code change, no feature/fix |
| `test:` | Adding tests |
| `chore:` | Maintenance, deps |

**Examples:**
```bash
git commit -m "feat: add user authentication with Supabase"
git commit -m "fix: resolve redirect loop on login page"
git commit -m "docs: update API documentation for /users endpoint"
git commit -m "chore: upgrade Next.js to 14.1.0"
```

### Claude Code Git Workflow

**Starting a new feature:**
```
"Create a new feature branch called 'feature/{feature-name}' and switch to it.
Do not make any changes to main branch."
```

**Committing work:**
```
"Commit the current changes with a conventional commit message.
Use 'feat:' prefix for new features, 'fix:' for bug fixes."
```

**When things go wrong (hallucination recovery):**
```bash
# See what changed
git diff

# If changes are wrong, reset to last good state
git reset --hard HEAD

# If multiple bad commits, reset to specific commit
git log --oneline  # Find the good commit
git reset --hard <commit-hash>

# Nuclear option: reset to remote
git fetch origin
git reset --hard origin/main
```

### Pre-commit Hooks

Install with Husky:

```bash
npm install -D husky lint-staged
npx husky init
```

Create `.husky/pre-commit`:
```bash
#!/bin/sh
npx lint-staged
```

Create `lint-staged.config.js`:
```javascript
module.exports = {
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
};
```

---

## Observability Setup

### Error Tracking: Sentry

1. Install: `npm install @sentry/nextjs`

2. Configure `sentry.client.config.ts`:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### Analytics: Vercel Analytics (Free)

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Uptime Monitoring: Better Uptime or UptimeRobot

- Free tier available
- Alerts via email/Slack
- Status page included

---

## Environment Variables

### Structure

```bash
# .env.example (committed to git - template only)

# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # For Prisma migrations

# Authentication
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"

# Third-party services
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
RESEND_API_KEY="re_xxx"

# Observability
NEXT_PUBLIC_SENTRY_DSN="https://xxx@sentry.io/xxx"
```

### Security Rules

1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use secrets management** - Vercel/Railway handle this
3. **Rotate keys regularly** - Especially after team changes
4. **Principle of least privilege** - Use scoped API keys

---

## Deployment Checklist

### Pre-Launch

- [ ] All environment variables set in hosting platform
- [ ] Database migrations applied to production
- [ ] SSL certificate configured (usually automatic)
- [ ] Domain DNS configured
- [ ] Error tracking (Sentry) connected
- [ ] Analytics enabled
- [ ] Uptime monitoring configured
- [ ] Backup strategy defined

### Security

- [ ] HTTPS enforced
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Rate limiting on API routes
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma handles this)
- [ ] XSS prevention (React handles this)
- [ ] CORS configured properly

### Performance

- [ ] Images optimized (Next.js Image component)
- [ ] Bundle size analyzed
- [ ] Lighthouse score > 90
- [ ] Core Web Vitals passing
- [ ] Database queries optimized (no N+1)
- [ ] Caching strategy implemented

---

## Quick-Start Task Sequence

For Claude Code implementation:

### Task 1: Repository Setup
```
"Initialize a new git repository with:
1. .gitignore for Node.js/Next.js
2. .env.example with placeholders
3. README.md with project overview
4. /docs folder for specifications
Create initial commit with message 'chore: initial repository setup'"
```

### Task 2: Project Scaffolding
```
"Create a new Next.js 14 project with:
- TypeScript
- Tailwind CSS
- ESLint
- App Router
Install additional dependencies: prisma, @prisma/client
Initialize Prisma with PostgreSQL provider"
```

### Task 3: Database Schema
```
"Apply the Prisma schema from specs/DATA_MODELS.md.
Generate the Prisma client.
Create initial migration with name 'init'.
Commit with message 'feat: add initial database schema'"
```

### Task 4: CI/CD Pipeline
```
"Create GitHub Actions workflow at .github/workflows/ci.yml that:
1. Runs on pull requests to main
2. Installs dependencies
3. Runs typecheck, lint, and test
4. Fails if any check fails
Commit with message 'chore: add CI pipeline'"
```

### Task 5: Deployment Configuration
```
"Configure Vercel deployment:
1. Create vercel.json with build settings
2. Document required environment variables
3. Set up preview deployments for PRs
Commit with message 'chore: add Vercel deployment config'"
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails on Vercel | Check Node version, run `npm ci` locally |
| Database connection timeout | Use connection pooling (PgBouncer) |
| Environment variable undefined | Check Vercel dashboard, redeploy |
| Type errors in production | Run `npm run typecheck` locally first |
| Prisma migration failed | Reset with `prisma migrate reset` (dev only) |
| Git history corrupted by AI | `git reflog` to find good state, reset |
