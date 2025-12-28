# Task: WeChat Login & Account Linking

**Task ID:** `phase-10-task-01`  
**Phase:** 10 – WeChat Login & Social  
**Priority:** High  
**Estimated Time:** 16 hours  
**Dependencies:** Phase 08 auth, Phase 09 cloud sync, WeChat Open Platform approval

---

## 🎯 Objective
Introduce WeChat OAuth login and enable existing Better Auth accounts to link/unlink WeChat identities, while preparing share flows hooked into WeChat JS SDK.

---

## 📋 Context
Chinese users expect frictionless WeChat login. We already have phone/email auth; this task adds OAuth + linking without duplicating accounts. It also exposes share entry points for card detail + rankings so Phase 04 outputs can be promoted socially.

---

## 🔧 Requirements

### Functional Requirements
- [ ] WeChat OAuth endpoints: `/api/auth/wechat/login`, `/api/auth/wechat/callback`
- [ ] Account linking UI in settings allowing “Link/Unlink WeChat”
- [ ] New signups via WeChat automatically create Better Auth user + Supabase profile
- [ ] Share buttons on card detail + rankings trigger WeChat share sheet when opened inside WeChat browser
- [ ] Graceful fallback for non-WeChat browsers (copy link toast)

### Technical Requirements
- [ ] Store WeChat credentials via environment variables (AppID, AppSecret)
- [ ] Use state parameter + PKCE to prevent CSRF
- [ ] Persist WeChat unionid/openid in new table `wechat_accounts` referencing Better Auth user
- [ ] Enforce uniqueness (one WeChat account per CardTrail account)
- [ ] Integrate WeChat JS SDK initialization (signature endpoint) for share features
- [ ] Log auth + linking events (Sentry + database audit)

---

## 📝 Implementation Details

### OAuth Flow
1. User taps “微信登录” or “Link WeChat” → redirect to WeChat OAuth (snsapi_userinfo).
2. Callback handler exchanges code for access token + unionid.
3. If unionid found, log user in; otherwise create new Better Auth user + Supabase profile.
4. Store mapping in `wechat_accounts` table:
```sql
CREATE TABLE wechat_accounts (
  wechat_unionid TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  avatar_url TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Linking UI
- Settings page card showing current status, last linked date, unlink button.
- Unlink requires confirmation modal explaining that login via WeChat will stop working.

### Share Flows
- On `/cards/[id]` and `/rankings`, include `ShareButton` that detects WeChat browser via UA.
- Within WeChat, initialize JS SDK:
```typescript
const { signature } = await fetch('/api/wechat/signature?url=' + encodeURIComponent(location.href)).then(r => r.json());
wx.config({ ...signatureConfig });
wx.ready(() => {
  wx.updateAppMessageShareData({ title, desc, link, imgUrl });
});
```
- Outside WeChat, fallback to copy link toast.

### Compliance
- Include ICP info + privacy statement per WeChat requirements.
- Provide contact email for account issues.

---

## 🧪 Testing Strategy

### Unit Tests
- Linking/unlinking service functions, ensuring duplicates rejected
- Signature endpoint generating correct hash

### E2E Tests
- Playwright with mocked WeChat OAuth (use msw/Next test route) verifying login + linking flows
- Manual tests inside real WeChat on iOS/Android for share + login

### Manual QA
- Validate bilingual copy on all prompts
- Confirm fallback flows (non-WeChat browsers) display instructions
- Verify unlink removes mapping and prevents login via WeChat until relinked

---

## ✅ Acceptance Criteria
- [ ] Users can log in via WeChat and access protected routes
- [ ] Existing accounts can link/unlink WeChat while preserving data
- [ ] Share buttons trigger WeChat share sheet when applicable; fallback works elsewhere
- [ ] `wechat_accounts` table + audit logs capture link events
- [ ] Tests (unit + e2e) passing; manual QA documented

---

## 📚 References
- `planning/authentication-research.md#wechat`
- WeChat Open Platform docs: https://open.weixin.qq.com/
- `planning/security-privacy.md`

---

## 🚧 Known Limitations
- WeChat Mini Program integration out of scope (future phase)
- Share metadata static for now; dynamic OG images will come later
- OAuth approval/ICP filing timelines controlled by Tencent

---

## 📊 Success Metrics
- 50%+ of new signups via WeChat in China region
- Link/unlink success rate ≥ 98%
- Share button engagement recorded for > 20% of ranking visitors
