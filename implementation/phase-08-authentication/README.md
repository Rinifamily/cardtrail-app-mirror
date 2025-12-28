# Phase 08: Authentication (Better Auth)

## 🎯 Overview
Phase 08 introduces Better Auth with phone-number verification so we can graduate from local-only data to secured Supabase writes. This phase wires up the auth provider, SMS plugin (Aliyun/Tencent), protected routes, and client/session management while keeping existing local data intact for later migration.

## ✅ Goals
- Configure Better Auth per `planning/authentication-research.md` with email + phone flows
- Integrate SMS providers (Aliyun or Tencent) via pluggable interface; sandbox first
- Build auth UI (login/register/OTP) that follows design.md and mobile-first principles
- Add middleware/route guards to protect collection/watchlist sync APIs
- Document service key handling + secret storage (no secrets committed)

## 🔗 Prerequisites
- Phases 05-06 complete (local collection/watchlist ready for migration)
- Credentials request for SMS providers approved
- Review `planning/security-privacy.md` and `planning/backend-architecture.md`

## 📦 Deliverables
- [ ] Better Auth server configuration + client SDK wiring
- [ ] Phone plugin + SMS provider adapter with retry + rate limiting
- [ ] Auth UI screens + shared hooks (`useAuth`, `requireAuth` server helper)
- [ ] Middleware for protected routes and server actions
- [ ] README/task docs referencing future migrations + WeChat integration

## 🧪 Testing Strategy
- Unit tests for auth helpers, OTP validation, retry/backoff logic
- Playwright coverage for login/signup/reset flows on mobile + desktop breakpoints
- Manual QA verifying SMS flows using provider sandbox numbers

## ⚠️ Known Limitations
- WeChat + social login deferred to Phase 10
- Cloud sync not yet enabled; API endpoints return informative errors until Phase 09
- SMS delivery limited to approved test numbers until providers fully onboarded

## 📚 References
- `planning/authentication-research.md`
- `planning/security-privacy.md`
- `planning/backend-architecture.md`
- `planning/feature-breakdown.md`
