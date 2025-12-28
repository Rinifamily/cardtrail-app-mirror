# Task 01: Performance Optimization

**Goal:** Optimize app performance to meet targets (LCP < 2.5s, FCP < 1.8s)

**Time Estimate:** 10 hours

**Phase:** Phase 8

**Dependencies:** Phase 7 complete

---

## 📖 Context

**What this task delivers:**
- Image optimization with Next.js Image
- Code splitting for heavy components
- React Query caching optimized
- Vercel Edge Cache configured
- Database indexes optimized
- Bundle size optimized (< 200KB)
- Lighthouse score ≥90
- Basic testing included
- Ready for production

**Why this matters:**
Performance directly impacts user experience and SEO. Fast apps retain users and rank higher in search results. Mobile users especially benefit from optimization.

**Planning docs:**
- `planning/performance-monitoring.md` - Performance targets (CRITICAL - read sections: Performance Targets, Optimization Strategies)
- `planning/architecture-overview.md` - Performance strategy
- `planning/agents.md` - Development guidelines (MANDATORY)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] Images optimized with Next.js Image
- [ ] Heavy components lazy loaded
- [ ] React Query caching configured
- [ ] API responses cached at edge
- [ ] Database queries optimized
- [ ] Bundle size < 200KB

**Technical Requirements:**
- [ ] Lighthouse score ≥90 mobile
- [ ] FCP < 1.8s
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] TTI < 3.8s

**Acceptance Criteria:**
- [ ] Lighthouse score ≥90
- [ ] All Web Vitals meet targets
- [ ] Bundle size < 200KB
- [ ] API responses < 200ms
- [ ] Deployed

---

## 📝 Implementation Approach

**Optimize images:**
```typescript
import Image from 'next/image';

<Image
  src={card.image_urls.large}
  alt={card.name}
  width={500}
  height={700}
  loading="lazy"
  placeholder="blur"
  blurDataURL={card.image_urls.small}
/>
```

**Code splitting:**
```typescript
import dynamic from 'next/dynamic';

const PriceChart = dynamic(() => import('@/components/PriceChart'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

**Database indexes:**
```sql
CREATE INDEX idx_card_jp_name_trgm ON card_jp USING GIN (card_name gin_trgm_ops);
CREATE INDEX idx_collections_user_card ON collections(user_id, card_id);
```

---

## ✅ Done When

- [ ] Lighthouse ≥90
- [ ] Web Vitals met
- [ ] Bundle optimized
- [ ] Deployed

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
