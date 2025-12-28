# CardTrail Technical Decisions & Trade-offs

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Author:** Technical Architecture Team

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Frontend Framework](#frontend-framework)
3. [Backend Architecture](#backend-architecture)
4. [Database](#database)
5. [State Management](#state-management)
6. [Styling & UI](#styling--ui)
7. [Authentication](#authentication)
8. [External APIs](#external-apis)
9. [Hosting & Deployment](#hosting--deployment)
10. [Monitoring & Analytics](#monitoring--analytics)

---

## Overview

### Purpose

This document records key technical decisions made during the CardTrail architecture planning phase. Each decision includes:

- **Context**: Why this decision was needed
- **Options Considered**: Alternative approaches evaluated
- **Decision**: What was chosen
- **Rationale**: Why this option was selected
- **Trade-offs**: Pros and cons
- **Alternatives**: What we didn't choose and why

### Decision Framework

Decisions were evaluated against these criteria:

1. **Developer Experience**: How easy is it to build and maintain?
2. **Performance**: Does it meet our speed targets?
3. **Scalability**: Can it handle 100K+ users?
4. **Cost**: Is it financially sustainable?
5. **Team Expertise**: Can our team learn it quickly?
6. **Community Support**: Is there good documentation and ecosystem?

---

## Frontend Framework

### Decision: Next.js 14 (App Router)

**Context:**  
We need a modern React framework that supports:
- Server-side rendering (SSR) for SEO
- API routes (eliminate separate backend)
- Image optimization
- Automatic code splitting
- Mobile-first performance

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Next.js 14** | SSR built-in, API routes, great DX, Vercel integration | Vendor lock-in (Vercel), learning curve for App Router |
| **Create React App** | Simple, well-known | No SSR, no API routes, deprecated |
| **Remix** | Modern patterns, nested routes | Smaller ecosystem, less mature |
| **Vite + React** | Fast dev, lightweight | No SSR out of box, need separate backend |
| **Astro** | Fast, content-focused | Not ideal for SPA-heavy apps |

**Decision:** **Next.js 14 with App Router**

**Rationale:**
1. **SSR for SEO**: Card profile pages need to rank on Baidu/Google → Next.js handles SSR seamlessly
2. **API Routes**: No need for Express/Fastify backend → reduces complexity
3. **Image Optimization**: Built-in lazy loading, blur placeholders, WebP conversion
4. **Performance**: Automatic code splitting, route prefetching, edge caching
5. **Production Ready**: Used by Netflix, Twitch, TikTok, Notion

**Trade-offs:**

✅ **Pros:**
- All-in-one solution (frontend + API)
- Excellent developer experience
- Great documentation and community
- Vercel deployment is seamless
- Built-in performance optimizations

❌ **Cons:**
- Vendor lock-in to Vercel (mitigated: can deploy to other hosts)
- App Router is new (less Stack Overflow answers)
- Server components mental model takes time to learn

**Alternatives We Didn't Choose:**

**Why not Create React App?**
- No SSR → Poor SEO for card profile pages
- No API routes → Need separate backend
- Deprecated by React team

**Why not Remix?**
- Smaller ecosystem, fewer plugins
- Less mature than Next.js
- Fewer job market skills

---

## Backend Architecture

### Decision: Next.js API Routes (Serverless)

**Context:**  
We need a backend to:
- Handle API requests from frontend
- Integrate with eBay API
- Calculate CT Price
- Serve data from Supabase

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Next.js API Routes** | No separate backend, same repo, serverless | Cold starts, 10s timeout (Vercel) |
| **Express.js** | Mature, flexible, full control | Separate deploy, more DevOps work |
| **Fastify** | Fast, modern, TypeScript-friendly | Separate deploy, learning curve |
| **tRPC** | Type-safe, great DX | Overkill for REST API, learning curve |
| **Supabase Edge Functions** | Integrated with Supabase | Vendor lock-in, limited features |

**Decision:** **Next.js API Routes**

**Rationale:**
1. **Simplicity**: Same codebase as frontend → easier to maintain
2. **Type Safety**: Share TypeScript types between frontend and API
3. **Serverless**: Auto-scales, no server management
4. **Developer Experience**: Hot reload, fast iteration
5. **Cost-Effective**: Only pay for execution time

**Trade-offs:**

✅ **Pros:**
- Zero DevOps (Vercel handles deployment)
- Auto-scaling (serverless)
- Cost-effective (pay per request)
- Fast development (same repo)

❌ **Cons:**
- Cold starts (~1s on first request)
- 10s timeout limit (Vercel Free/Pro)
- Limited control over server config
- Not ideal for long-running jobs (use cron jobs instead)

**Mitigations:**
- Use edge functions for hot paths
- Implement background jobs for price calculations (cron)
- Cache aggressively to reduce API calls

**Alternatives We Didn't Choose:**

**Why not Express.js?**
- Need to manage server (EC2, Docker, etc.)
- Separate deployment pipeline
- More DevOps complexity
- Higher cost (always-on server)

---

## Database

### Decision: Supabase (PostgreSQL)

**Context:**  
We need a database that supports:
- Relational data (cards, collections, users)
- Complex queries (joins, aggregations)
- Real-time updates (optional)
- Row-level security
- Easy integration with Next.js

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Supabase** | PostgreSQL, auth built-in, RLS, real-time | Vendor lock-in |
| **PlanetScale** | MySQL, auto-scaling, branching | No foreign keys, less mature |
| **MongoDB Atlas** | Flexible schema, popular | NoSQL (harder for relational data) |
| **Firebase** | Real-time, auth, easy | NoSQL, expensive at scale |
| **Raw PostgreSQL (RDS)** | Full control, no lock-in | Need to manage auth, backups, scaling |

**Decision:** **Supabase (PostgreSQL)**

**Rationale:**
1. **PostgreSQL**: Mature RDBMS with ACID guarantees, complex queries, foreign keys
2. **Built-in Auth**: Supabase Auth eliminates need for Auth0, Clerk, etc.
3. **Row-Level Security**: Fine-grained access control (users only see their collections)
4. **Real-time**: WebSocket subscriptions for live updates (future feature)
5. **Open Source**: Can self-host if needed (exit strategy)
6. **Free Tier**: 500MB database, 2GB bandwidth (good for MVP)

**Trade-offs:**

✅ **Pros:**
- All-in-one solution (database + auth + storage)
- Excellent TypeScript support (auto-generated types)
- Great documentation
- Real-time subscriptions
- Row-level security built-in
- Free tier for MVP

❌ **Cons:**
- Vendor lock-in (mitigated: open-source, can self-host)
- Less mature than AWS RDS
- Connection pooling limits (need PgBouncer at scale)

**Alternatives We Didn't Choose:**

**Why not MongoDB?**
- NoSQL is harder for relational data (users → collections → cards)
- No foreign keys, no joins
- Less mature for financial data (portfolio calculations)

**Why not Firebase?**
- NoSQL (same issues as MongoDB)
- More expensive at scale
- Harder to migrate away from (vendor lock-in)

---

## State Management

### Decision: React Query + Zustand

**Context:**  
We need state management for:
- **Server state**: Card data, collections, prices (from API)
- **Client state**: UI state (modals, theme, language)
- **Auth state**: User session

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **React Query + Zustand** | Specialized tools, best DX | Two libraries |
| **Redux Toolkit** | All-in-one, mature | Boilerplate, overkill for our app |
| **Zustand only** | Simple, one library | Not ideal for server state |
| **Context API** | Built-in React | Performance issues, re-renders |
| **Jotai / Recoil** | Atomic state, modern | Smaller ecosystem |

**Decision:** **React Query (server) + Zustand (client)**

**Rationale:**
1. **Separation of Concerns**: React Query for server state, Zustand for UI state
2. **React Query Benefits**:
   - Automatic caching, refetching, background updates
   - Optimistic updates
   - Request deduplication
   - DevTools for debugging
3. **Zustand Benefits**:
   - Minimal boilerplate (3KB)
   - No Context Provider needed
   - Easy to learn
   - Great TypeScript support

**Trade-offs:**

✅ **Pros:**
- Best-in-class for each use case
- Excellent developer experience
- Small bundle size (React Query 13KB + Zustand 3KB)
- Great TypeScript support

❌ **Cons:**
- Two libraries to learn (vs. one all-in-one)
- Need to decide where state lives (React Query vs Zustand)

**Alternatives We Didn't Choose:**

**Why not Redux Toolkit?**
- Overkill for our app size
- More boilerplate (actions, reducers, thunks)
- Larger bundle size (47KB + React Redux)
- React Query handles server state better

**Why not Context API?**
- Performance issues (every update re-renders consumers)
- No built-in caching, refetching for server state
- More verbose than Zustand

---

## Styling & UI

### Decision: Tailwind CSS

**Context:**  
We need a styling solution that supports:
- Rapid prototyping
- Mobile-first design
- Dark mode (future)
- Small bundle size
- Good TypeScript support

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Tailwind CSS** | Fast, utility-first, mobile-first | HTML can get verbose |
| **Styled Components** | CSS-in-JS, scoped styles | Runtime cost, larger bundle |
| **CSS Modules** | Scoped, no runtime cost | More files, less reusable |
| **Chakra UI** | Pre-built components, accessible | Opinionated, harder to customize |
| **Material-UI** | Comprehensive, mature | Heavy (350KB), Google design language |

**Decision:** **Tailwind CSS**

**Rationale:**
1. **Speed**: Write styles in HTML, no context switching
2. **Mobile-First**: Built-in responsive utilities (`sm:`, `md:`, `lg:`)
3. **Bundle Size**: PurgeCSS removes unused styles → small production bundle
4. **Customization**: Easy to match brand colors, spacing
5. **No Runtime Cost**: Pure CSS, no JavaScript overhead
6. **Great Documentation**: Excellent docs, large community

**Trade-offs:**

✅ **Pros:**
- Fast development (no CSS files)
- Mobile-first utilities
- Dark mode support built-in
- Small bundle size (purged)
- Great autocomplete (VS Code)

❌ **Cons:**
- HTML classes can get long (`className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md"`)
- Need to learn utility class names
- Can be harder to reuse complex styles (mitigated: use components)

**Alternatives We Didn't Choose:**

**Why not Styled Components?**
- Runtime cost (CSS-in-JS has performance overhead)
- Larger bundle size
- Slower development (need to switch to CSS mode)

**Why not Chakra UI?**
- Too opinionated (hard to deviate from default design)
- Harder to customize
- Larger bundle size

---

## Authentication

### Decision: Supabase Auth

**Context:**  
We need authentication for:
- User sign up / login
- Protected routes (collection, profile)
- Row-level security (users only see their data)

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Supabase Auth** | Integrated with database, RLS | Vendor lock-in |
| **NextAuth.js** | Popular, flexible providers | Need separate database session storage |
| **Clerk** | Beautiful UI, good DX | Expensive ($25/mo after 10K users) |
| **Auth0** | Enterprise-grade, mature | Expensive, complex setup |
| **Firebase Auth** | Simple, well-documented | Vendor lock-in |

**Decision:** **Supabase Auth**

**Rationale:**
1. **Integration**: Built into Supabase (same as database)
2. **Row-Level Security**: Seamless with Supabase RLS policies
3. **JWT Tokens**: httpOnly cookies for security
4. **OAuth Providers**: Google, GitHub, Discord (future)
5. **Cost**: Free tier covers MVP, Pro plan $25/mo (includes database)

**Trade-offs:**

✅ **Pros:**
- Integrated with database
- Row-level security built-in
- No extra service to manage
- Free tier for MVP

❌ **Cons:**
- Vendor lock-in (mitigated: can migrate to another JWT provider)
- Less flexible than NextAuth.js

**Alternatives We Didn't Choose:**

**Why not Clerk?**
- Expensive at scale ($25/mo after 10K users)
- Separate service (more complexity)
- Not integrated with database

**Why not NextAuth.js?**
- Need to manage session storage separately
- More setup work
- Not integrated with Supabase RLS

---

## External APIs

### Decision: eBay Finding API

**Context:**  
We need card pricing data from:
- Completed listings (sold prices)
- Active listings (current market)

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **eBay Finding API** | Official, reliable, 5M calls/day | Complex authentication, REST only |
| **eBay Browse API** | Modern, RESTful | Requires OAuth (harder) |
| **TCGPlayer API** | Pokemon-specific | No public API (requires partnership) |
| **Web Scraping** | Full control, any site | Legal grey area, breaks often |
| **Manual Data Entry** | Full control | Not scalable |

**Decision:** **eBay Finding API**

**Rationale:**
1. **Official API**: Legal, supported, reliable
2. **High Rate Limit**: 5M calls/day (production)
3. **Sold Listings**: Access to completed transactions (actual prices)
4. **Free Tier**: 5K calls/day in sandbox (enough for development)
5. **REST API**: Easy to integrate with Next.js

**Trade-offs:**

✅ **Pros:**
- Official, legal, supported
- High rate limits (5M/day)
- Access to sold listings
- Free sandbox for development

❌ **Cons:**
- Rate limits (need aggressive caching)
- Complex authentication (App ID, Dev ID, Cert ID)
- XML responses (need parsing, but also supports JSON)
- Not Pokemon-specific (need to filter)

**Alternatives We Didn't Choose:**

**Why not web scraping?**
- Legal grey area (violates eBay ToS)
- Breaks when eBay changes HTML
- Risk of IP ban
- Not sustainable at scale

---

## Hosting & Deployment

### Decision: Vercel (Frontend + API) + Supabase (Database)

**Context:**  
We need hosting that supports:
- Next.js app (frontend + API routes)
- Global CDN for fast loading
- Automatic deployments
- Preview deployments for PRs
- Database hosting

**Options Considered:**

| Option | Pros | Cons |
|--------|------|------|
| **Vercel + Supabase** | Seamless Next.js, preview deploys | Vendor lock-in (both) |
| **Netlify + Supabase** | Similar to Vercel, good DX | Less optimized for Next.js |
| **AWS (EC2 + RDS)** | Full control, no lock-in | High DevOps overhead, expensive |
| **Digital Ocean** | Simple, affordable | Need to manage Docker, load balancers |
| **Cloudflare Pages** | Fast, cheap | Limited features vs Vercel |

**Decision:** **Vercel (App) + Supabase (Database)**

**Rationale:**
1. **Vercel for Next.js**: Built by same company, seamless integration
2. **Global CDN**: Automatic edge caching, low latency
3. **Preview Deployments**: Every PR gets unique URL for testing
4. **Zero Config**: Push to Git → auto-deploy
5. **Supabase**: Managed database, backups, scaling
6. **Cost**: Free for hobby, Pro $20/mo (Vercel) + $25/mo (Supabase)

**Trade-offs:**

✅ **Pros:**
- Zero DevOps work (managed services)
- Auto-scaling
- Preview deployments
- Great developer experience
- Fast global CDN

❌ **Cons:**
- Vendor lock-in (Vercel + Supabase)
- 10s timeout on Vercel (Pro plan)
- Limited control vs. self-hosted

**Mitigations:**
- Both can be self-hosted if needed (exit strategy)
- Next.js can deploy to AWS, Cloudflare, etc.
- Supabase is open-source (can run on any Postgres)

**Alternatives We Didn't Choose:**

**Why not AWS?**
- High DevOps overhead (EC2, RDS, load balancers, auto-scaling)
- More expensive (always-on servers)
- Slower development (more config)

---

## Monitoring & Analytics

### Decision: Sentry (Errors) + Umami (Analytics) + Vercel Analytics (Performance)

**Context:**  
We need to monitor:
- **Errors**: JavaScript errors, API errors, crashes
- **Analytics**: Page views, user behavior, conversions
- **Performance**: Page load time, API response time

**Options Considered:**

| Category | Options | Decision |
|----------|---------|----------|
| **Error Tracking** | Sentry, Rollbar, Bugsnag | Sentry |
| **Analytics** | Google Analytics, Umami, Plausible | Umami |
| **Performance** | Vercel Analytics, New Relic, Datadog | Vercel Analytics |

**Decisions:**

### 1. Error Tracking: Sentry

**Rationale:**
- Industry standard
- Great React/Next.js integration
- Source map support
- Performance monitoring included
- Free tier: 5K errors/month

✅ **Pros:** Excellent DevEx, great error grouping, integrates with Slack  
❌ **Cons:** Expensive at scale ($26/mo after free tier)

---

### 2. Analytics: Umami

**Rationale:**
- Privacy-friendly (GDPR compliant)
- Lightweight (no cookies, no tracking)
- Self-hosted option (free)
- Simple, clean UI
- No data sharing with third parties

✅ **Pros:** Privacy-focused, lightweight, free self-hosted  
❌ **Cons:** Less features than Google Analytics (no funnel analysis, etc.)

**Why not Google Analytics?**
- Privacy concerns (GDPR, cookie banners)
- Bloated (slows page load)
- Complex setup

---

### 3. Performance: Vercel Analytics

**Rationale:**
- Built into Vercel
- Real User Monitoring (RUM)
- Web Vitals tracking (LCP, FID, CLS)
- No code changes needed

✅ **Pros:** Zero config, accurate (real users), free on Pro plan  
❌ **Cons:** Vendor lock-in, only works on Vercel

---

## Summary Table

| Decision Area | Choice | Runner-up | Key Reason |
|--------------|--------|-----------|------------|
| **Framework** | Next.js 14 | Remix | SSR + API routes + Vercel integration |
| **Backend** | Next.js API Routes | Express.js | Same repo, serverless, zero DevOps |
| **Database** | Supabase (PostgreSQL) | PlanetScale | Auth + RLS built-in |
| **State (Server)** | React Query | Redux Toolkit | Best for server state, caching |
| **State (Client)** | Zustand | Context API | Minimal boilerplate, great DX |
| **Styling** | Tailwind CSS | Styled Components | Fast dev, mobile-first, small bundle |
| **Charts** | Recharts | TradingView | React-native, simpler API |
| **Forms** | React Hook Form | Formik | Better performance, less re-renders |
| **Validation** | Zod | Yup | TypeScript-first |
| **Auth** | Supabase Auth | Clerk | Integrated with database, cheaper |
| **External API** | eBay Finding API | Web scraping | Official, legal, reliable |
| **Hosting (App)** | Vercel | Netlify | Best Next.js support |
| **Hosting (DB)** | Supabase | PlanetScale | All-in-one (DB + Auth + Storage) |
| **Errors** | Sentry | Rollbar | Industry standard |
| **Analytics** | Umami | Google Analytics | Privacy-friendly |
| **Performance** | Vercel Analytics | New Relic | Built-in, zero config |

---

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-12-04 | Initial technical decisions | Architecture Team |

---

## Future Re-evaluations

These decisions should be revisited when:

1. **Next.js 15 releases**: Evaluate new features, breaking changes
2. **Traffic reaches 100K users**: Re-evaluate database, caching, hosting costs
3. **Team grows beyond 2 developers**: Consider more structured state management (Redux?)
4. **Entering China market**: Evaluate China-specific hosting (Alibaba Cloud, Tencent Cloud)
5. **Revenue reaches $10K/month**: Evaluate moving to self-hosted (AWS, GCP) for cost savings

---

**Document Status:** ✅ Ready for Implementation  
**Last Review:** December 4, 2025  
**Next Review:** After Phase 2 MVP launch

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Technical Architecture
