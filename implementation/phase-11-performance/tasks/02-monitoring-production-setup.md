# Task 02: Monitoring & Production Setup

**Goal:** Complete monitoring infrastructure and production deployment

**Time Estimate:** 8 hours

**Phase:** Phase 8

**Dependencies:** Task 01 (Performance Optimization)

---

## 📖 Context

**What this task delivers:**
- Sentry error tracking configured
- Vercel Analytics installed
- Performance monitoring dashboard
- Uptime monitoring (UptimeRobot)
- Alert rules configured
- Security headers configured
- Production environment variables
- Health check endpoint
- Basic testing included
- Ready for production launch

**Why this matters:**
Monitoring enables proactive issue detection and resolution. Alerts notify the team before users report problems. Production setup ensures security and reliability.

**Planning docs:**
- `planning/performance-monitoring.md` - Monitoring setup (CRITICAL)
- `planning/deployment-operations.md` - Production deployment
- `planning/security-privacy.md` - Security headers
- `planning/agents.md` - Development guidelines (MANDATORY)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] Sentry captures errors and performance data
- [ ] Vercel Analytics tracks Web Vitals
- [ ] Uptime monitoring checks availability
- [ ] Alert rules notify team of issues
- [ ] Health check endpoint responds
- [ ] Security headers configured

**Technical Requirements:**
- [ ] Sentry SDK installed
- [ ] Vercel Analytics installed
- [ ] UptimeRobot configured
- [ ] Alert rules in Sentry
- [ ] Security headers in next.config.js

**Acceptance Criteria:**
- [ ] Sentry capturing errors
- [ ] Vercel Analytics tracking
- [ ] Uptime monitoring active
- [ ] Alerts tested
- [ ] Health check works
- [ ] Security headers set
- [ ] Deployed to production

---

## 📝 Implementation Approach

**Install Sentry:**
```bash
pnpm add @sentry/nextjs
pnpm dlx @sentry/wizard@latest -i nextjs
```

**sentry.client.config.ts:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

**Install Vercel Analytics:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**Health check:**
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
    },
  };
  
  return NextResponse.json(checks);
}
```

**Security headers (next.config.js):**
```javascript
module.exports = {
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      ],
    }];
  },
};
```

---

## ✅ Done When

- [ ] Sentry works
- [ ] Analytics tracks
- [ ] Uptime monitors
- [ ] Alerts configured
- [ ] Health check works
- [ ] Security headers set
- [ ] Deployed to production

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
