# Playbook Template

Standard structure for phase-based development playbooks.

---

## Playbook Header

```markdown
# {Project Name} - Phase {N}: {Phase Name}

**Duration:** {X} weeks
**Goal:** {One-sentence goal}
**Success Criteria:** {What "done" looks like}

## Prerequisites
- [ ] {Prerequisite 1}
- [ ] {Prerequisite 2}

## Environment Setup
{Any phase-specific setup needed}
```

---

## Task Structure

Each task follows this format:

```markdown
### Task {N}.{M}: {Task Title}

**Objective:** {What this task accomplishes}

**Estimated Time:** {hours/days}

**Dependencies:** 
- Task {N}.{X} (if any)

**Files to Create/Modify:**
- `path/to/file.ext` - {purpose}
- `path/to/another.ext` - {purpose}

**Claude Code Prompt:**
> {Exact prompt to copy-paste into Claude Code}
> 
> Include specific context:
> - Reference existing files
> - Specify conventions
> - Define expected behavior

**Implementation Notes:**
{Any additional context, edge cases, or considerations}

**Validation Checklist:**
- [ ] {Specific testable criterion}
- [ ] {Another criterion}
- [ ] {Visual/UX criterion if applicable}

**Commit Message:**
`{type}: {description}`
```

---

## Phase 1: MVP Template

```markdown
# {Project} - Phase 1: MVP

**Duration:** 4 weeks
**Goal:** Core functionality working on primary platform
**Success Criteria:** App runs, core loop works, data persists

## Week 1: Foundation

### Task 1.1: Project Setup
**Objective:** Initialize project with chosen stack

**Claude Code Prompt:**
> Initialize a new {framework} project called {name}.
> Use TypeScript, set up the following structure:
> {paste structure from archetype}
> 
> Include: ESLint, Prettier, basic CI config

**Validation:**
- [ ] Project builds without errors
- [ ] Linting passes
- [ ] Can run in development mode

---

### Task 1.2: Data Models
**Objective:** Define core data structures

**Claude Code Prompt:**
> Based on this data model spec:
> {paste from DATA_MODELS.md}
> 
> Create the database schema and TypeScript types.
> Use {ORM/database} as specified.

**Validation:**
- [ ] Schema migrations run successfully
- [ ] Types are exported and usable
- [ ] Basic CRUD operations work

---

## Week 2: Core Features

### Task 1.3: {Primary Feature}
...

## Week 3: Integration

### Task 1.5: {Integration Feature}
...

## Week 4: Polish & Testing

### Task 1.7: Manual Testing Pass
**Objective:** Verify all MVP features work

**Validation:**
- [ ] {Core flow 1} works end-to-end
- [ ] {Core flow 2} works end-to-end
- [ ] No crashes on happy path
- [ ] Data persists correctly

---

## Phase 1 Completion Checklist
- [ ] All tasks completed
- [ ] App runs on {primary platform}
- [ ] Core loop functional
- [ ] Ready for Phase 2
```

---

## Phase 2: Beta Template

```markdown
# {Project} - Phase 2: Beta

**Duration:** 4 weeks
**Goal:** Polish, edge cases, testable by others
**Success Criteria:** App on TestFlight/Internal Track, no critical bugs

## Week 5: Edge Cases & Error Handling

### Task 2.1: Error Boundaries
**Objective:** Graceful error handling throughout

**Claude Code Prompt:**
> Add comprehensive error handling:
> - Network errors with retry logic
> - Form validation with user feedback
> - Crash recovery and state restoration
> 
> Follow these patterns: {patterns}

---

## Week 6: Secondary Platform (if applicable)

### Task 2.3: Platform Adaptation
**Objective:** Adapt for {Android/iOS/Web}

---

## Week 7: Performance & Polish

### Task 2.5: Performance Optimization
**Objective:** Smooth 60fps, fast load times

---

## Week 8: Beta Release

### Task 2.7: TestFlight/Internal Track Submission
**Objective:** Get app to beta testers

**Validation:**
- [ ] Build uploaded successfully
- [ ] Test group can install
- [ ] Feedback mechanism in place
```

---

## Phase 3: Launch Template

```markdown
# {Project} - Phase 3: Launch

**Duration:** 4 weeks
**Goal:** Production-ready, publicly available
**Success Criteria:** Live on App Store/Play Store/Web

## Week 9: Production Hardening

### Task 3.1: Security Audit
**Objective:** Ensure app is secure for public use

---

## Week 10: App Store Preparation

### Task 3.3: Store Assets
**Objective:** Screenshots, descriptions, metadata

**Files to Create:**
- `marketing/screenshots/` - App Store screenshots
- `marketing/description.md` - Store description
- `marketing/keywords.txt` - ASO keywords

---

## Week 11: Submission

### Task 3.5: App Store Submission
**Objective:** Submit for review

**Validation:**
- [ ] All metadata complete
- [ ] Screenshots uploaded
- [ ] Build submitted
- [ ] Review notes added (if needed)

---

## Week 12: Launch & Monitor

### Task 3.7: Launch Day
**Objective:** App goes live

**Validation:**
- [ ] App approved and live
- [ ] Analytics tracking confirmed
- [ ] Crash reporting active
- [ ] Support channel ready
```

---

## Task Categories by Archetype

### Mobile Game Tasks
- Game loop implementation
- Level system
- Save/load system
- Leaderboards
- IAP integration
- Analytics events

### Mobile Utility Tasks
- Onboarding flow
- Core data CRUD
- Notification scheduling
- Background sync
- Widget (if applicable)
- Settings/preferences

### Web App Tasks
- Auth system
- Dashboard layout
- API endpoints
- Data tables/lists
- Forms and validation
- Admin features

### Content Platform Tasks
- Content management
- Publishing flow
- Subscriber system
- Email integration
- Payment integration
- SEO optimization
