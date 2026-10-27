# CLAUDE.md Generation Template

This template guides generation of the critical `CLAUDE.md` file that Claude Code automatically reads.

## Template Structure

```markdown
# {Project Name}

{One-line description of what this project does}

## Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Production build
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run typecheck    # TypeScript type checking

# Database (if applicable)
npm run db:migrate   # Run migrations
npm run db:seed      # Seed development data
npm run db:studio    # Open database GUI
```

## Project Structure

```
{project}/
├── src/
│   ├── app/              # Next.js app router (or equivalent)
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Base UI primitives
│   │   └── features/    # Feature-specific components
│   ├── lib/             # Utilities and helpers
│   ├── hooks/           # Custom React hooks
│   ├── stores/          # State management
│   ├── types/           # TypeScript types
│   └── services/        # API clients, external services
├── tests/               # Test files mirror src/ structure
├── public/              # Static assets
└── specs/               # Architecture documentation
```

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | {e.g., Next.js 14} | App Router, Server Components |
| Language | TypeScript | Strict mode enabled |
| Styling | {e.g., Tailwind CSS} | Using {design system} |
| State | {e.g., Zustand} | For client state |
| Database | {e.g., Supabase} | PostgreSQL + Realtime |
| Auth | {e.g., Supabase Auth} | Email + OAuth |
| Testing | {e.g., Vitest + Testing Library} | |
| Deployment | {e.g., Vercel} | |

## Code Style

### Naming Conventions
- **Files:** kebab-case (`user-profile.tsx`)
- **Components:** PascalCase (`UserProfile`)
- **Functions/Variables:** camelCase (`getUserData`)
- **Constants:** SCREAMING_SNAKE (`API_BASE_URL`)
- **Types/Interfaces:** PascalCase with prefix (`IUser`, `TApiResponse`)

### Component Pattern
```typescript
// Prefer functional components with explicit typing
interface ComponentProps {
  title: string;
  onAction: () => void;
}

export function Component({ title, onAction }: ComponentProps) {
  // hooks first
  const [state, setState] = useState<StateType>(initialState);
  
  // derived values
  const computedValue = useMemo(() => /* ... */, [deps]);
  
  // effects
  useEffect(() => { /* ... */ }, [deps]);
  
  // handlers
  const handleClick = () => { /* ... */ };
  
  // render
  return (/* JSX */);
}
```

### Import Order
```typescript
// 1. React/Framework
import { useState, useEffect } from 'react';

// 2. External libraries
import { z } from 'zod';

// 3. Internal absolute imports
import { Button } from '@/components/ui';
import { useAuth } from '@/hooks';

// 4. Relative imports
import { localHelper } from './utils';

// 5. Types (if separate)
import type { UserType } from '@/types';
```

## Current Development Focus

**Phase:** {MVP / Beta / Launch}
**Feature:** {Current feature name}
**Task:** {Current task from playbook}

### What's Working
- {Feature 1} ✅
- {Feature 2} ✅

### In Progress
- {Feature 3} - {current task}

### Up Next
- {Feature 4}
- {Feature 5}

## Key Decisions Log

| Date | Decision | Choice | Rationale |
|------|----------|--------|-----------|
| {date} | Database | Supabase | Free tier, realtime, auth included |
| {date} | State Management | Zustand | Simple API, no boilerplate |
| {date} | {decision} | {choice} | {why} |

## Context Management ⚠️

**IMPORTANT for maintaining quality:**

1. **Check context usage** in Claude Code status bar
2. **Restart session** when context exceeds 50%
3. **Before restarting:** Update PROGRESS.md with current state
4. **After restarting:** Read this file + PROGRESS.md to restore context
5. **Use /compact** to preserve essential context if needed

## Session Continuity

When starting a new session:
```
"I'm continuing work on {project}. Current focus is {feature}, {task}. 
Please read CLAUDE.md and playbook/PROGRESS.md to get context."
```

## Links

- **Architecture:** [specs/ARCHITECTURE.md](specs/ARCHITECTURE.md)
- **Data Models:** [specs/DATA_MODELS.md](specs/DATA_MODELS.md)
- **API Spec:** [specs/API_SPEC.md](specs/API_SPEC.md)
- **Progress:** [playbook/PROGRESS.md](playbook/PROGRESS.md)
- **Current Feature:** [playbook/features/FEATURE_XX.md](playbook/features/)

## Environment Variables

Required in `.env.local`:
```
# Supabase (example)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Other services
{OTHER_REQUIRED_VARS}=
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Type errors after schema change | Run `npm run db:types` to regenerate |
| Tests failing unexpectedly | Clear Jest cache: `npm run test -- --clearCache` |
| Hot reload not working | Restart dev server, clear `.next` cache |
| {common issue} | {solution} |
```

---

## Generation Guidelines

### 1. Keep It Scannable
- Use tables over paragraphs
- Code blocks for commands
- Clear section headers

### 2. Include Runnable Commands
Every developer action should have a copy-paste command.

### 3. Document Decisions
Future-you (and Claude) needs to know WHY choices were made.

### 4. Update Continuously
This is a living document. Each session should leave it more accurate.

### 5. Context Management Section is Critical
This prevents the #1 issue: quality degradation from context overflow.

---

## Variations by Archetype

### Mobile Game (React Native + Expo)
```markdown
## Commands
npx expo start           # Start Expo dev server
npx expo run:ios         # Run on iOS simulator
npx expo run:android     # Run on Android emulator
npm run test             # Run tests
```

### Mobile Utility (Flutter)
```markdown
## Commands
flutter run              # Run on connected device
flutter test             # Run tests
flutter build apk        # Build Android APK
flutter build ios        # Build iOS (requires Mac)
```

### Web App (Next.js)
```markdown
## Commands
npm run dev              # Start at localhost:3000
npm run build            # Production build
npm run start            # Start production server
npm run lint             # ESLint
```

### Content Platform (Next.js + CMS)
```markdown
## Commands
npm run dev              # Start Next.js dev
npm run cms              # Start local CMS (if applicable)
npm run build            # Build static export
```
