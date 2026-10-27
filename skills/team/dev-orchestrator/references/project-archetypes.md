# Project Archetypes

Templates and conventions for each project type supported by the orchestrator.

---

## 1. Mobile Game (`mobile-game`)

### Indicators
- Game mechanics, levels, scoring systems
- Player progression, achievements
- Visual assets, animations, sound effects
- Session-based gameplay

### Recommended Stack
| Component | Recommendation | Alternatives |
|-----------|----------------|--------------|
| Engine | Unity (C#) | Godot, React Native + game libs |
| State | Local SQLite | Redux for simpler games |
| Backend | Firebase (leaderboards, analytics) | Supabase, custom |
| Monetization | RevenueCat | In-house IAP handling |

### Project Structure
```
{project}/
├── Assets/
│   ├── Scripts/
│   ├── Prefabs/
│   ├── Sprites/
│   └── Audio/
├── Scenes/
├── Documentation/
│   ├── GDD.md              # Game Design Document
│   ├── LEVEL_DESIGN.md
│   └── BALANCE_SHEET.md
└── Build/
```

### Key Specs to Generate
1. **Game Design Document (GDD)** - Core mechanics, progression, monetization
2. **Level Design Spec** - Level structure, difficulty curve
3. **Technical Architecture** - State management, save system, platform APIs

### Example Projects
- Epoch (discovery/puzzle)
- Broken (anti-OCD therapeutic)
- Guardian (reverse runner)

---

## 2. Mobile Utility App (`mobile-utility`)

### Indicators
- User data management
- Notifications/reminders
- Contact/calendar integration
- Background processes

### Recommended Stack
| Component | Recommendation | Alternatives |
|-----------|----------------|--------------|
| Framework | React Native + Expo | Flutter, SwiftUI/Kotlin |
| State | Zustand + AsyncStorage | Redux, MobX |
| Backend | Supabase | Firebase, custom Node.js |
| Database | PostgreSQL (via Supabase) | SQLite local-first |
| Auth | Supabase Auth | Firebase Auth, Auth0 |

### Project Structure
```
{project}/
├── app/                    # Expo Router pages
├── components/
├── hooks/
├── services/
│   ├── api/
│   ├── storage/
│   └── notifications/
├── store/
├── types/
└── docs/
    ├── ARCHITECTURE.md
    ├── DATA_MODELS.md
    └── playbook/
```

### Key Specs to Generate
1. **Architecture** - Component hierarchy, data flow
2. **Data Models** - User data, sync strategy
3. **API Spec** - Backend endpoints
4. **Notification Strategy** - Scheduling, permissions

### Example Projects
- Kinetic (relationship management)
- Mood Tracker (emotional wellness)
- Wallet (Apple Wallet pass generator)

---

## 3. Web Application (`web-app`)

### Indicators
- Dashboard/admin interfaces
- User accounts and authentication
- CRUD operations
- API-first architecture

### Recommended Stack
| Component | Recommendation | Alternatives |
|-----------|----------------|--------------|
| Framework | Next.js 14+ (App Router) | Remix, SvelteKit |
| Styling | Tailwind CSS | CSS Modules, styled-components |
| Database | PostgreSQL + Prisma | Supabase, PlanetScale |
| Auth | NextAuth.js | Clerk, Supabase Auth |
| Deployment | Vercel | Railway, Cloudflare Pages |

### Project Structure
```
{project}/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   └── api/
├── components/
│   ├── ui/
│   └── features/
├── lib/
│   ├── db/
│   └── utils/
├── prisma/
│   └── schema.prisma
└── docs/
```

### Key Specs to Generate
1. **Architecture** - Route structure, API design
2. **Database Schema** - Prisma models
3. **Auth Flow** - User roles, permissions
4. **Deployment Config** - Environment variables, CI/CD

---

## 4. Content Platform (`content-platform`)

### Indicators
- Publishing/blogging features
- Subscriber management
- Monetization (subscriptions, ads)
- SEO requirements

### Recommended Stack
| Component | Recommendation | Alternatives |
|-----------|----------------|--------------|
| Framework | Next.js + MDX | Ghost, Astro |
| CMS | Notion API or local MDX | Sanity, Contentful |
| Email | Resend + React Email | ConvertKit API |
| Payments | Stripe | Paddle, LemonSqueezy |
| Analytics | Plausible | PostHog, Umami |

### Project Structure
```
{project}/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   └── [slug]/
│   ├── (members)/
│   └── api/
├── content/
│   └── posts/
├── components/
├── lib/
│   ├── content/
│   └── email/
└── docs/
```

### Key Specs to Generate
1. **Content Strategy** - Post types, categories, SEO
2. **Monetization Model** - Free vs paid tiers
3. **Email Sequences** - Subscriber journeys
4. **Analytics Events** - Key metrics to track

### Example Projects
- Frivolous (long-form blog with AI illustrations)

---

## 5. Hybrid (`hybrid`)

### Indicators
- Mobile app + web dashboard
- Shared backend
- Cross-platform data sync

### Approach
Combine relevant archetypes:
1. Define shared backend first
2. Create mobile-specific specs
3. Create web-specific specs
4. Define sync strategy

### Recommended Stack
| Component | Recommendation |
|-----------|----------------|
| Shared Backend | Supabase or custom Node.js |
| Mobile | React Native + Expo |
| Web | Next.js |
| Shared Types | TypeScript monorepo |

### Project Structure
```
{project}/
├── apps/
│   ├── mobile/
│   └── web/
├── packages/
│   ├── shared/          # Types, utils
│   └── api-client/      # Shared API layer
└── docs/
```
