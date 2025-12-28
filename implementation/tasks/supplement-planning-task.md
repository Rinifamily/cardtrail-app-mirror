# Task: Supplement Missing Planning Documents

**Goal:** Create critical missing planning documents for testing, security, performance, deployment, and i18n

**Time Estimate:** 3-4 hours

---

## 📖 Context

**Current State:**
We have comprehensive architecture planning documents covering:
- ✅ Monorepo architecture
- ✅ Frontend/Backend architecture
- ✅ Database design
- ✅ API design
- ✅ Feature breakdown
- ✅ AI development guidelines (agents.md)
- ✅ Developer workflow

**What's Missing:**
Critical operational and quality assurance documents needed before development starts.

**Project Context:**
CardTrail is a Pokemon TCG price tracking app for the Chinese market. It needs:
- High quality (users trust price data)
- Security (user collections are private)
- Performance (mobile-first, data-heavy)
- i18n (Chinese + English + Japanese)

---

## ✅ Requirements

Create the following planning documents in `planning/` directory:

### 🔴 Priority 1: Immediate (Required Before Development)

#### **A. planning/testing-strategy.md** (CRITICAL)

**Testing Strategy for CardTrail**

Must cover:

**1. Testing Philosophy**
- Testing pyramid (E2E, Integration, Unit ratios)
- CI/CD integration
- Code coverage targets (80%+ for critical paths)

**2. E2E Testing with Playwright**
```typescript
// Example structure to document:
test('User can search for card and view details', async ({ page }) => {
  await page.goto('/search');
  await page.fill('[data-testid="search-input"]', 'Pikachu');
  await page.click('[data-testid="search-button"]');
  
  await expect(page.locator('[data-testid="card-item"]').first()).toBeVisible();
  
  await page.click('[data-testid="card-item"]').first();
  await expect(page).toHaveURL(/\/cards\/\d+/);
  await expect(page.locator('[data-testid="card-name"]')).toContainText('Pikachu');
});
```

**Coverage areas:**
- Critical user flows (search, collection management, price viewing)
- Authentication flows
- Mobile viewport testing
- Cross-browser testing (Chrome, Safari, Firefox)

**3. Integration Testing**
- API route testing (Next.js API handlers)
- Supabase query testing
- eBay API integration testing (with mocks)

**4. Unit Testing**
- CT Price calculation algorithm
- Utility functions
- React components (with React Testing Library)
- Form validation logic

**5. Visual Regression Testing**
- Storybook + Chromatic (optional Phase 3+)
- Screenshot comparisons

**6. Test Organization**
```
apps/web/
├── __tests__/
│   ├── e2e/              # Playwright E2E tests
│   │   ├── search.spec.ts
│   │   ├── collection.spec.ts
│   │   └── authentication.spec.ts
│   ├── integration/      # API + DB integration tests
│   │   ├── api/
│   │   └── services/
│   └── unit/             # Unit tests
│       ├── lib/
│       └── components/
└── playwright.config.ts
```

**7. CI/CD Pipeline**
- Run unit tests on every commit
- Run integration tests on PR
- Run E2E tests on main branch
- Parallel test execution
- Test result reporting

**8. Test Data Management**
- Test database setup (Supabase local)
- Seed data for testing
- Mock data for eBay API
- User fixtures

**9. Performance Testing**
- Load testing (k6 or Artillery)
- Lighthouse CI for web vitals
- Database query performance tests

#### **B. planning/security-privacy.md** (CRITICAL)

**Security & Privacy Strategy**

Must cover:

**1. Authentication & Authorization**
- Supabase Auth implementation
- JWT token handling
- Session management
- Password policies
- 2FA strategy (Phase 3+)

**2. Data Privacy**
- User collection data is PRIVATE (RLS policies)
- GDPR/CCPA compliance considerations
- PIPL compliance (China's privacy law)
- Data retention policies
- Right to deletion implementation

**3. Row-Level Security (RLS)**
```sql
-- Document all RLS policies:

-- Collections: Users can only see their own
CREATE POLICY "Users can view own collections"
ON collections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
ON collections FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Price history: Public read-only
CREATE POLICY "Anyone can view price history"
ON price_history FOR SELECT
USING (true);

-- Market indices: Public read-only
CREATE POLICY "Anyone can view market indices"
ON market_indices FOR SELECT
USING (true);
```

**4. API Security**
- Rate limiting (per user, per IP)
- Input validation (Zod schemas)
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitization)
- CSRF protection

**5. Secret Management**
- Environment variables
- Never commit secrets
- Rotation policy
- Supabase service key protection

