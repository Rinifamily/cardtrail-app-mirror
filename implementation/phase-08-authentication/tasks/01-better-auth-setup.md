# Task: Better Auth Setup with Phone Verification

**Task ID:** `phase-08-task-01`  
**Phase:** 08 – Authentication  
**Priority:** High  
**Estimated Time:** 18 hours  
**Dependencies:** Phases 05-06 complete, SMS provider credentials approved

---

## 🎯 Objective
Integrate Better Auth with email + phone OTP flows, wire SMS providers, expose auth UI, and protect server routes so future Supabase operations can rely on authenticated `user_id`.

---

## 📋 Context
CardTrail deferred auth to unblock core features. Now that local experiences exist, we need a robust auth foundation before syncing data (Phase 09). Better Auth provides flexible adapters and aligns with planning docs. This task sets up the provider, builds UI flows, and ensures secrets remain secure.

---

## 🔧 Requirements

### Functional Requirements
- [ ] Support signup/login via email + password
- [ ] Support phone number verification with SMS OTP (Aliyun/Tencent plugin)
- [ ] Implement password reset and phone re-verification flows
- [ ] Provide logout + session refresh handling (auto-refresh tokens)
- [ ] Display auth status in UI (avatar dropdown, "Login" CTA)

### Technical Requirements
- [ ] Follow `planning/authentication-research.md` configuration (Better Auth + Next.js App Router)
- [ ] Implement SMS adapter with retry/backoff + logging (no secrets in repo)
- [ ] Use `cookies().set()` for httpOnly session tokens; never store tokens in localStorage
- [ ] Create server helper `requireAuth()` to guard API routes/server actions
- [ ] Add middleware to block protected routes when unauthenticated
- [ ] Ensure analytics + error logging go through Sentry (PII stripped)

---

## 📝 Implementation Details

### Configuration
1. Install Better Auth + SMS plugin packages
2. Create `apps/web/lib/auth/server.ts`:
```typescript
export const auth = createAuth({
  providers: {
    emailPassword: {...},
    phone: phoneProvider({
      transport: aliyunSms({
        accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID!,
        accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET!,
        signName: 'CardTrail',
        templateCode: process.env.ALIYUN_SMS_TEMPLATE!
      })
    })
  },
  session: {
    cookieName: 'cardtrail_session',
    cookieOptions: { httpOnly: true, secure: true, sameSite: 'lax' }
  }
});
```
3. Client hook `useAuth()` consuming Better Auth SDK for user/session state.

### UI
- Screens: Login, Signup, Phone Verification, Password Reset.
- Follow design.md (padded panels, 12px radius, red/green semantics).
- Localized messages (中文 primary with English secondary text).

### Middleware
```typescript
export const middleware = async (req: NextRequest) => {
  const session = await auth.getSession(req);
  if (PROTECTED_PATHS.some(path => req.nextUrl.pathname.startsWith(path)) && !session) {
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  return NextResponse.next();
};
```

### SMS Provider Handling
- Store credentials in `.env.local` (never committed)
- Add Taskfile instructions for setting secrets in CI
- Implement exponential backoff + fallback provider (Aliyun primary, Tencent secondary) controlled via feature flag

### Security
- Audit logging: log auth events with anonymized user ID (hash) to Supabase or Sentry
- Rate limiting for OTP requests (max 5 per 15 minutes per phone number)

---

## 🧪 Testing Strategy

### Unit Tests
- Mock Better Auth server to test `requireAuth` helper
- Validate SMS adapter handles retries + error mapping

### E2E Tests
- Playwright: signup flow (email), login flow (phone), password reset, logout; run on mobile viewport

### Manual QA
- Use provider sandbox numbers; verify multi-language messaging in SMS templates
- Inspect cookies to ensure httpOnly + secure flags set
- Confirm middleware redirects unauthenticated users gracefully

---

## ✅ Acceptance Criteria
- [ ] Users can sign up/login via email or phone OTP
- [ ] Sessions stored in secure cookies with automatic refresh
- [ ] Protected routes + server actions require auth via shared helper
- [ ] SMS adapter handles retries and logs errors without exposing secrets
- [ ] Tests (unit + e2e) pass; manual QA notes attached

---

## 📚 References
- `planning/authentication-research.md`
- `planning/security-privacy.md`
- Better Auth docs: https://better-auth.dev/
- Aliyun SMS docs / Tencent Cloud SMS docs

---

## 🚧 Known Limitations
- Only Aliyun/Tencent SMS supported initially; Twilio integration deferred
- WeChat and other OAuth providers handled in Phase 10
- Analytics for auth funnel limited to console logging until Phase 11 instrumentation

---

## 📊 Success Metrics
- Signup success rate ≥ 95% (sandbox metrics)
- OTP delivery success ≥ 98% to approved numbers
- Session refresh errors < 0.5% of auth calls
