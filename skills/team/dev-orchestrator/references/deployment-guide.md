# Deployment Guide

Platform-specific deployment checklists and requirements.

---

## iOS App Store

### Prerequisites
- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect access
- [ ] Xcode installed (for builds)
- [ ] Valid signing certificates

### App Store Connect Setup
1. Create new app in App Store Connect
2. Configure:
   - Bundle ID (must match Xcode project)
   - SKU (unique identifier)
   - Primary language
   - App category

### Required Assets
| Asset | Specification |
|-------|---------------|
| App Icon | 1024x1024 PNG, no alpha |
| Screenshots (iPhone) | 6.7" (1290x2796), 6.5" (1284x2778), 5.5" (1242x2208) |
| Screenshots (iPad) | 12.9" (2048x2732) if universal |
| App Preview (optional) | 15-30 second video |

### Metadata Required
- App name (30 chars max)
- Subtitle (30 chars max)
- Description (4000 chars max)
- Keywords (100 chars max, comma-separated)
- Support URL
- Privacy Policy URL
- Age rating questionnaire

### Build Submission
```bash
# Using Expo EAS
eas build --platform ios --profile production
eas submit --platform ios

# Or manual via Xcode
# Archive → Distribute App → App Store Connect
```

### Review Guidelines Checklist
- [ ] No placeholder content
- [ ] All features functional
- [ ] No private API usage
- [ ] Accurate screenshots
- [ ] Valid privacy policy
- [ ] No mention of other platforms
- [ ] Login credentials provided (if needed)

### Common Rejection Reasons
1. Crashes or bugs
2. Incomplete metadata
3. Placeholder content
4. Guideline 4.2 - Minimum functionality
5. Guideline 5.1.1 - Data collection disclosure

---

## Google Play Store

### Prerequisites
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Play Console access
- [ ] Signing key configured

### Play Console Setup
1. Create new app
2. Configure:
   - Default language
   - App or Game
   - Free or Paid

### Required Assets
| Asset | Specification |
|-------|---------------|
| App Icon | 512x512 PNG |
| Feature Graphic | 1024x500 PNG/JPG |
| Screenshots | Min 2, max 8 per device type |
| Phone | 16:9 or 9:16 aspect ratio |

### Metadata Required
- App name (50 chars max for title, 30 for short)
- Short description (80 chars max)
- Full description (4000 chars max)
- App category
- Contact email
- Privacy policy URL

### Build Submission
```bash
# Using Expo EAS
eas build --platform android --profile production
eas submit --platform android

# Or manual
# Generate AAB → Upload to Play Console
```

### Required Declarations
- [ ] Data safety form completed
- [ ] Content rating questionnaire
- [ ] Target audience and content
- [ ] News app declaration (if applicable)
- [ ] COVID-19 app declaration (if applicable)

### Testing Tracks
1. Internal testing (up to 100 testers, instant)
2. Closed testing (limited, 3-day review)
3. Open testing (public, 3-day review)
4. Production (full release)

---

## Web Deployment (Vercel)

### Prerequisites
- [ ] Vercel account
- [ ] GitHub/GitLab repo connected
- [ ] Environment variables ready

### vercel.json Configuration
```json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  }
}
```

### Environment Variables
Set in Vercel Dashboard → Settings → Environment Variables:
- Production, Preview, Development scopes
- Use Vercel secrets for sensitive values

### Domain Setup
1. Add custom domain in Vercel
2. Configure DNS:
   - A record: `76.76.21.21`
   - Or CNAME: `cname.vercel-dns.com`
3. SSL auto-provisioned

### Deployment Commands
```bash
# Via CLI
vercel --prod

# Or push to main branch (auto-deploy)
git push origin main
```

### Post-Deployment Checklist
- [ ] All routes accessible
- [ ] Environment variables working
- [ ] Database migrations run
- [ ] Auth flows functional
- [ ] Analytics connected

---

## Web Deployment (Railway)

### Prerequisites
- [ ] Railway account
- [ ] GitHub repo connected

### railway.toml Configuration
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
```

### Database Setup
1. Add PostgreSQL service
2. Copy DATABASE_URL to environment
3. Run migrations via CLI or deploy hook

### Deployment
```bash
# Via CLI
railway up

# Or push to connected branch
```

---

## Web Deployment (Cloudflare Pages)

### Prerequisites
- [ ] Cloudflare account
- [ ] GitHub repo connected

### Build Settings
- Framework preset: Next.js
- Build command: `npm run build`
- Build output: `.next`

### For Static Export
```javascript
// next.config.js
module.exports = {
  output: 'export',
}
```

### Environment Variables
Set in Pages → Settings → Environment variables

---

## CI/CD Pipeline (GitHub Actions)

### Basic Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
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
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```