**6. eBay API Security**
- API key protection
- Rate limit handling
- Webhook signature verification
- OAuth flow (if needed)

**7. Frontend Security**
- CSP (Content Security Policy) headers
- Secure cookie flags
- HTTPS enforcement
- Dependency vulnerability scanning

**8. Audit Logging**
- User action logs (collection changes)
- Admin action logs
- Security event logs
- Log retention policy

**9. Incident Response**
- Security breach procedures
- User notification templates
- Recovery procedures

### 🟡 Priority 2: Short-term (Before MVP Launch)

#### **C. planning/performance-monitoring.md**

**Performance & Monitoring Strategy**

Must cover:

**1. Performance Targets**
- First Contentful Paint (FCP): < 1.8s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.8s
- Cumulative Layout Shift (CLS): < 0.1
- First Input Delay (FID): < 100ms
- API response time: < 500ms (p95)

**2. Frontend Monitoring**
- Vercel Analytics (if using Vercel)
- Google Analytics 4
- Web Vitals tracking
- Error tracking (Sentry)

**3. Backend Monitoring**
- Supabase dashboard metrics
- API endpoint response times
- Database query performance
- eBay API latency

**4. Real User Monitoring (RUM)**
- Page load times by route
- User interaction metrics
- Error rates
- Geographic performance

**5. Performance Optimization**
- Image optimization (Next.js Image)
- Code splitting
- Bundle size monitoring
- CDN usage
- Database query optimization

**6. Alerting**
- Performance degradation alerts
- Error rate spikes
- API downtime
- Database connection issues

#### **D. planning/deployment-operations.md**

**Deployment & Operations Manual**

Must cover:

**1. Deployment Architecture**
```
Frontend (apps/web):
  → Vercel (recommended)
  OR → Cloudflare Pages
  OR → AWS Amplify

Database:
  → Supabase (managed PostgreSQL)

CDN:
  → Vercel Edge Network
  OR → Cloudflare CDN
```

**2. Environment Setup**
- Development (local)
- Staging (test production setup)
- Production

**3. Deployment Pipeline**
```mermaid
main branch → CI Tests → Build → Deploy to Production
feature/* → CI Tests → Deploy to Preview
```

**4. CI/CD Configuration**
- GitHub Actions workflows
- Test automation
- Build optimization
- Deployment automation

**5. Environment Variables**
```bash
# Document all required env vars:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
EBAY_APP_ID=
EBAY_DEV_ID=
EBAY_CERT_ID=
SENTRY_DSN=
```

**6. Database Migrations**
- Migration strategy (Supabase migrations)
- Rollback procedures
- Zero-downtime deployments

**7. Monitoring & Logging**
- Application logs
- Error tracking
- Performance monitoring
- Uptime monitoring

**8. Backup & Recovery**
- Database backup schedule
- Disaster recovery plan
- RTO/RPO targets

**9. Scaling Strategy**
- Horizontal scaling (Vercel auto-scales)
- Database scaling (Supabase connection pooling)
- CDN caching strategy

**10. Incident Management**
- On-call procedures
- Incident response playbook
- Post-mortem template

### 🟢 Priority 3: Long-term (Phase 3+)

#### **E. planning/internationalization.md**

**i18n Strategy for CardTrail**

Must cover:

**1. Supported Languages**
- 简体中文 (Simplified Chinese) - Primary
- English - Secondary
- 日本語 (Japanese) - Cards only
- 繁體中文 (Traditional Chinese) - Phase 3+

**2. i18n Library**
```typescript
// Document chosen approach:
// Option 1: next-intl (App Router compatible)
import { useTranslations } from 'next-intl';

export default function SearchPage() {
  const t = useTranslations('Search');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <input placeholder={t('placeholder')} />
    </div>
  );
}

// Option 2: next-i18next
// Option 3: Simple custom solution
```

**3. Content Structure**
```
locales/
├── zh-CN/
│   ├── common.json
│   ├── search.json
│   ├── collection.json
│   └── errors.json
├── en/
│   ├── common.json
│   └── ...
└── ja/
    └── cards.json  # Card names only
```

**4. Translation Workflow**
- Source language: English (for developers)
- Translation tool (Crowdin, Lokalise, or manual)
- Translation review process
- Missing translation fallbacks

**5. Locale-Specific Features**
- Currency display (CNY, USD, JPY)
- Date/time formatting
- Number formatting
- Sorting (Chinese character order)

**6. SEO Considerations**
- Language-specific URLs (/zh-CN/cards, /en/cards)
- hreflang tags
- Localized meta tags
- Sitemap per language

