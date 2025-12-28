# Task 01: Complete i18n Implementation

**Goal:** Multi-language support with next-intl (Chinese and English)

**Time Estimate:** 10 hours

**Phase:** Phase 9

**Dependencies:** Phase 8 complete

---

## 📖 Context

**What this task delivers:**
- next-intl integration
- Complete translations (Chinese and English)
- Locale-based routing (/zh-CN, /en)
- Language switcher component
- Locale-specific formatting (currency, dates, numbers)
- Card name translations
- hreflang tags for SEO
- Sitemap with all locales
- Basic testing included
- Ready for multi-language users

**Why this matters:**
i18n makes CardTrail accessible to both Chinese and international users. Proper translations and formatting show attention to detail and respect for users.

**Planning docs:**
- `planning/internationalization.md` - Complete i18n strategy (CRITICAL - read entire document)
- `planning/frontend-architecture.md` - i18n integration
- `planning/agents.md` - Development guidelines (MANDATORY)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] All UI text translated to Chinese and English
- [ ] Language switcher changes locale
- [ ] Currency formatted correctly (¥ vs $)
- [ ] Dates formatted correctly (2024年12月4日 vs December 4, 2024)
- [ ] Numbers formatted correctly
- [ ] Card names display in correct language

**Technical Requirements:**
- [ ] next-intl installed
- [ ] Locale-based routing configured
- [ ] Translation files organized by namespace
- [ ] Locale-specific formatters

**Acceptance Criteria:**
- [ ] All text translated
- [ ] Language switcher works
- [ ] Formatting correct
- [ ] SEO optimized
- [ ] E2E tests pass in both languages
- [ ] Deployed

---

## 📝 Implementation Approach

**Install next-intl:**
```bash
pnpm add next-intl
```

**i18n/config.ts:**
```typescript
export const locales = ['zh-CN', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'zh-CN';
```

**middleware.ts:**
```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});
```

**Translation files:**
```json
// i18n/messages/zh-CN/common.json
{
  "appName": "卡迹",
  "actions": {
    "save": "保存",
    "cancel": "取消",
    "search": "搜索"
  }
}

// i18n/messages/en/common.json
{
  "appName": "CardTrail",
  "actions": {
    "save": "Save",
    "cancel": "Cancel",
    "search": "Search"
  }
}
```

**Usage:**
```typescript
'use client';

import { useTranslations } from 'next-intl';

export function SearchBar() {
  const t = useTranslations('common');
  
  return (
    <button>{t('actions.search')}</button>
  );
}
```

---

## ✅ Done When

- [ ] i18n works
- [ ] Translations complete
- [ ] Formatting correct
- [ ] SEO optimized
- [ ] E2E tests pass
- [ ] Deployed

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
