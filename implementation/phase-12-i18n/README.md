# Phase 12: Internationalization & Launch Polish

## 🎯 Overview
The final phase localizes CardTrail (简体中文 🇨🇳 + English 🇺🇸) and applies launch polish: locale-aware routing, translation coverage, currency/date formatting, SEO hreflang tags, legal pages, and last-mile QA.

## ✅ Goals
- Integrate next-intl with locale routes (`/zh-CN`, `/en`) and namespace-based translations
- Translate all UI copy + error messages, ensuring bilingual parity
- Implement locale-aware formatting (currency, date, number, relative time)
- Add language switcher, hreflang tags, sitemaps, and final design polish

## 🔗 Prerequisites
- Phase 11 performance optimizations complete
- Translation source spreadsheets ready (from `planning/internationalization.md`)
- Legal copy (Privacy, Terms) approved in both languages

## 📦 Deliverables
- [ ] next-intl configuration + middleware for locale routing
- [ ] Translation JSON files (common, search, card, market, rankings, collection, watchlist, auth, settings)
- [ ] Locale switcher (header + settings) with persistence
- [ ] Currency/date formatting helpers + tests
- [ ] SEO enhancements (hreflang, localized sitemap)
- [ ] Launch checklist + final QA signoff

## 🧪 Testing Strategy
- Automated tests verifying translation keys exist (lint script), locale routing works, and helpers format values correctly
- Playwright suite running flows in both locales
- Manual QA on low-end Android + desktop for typographic/spacing regressions

## ⚠️ Known Limitations
- Japanese localization limited to card metadata; full UI for ja/zh-TW tracked separately
- Translations managed manually until CMS integration arrives

## 📚 References
- `planning/internationalization.md`
- `planning/deployment-operations.md`
- `planning/design.md`
- `planning/feature-breakdown.md`