**7. Card Name Translation**
```typescript
// Card names in different languages:
interface Card {
  name_zh: string;  // 皮卡丘
  name_en: string;  // Pikachu
  name_ja: string;  // ピカチュウ
  name_display: string; // Based on locale
}
```

**8. Right-to-Left (RTL) Support**
- Not needed for Chinese/English/Japanese
- Potential Arabic support (Phase 4+)

---

## 🏗️ Architecture Constraints

### Must Follow

**Document Quality:**
- Each document 500-1000 lines
- Actionable and specific
- Include code examples
- Reference existing planning docs
- Consider Chinese market specifics

**Technical Constraints:**
- All strategies must work with our stack (Next.js, Supabase, Vercel)
- Playwright for E2E (not Cypress or Selenium)
- Must integrate with existing Taskfile workflow
- Must align with agents.md guidelines

**Security & Privacy:**
- MUST comply with Chinese privacy laws (PIPL)
- MUST protect user collection data (RLS)
- MUST NOT expose Supabase service keys
- MUST implement proper rate limiting

**Performance:**
- Mobile-first (most users on mobile)
- < 2s page load
- Optimize for Chinese networks (CDN in Asia)

---

## 📂 Expected Output

After completion, `planning/` should contain:

```
planning/
├── ... (existing 12 documents)
├── testing-strategy.md          # NEW - Playwright E2E + unit/integration
├── security-privacy.md          # NEW - RLS, auth, PIPL compliance
├── performance-monitoring.md    # NEW - Web vitals, alerts
├── deployment-operations.md     # NEW - CI/CD, environments
└── internationalization.md      # NEW - zh-CN/en/ja support
```

---

## 🧪 Validation Criteria

**How to validate these documents:**

- [ ] Testing strategy covers E2E, integration, unit tests
- [ ] Playwright examples are runnable
- [ ] Security policies include all RLS rules
- [ ] Privacy compliance addresses PIPL (China)
- [ ] Performance targets are specific and measurable
- [ ] Deployment procedures are step-by-step
- [ ] i18n strategy supports Chinese, English, Japanese
- [ ] All documents reference existing architecture
- [ ] Code examples are TypeScript
- [ ] Documents are internally consistent

---

## ✅ Acceptance Criteria

**Definition of Done:**

- [ ] All 5 planning documents created
- [ ] Each document is comprehensive (500-1000 lines)
- [ ] Testing strategy includes Playwright setup
- [ ] Security document includes all RLS policies
- [ ] Performance targets are specific
- [ ] Deployment procedures are complete
- [ ] i18n strategy covers 3 languages
- [ ] All documents follow agents.md guidelines
- [ ] Documents cross-reference each other
- [ ] Ready for task breakdown phase
- [ ] Changes committed and pushed

---

## 🎓 Key Considerations

**Testing (Playwright):**
- Focus on critical user journeys
- Mobile viewport testing essential
- Test authentication flows thoroughly
- Mock eBay API responses

**Security:**
- RLS is the primary security layer
- Never bypass RLS policies
- Protect user collection data above all
- Chinese privacy law compliance is mandatory

**Performance:**
- Chinese users may have slower connections
- Image optimization is critical (card images)
- Database query optimization important (28K+ cards)
- CDN in Asia region essential

**i18n:**
- Chinese is primary language
- Card names exist in 3 languages in data
- Currency conversion needed (CNY/USD/JPY)
- Date formatting differs by locale

---

## 📝 Notes

**For AI Agents Processing This Task:**

1. Read existing planning documents first
2. Understand CardTrail is for Chinese market
3. Playwright is non-negotiable for E2E
4. Security (RLS) is critical for user data
5. Performance on mobile is paramount
6. PIPL compliance is required for China
7. All documents must be production-ready

**Critical Documents:**
- `testing-strategy.md` - Blocks development start
- `security-privacy.md` - Blocks development start
- `performance-monitoring.md` - Needed for MVP
- `deployment-operations.md` - Needed for MVP
- `internationalization.md` - Can be Phase 3+

**Integration:**
- Testing strategy → integrates with CI/CD
- Security policies → enforced in code via agents.md
- Performance monitoring → tracks against targets
- Deployment → automated via GitHub Actions
- i18n → built into component architecture

---

**FINAL INSTRUCTIONS:**

Create comprehensive, production-ready planning documents that cover all aspects of testing, security, performance, deployment, and internationalization. Each document should be:
- Specific and actionable
- Include code examples
- Reference our tech stack
- Consider Chinese market needs
- Align with existing architecture

These documents will guide all future development and operations.

---

**Built with:** Agent Cube
**For:** CardTrail (卡迹) PTCG Price Tracker
**Purpose:** Complete planning documentation with operational excellence

