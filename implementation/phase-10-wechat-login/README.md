# Phase 10: WeChat Login & Social Linking

## 🎯 Overview
Phase 10 adds WeChat Open Platform login plus account linking between existing phone/email accounts and WeChat identities. It also lays groundwork for social sharing flows referenced in design docs.

## ✅ Goals
- Configure WeChat Open Platform + OAuth redirects in Next.js
- Implement account linking (merge Better Auth + WeChat identities)
- Update onboarding + profile settings to show linked status
- Provide shareable card/ranking URLs leveraging WeChat JS SDK (preview only)

## 🔗 Prerequisites
- Phase 08 auth + Phase 09 cloud data complete
- WeChat Open Platform credentials + ICP compliance steps
- Review `planning/authentication-research.md` (WeChat section) and `planning/design.md` social requirements

## 📦 Deliverables
- [ ] WeChat OAuth handler + callback route
- [ ] Linking UI & backend enforcement preventing duplicate accounts
- [ ] WeChat JS SDK integration for share flows (card detail + rankings)
- [ ] Documentation covering compliance + fallback login for non-WeChat users

## 🧪 Testing Strategy
- Integration tests using WeChat sandbox credentials (mocked)
- Manual QA on iOS/Android WeChat browsers verifying redirect + share dialogues

## ⚠️ Known Limitations
- Production WeChat approval may take weeks; keep feature toggled until approval
- Share flows limited to static preview images until backend generates OG images

## 📚 References
- `planning/authentication-research.md#wechat`
- `planning/feature-breakdown.md`
- WeChat Open Platform docs
