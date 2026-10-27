# Discovery Questions

Gap analysis questions to ask when whitepaper is incomplete.

---

## Universal Questions (Always Ask)

### Platform & Deployment
1. **Target platforms?**
   - iOS, Android, both?
   - Web (PWA, desktop browser)?
   - Desktop (Electron)?

2. **Primary platform for MVP?**
   - Which platform to prioritize first?

### Technology
3. **Tech stack preference?**
   - Specific frameworks you want to use?
   - Or should I recommend based on project type?

4. **Existing infrastructure?**
   - Any services you already use (Supabase, Firebase, etc.)?
   - Preferred hosting provider?

### Business
5. **Monetization model?**
   - Free (ad-supported?)
   - Freemium (what's gated?)
   - Paid (one-time or subscription?)
   - B2B licensing?

6. **Target launch timeline?**
   - Specific deadline?
   - Flexible based on quality?

---

## Mobile Game Questions

### Game Design
1. **Core loop clarity?**
   - Is the main gameplay mechanic fully defined?
   - What's the "30-second experience"?

2. **Progression system?**
   - Levels? Endless? Both?
   - How does difficulty scale?

3. **Session length target?**
   - Quick sessions (2-5 min)?
   - Long sessions (15+ min)?

### Technical
4. **Graphics requirements?**
   - 2D or 3D?
   - Art style defined?
   - Animation complexity?

5. **Audio requirements?**
   - Music needed?
   - Sound effects scope?
   - Voice acting?

6. **Multiplayer/Social?**
   - Leaderboards?
   - Real-time multiplayer?
   - Async challenges?

### Monetization
7. **IAP strategy?**
   - Consumables (coins, lives)?
   - Unlockables (levels, characters)?
   - Remove ads?
   - Season pass?

---

## Mobile Utility Questions

### User Experience
1. **Onboarding complexity?**
   - Quick start possible?
   - Required setup steps?
   - Permission requests needed?

2. **Notification strategy?**
   - Push notifications needed?
   - What triggers them?
   - User control level?

3. **Offline capability?**
   - Must work offline?
   - Sync strategy when online?

### Data
4. **Data sensitivity?**
   - Personal/health data?
   - Financial data?
   - Compliance requirements (HIPAA, GDPR)?

5. **Data portability?**
   - Export features needed?
   - Import from other apps?

6. **Backup/sync?**
   - Cloud backup required?
   - Multi-device sync?

### Integrations
7. **System integrations?**
   - Contacts?
   - Calendar?
   - Health app?
   - Location services?

8. **Third-party integrations?**
   - WhatsApp/messaging?
   - Social media?
   - Other apps?

---

## Web App Questions

### Architecture
1. **User types?**
   - Single user type?
   - Multiple roles (admin, user, etc.)?
   - Multi-tenant?

2. **Auth requirements?**
   - Email/password?
   - Social login?
   - SSO/enterprise?

3. **API scope?**
   - Internal only?
   - Public API needed?
   - Third-party integrations?

### Scale
4. **Expected scale?**
   - Users at launch?
   - Growth expectations?
   - Geographic distribution?

5. **Real-time features?**
   - Live updates needed?
   - Collaborative features?
   - Chat/messaging?

### Compliance
6. **Regulatory requirements?**
   - GDPR compliance?
   - Industry-specific (HIPAA, SOC2)?
   - Data residency requirements?

---

## Content Platform Questions

### Content
1. **Content types?**
   - Text only?
   - Images/media?
   - Video?
   - Interactive elements?

2. **Publishing workflow?**
   - Single author?
   - Multiple contributors?
   - Editorial review process?

3. **Content frequency?**
   - Daily?
   - Weekly?
   - Irregular?

### Audience
4. **Subscriber management?**
   - Free subscribers?
   - Paid tiers?
   - Member-only content?

5. **Community features?**
   - Comments?
   - Forums?
   - Member directory?

### Monetization
6. **Revenue model?**
   - Subscriptions?
   - One-time purchases?
   - Sponsorships?
   - Ads?

7. **Payment processing?**
   - Stripe?
   - Platform-specific (Substack, Ghost)?
   - Multiple payment methods?

---

## Question Priority Matrix

| Question Type | Ask If... | Skip If... |
|---------------|-----------|------------|
| Platform | Always | Never skip |
| Tech stack | No preference stated | Explicit choice in whitepaper |
| Monetization | Not clearly defined | Detailed in whitepaper |
| Timeline | Not mentioned | Deadline specified |
| Integrations | Platform involves external services | Pure standalone app |
| Scale | Enterprise/B2B | Personal/hobby project |
| Compliance | Health/finance/enterprise | Consumer entertainment |

---

## How to Ask

**Good:** Batch related questions
> "A few quick clarifications:
> 1. Primary platform for MVP - iOS or Android first?
> 2. Tech stack preference or should I recommend?
> 3. Target timeline for MVP?"

**Bad:** One question at a time
> "What platform?"
> [wait]
> "What tech stack?"
> [wait]
> "What timeline?"

**Good:** Provide options
> "For monetization, I see three paths that fit this concept:
> A) Freemium - core free, premium for advanced features
> B) Paid upfront ($4.99) - no ads, full access
> C) Ad-supported free
> Which aligns with your vision?"

**Bad:** Open-ended
> "How do you want to monetize?"
