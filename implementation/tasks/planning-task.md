# Planning Task: CardTrail (卡迹) Architecture & Implementation Plan

**Goal:** Create comprehensive architecture planning documents for CardTrail - a Pokemon TCG price tracking and collection management app

**Time Estimate:** 4-6 hours

---

## 📖 Context

**Product Overview:**
CardTrail (卡迹) is a Chinese market-focused Pokemon TCG price tracking app, similar to CardLadder but optimized for the downmarket segment. The app provides real-time pricing, collection management, and market analytics for Pokemon cards.

**Core Value Proposition:**
- Provide "CT Price" (guidance price) based on real eBay transaction data
- Help users track their collection value and P/L (profit/loss)
- Monitor price trends with K-line charts
- Support Chinese, Japanese, and English cards

**Data Sources:**
1. **Card Data**: Supabase PTCG-Database (card_jp table with 28,154+ Japanese cards)
2. **Price Data**: eBay API for transaction history and current listings
3. **Grading Data**: PSA Population Report for card rarity

**Existing Database Schema (Supabase card_jp table):**
```
- id: bigint (primary key)
- card_name: text (e.g., "Pikachu")
- set_name: text (e.g., "11th Movie Commemoration Set")
- set_slug: text (URL-friendly)
- card_index: text (e.g., "#003/009")
- rarity: text
- image_urls: text (TCGPlayer CDN URLs with multiple resolutions)
- product_slug: text
- product_id: text
```

**Available Credentials:**
- Supabase: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
- eBay Sandbox API: App ID, Dev ID, Cert ID

---

## ✅ Requirements

### 1. Create Architecture Planning Documents

Create the following documents in `planning/` directory:

#### **A. architecture-overview.md**
- System architecture diagram (text-based)
- Tech stack decisions with rationale
- High-level component structure
- Data flow diagrams
- Integration points (Supabase, eBay API)
- Deployment architecture

**Tech Stack Recommendations:**
- Frontend: Next.js 14 + React + TypeScript + Tailwind CSS
- Backend: Next.js API Routes
- Database: Supabase (PostgreSQL)
- State Management: Zustand or React Query
- Charts: Recharts or TradingView Lightweight Charts
- Mobile: Progressive Web App (PWA) or React Native
- Authentication: Supabase Auth

#### **B. data-models.md**
- Complete database schema design
- Entity Relationship Diagrams (text format)
- Data models for:
  - Cards (extend existing card_jp)
  - Users
  - Collections (user holdings)
  - Watchlists
  - Price History
  - Transaction Records (eBay data cache)
  - Market Index (CTI - CardTrail Index)
- Migration plan from existing Supabase schema
- Indexing strategy for performance

#### **C. api-design.md**
- RESTful API endpoint specifications
- Request/response formats
- Authentication flow
- Rate limiting strategy
- API endpoints for:
  - Card search and details
  - Price data (CT Price calculation)
  - Collection CRUD
  - Market data and indices
  - eBay integration
  - User management

#### **D. feature-breakdown.md**
- Break down all 5 main modules into phases
- Phase 0: Project scaffold
- Phase 1: Core infrastructure (Auth, DB, eBay integration)
- Phase 2: Search & Card Details (搜卡 module)
- Phase 3: Collection Management (持仓 module)
- Phase 4: Market Dashboard (大盘 module)
- Phase 5: Rankings (榜单 module)
- Phase 6: User Profile (我的 module)
- Each phase should list specific tasks (2-8 hour scope each)

#### **E. price-algorithm.md**
- CT Price calculation algorithm specification
- Weighted average methodology
- Outlier detection and removal
- Recency weighting
- Handling sparse data (rare cards)
- Grading adjustments (PSA 1-10, BGS, CGC, Raw)
- Currency conversion logic

#### **F. ui-component-hierarchy.md**
- Bottom navigation structure (5 tabs)
- Page hierarchy for each module
- Component tree for key screens
- Navigation flow
- Responsive design considerations (mobile-first)

---

## 📝 Implementation Requirements

### Module Specifications

#### **Module 1: 大盘 (Market Dashboard)**
- L1: Market overview with CTI index, daily volume, transaction count
- K-line chart with time period toggle (24H/7D/30D/1Y/ALL)
- News carousel banner
- Quick action buttons
- L2: Detailed index breakdown (WOTC, Modern, Alt Art, PSA 10 indices)

#### **Module 2: 持仓 (Collection)**
- L1: Portfolio overview (total value, cost basis, P/L)
- Distribution charts (by set, by grading company)
- Holdings list with sorting
- L2: Add/Edit holdings form (link card, input cost, date, grading, notes)
- L3: Individual card holding detail with performance chart

#### **Module 3: 搜卡 (Search)**
- L1: Search landing with autocomplete, filters, hot searches
- L2: Search results grid
- L3: **Card Profile Page** (MOST CRITICAL)
  - High-res card image
  - CT Price with grading tabs (Raw/PSA 9/PSA 10)
  - Price trend chart
  - Sales history table (date, platform, price, link)
  - Actions: Add to Collection, Add to Watchlist

#### **Module 4: 榜单 (Rankings)**
- L1: Multiple ranking lists
  - Top Risers (24H/7D)
  - Top Fallers
  - Highest Volume
  - Highest Sales
- L2: Card comparison tool (overlay 2 cards' price charts)
- PSA Pop Report viewer

#### **Module 5: 我的 (Profile)**
- User profile
- Watchlist
- Settings (currency: CNY/USD/JPY, language: 简中/繁中/EN)
- Feedback & support

---

## 🏗️ Architecture Constraints

### Must Follow

**Planning Document Quality:**
- Each document must be comprehensive (3+ pages)
- Include code examples where relevant (TypeScript interfaces)
- Reference data sources explicitly
- Consider scalability (100K+ users)
- Chinese market specifics (language, currency, payment)

**Technical Requirements:**
- TypeScript strict mode throughout
- Mobile-first responsive design
- Performance: <2s page load, <100ms search
- SEO optimized for Chinese search engines
- Offline-first PWA capabilities
- Support for high-resolution card images

**Data Requirements:**
- Real-time price updates (or near real-time with caching)
- Data integrity (no duplicate cards in collection)
- Privacy (user holdings are private)
- GDPR/PIPL compliance

**Integration Requirements:**
- Supabase for all database operations
- eBay API rate limit handling (5000 calls/day sandbox)
- Image CDN for card images (use Supabase storage or existing TCGPlayer URLs)
- Future integration paths for other marketplaces (Mercari, PWCC)

---

## 🚫 Anti-Patterns to Avoid

### ❌ DON'T:
- Over-engineer initial MVP (keep Phase 0-2 simple)
- Create monolithic components (break down by feature)
- Hardcode API keys (use environment variables)
- Ignore mobile UX (80% of users will be on mobile)
- Use English-only UI labels (must support Chinese)

### ✅ DO:
- Progressive enhancement (works without JavaScript)
- Atomic design for components
- Server-side rendering for SEO
- Optimistic UI updates
- Comprehensive error handling
- Chinese + English bilingual throughout

---

## 📂 Deliverables

**Expected Output:**

```
planning/
├── architecture-overview.md
├── data-models.md
├── api-design.md
├── feature-breakdown.md
├── price-algorithm.md
├── ui-component-hierarchy.md
└── technical-decisions.md (bonus)
```

Each document should be:
- **Comprehensive**: 500-1500 lines
- **Actionable**: Developers can implement directly from these docs
- **Referenced**: Task files will reference these as "Golden Source"

---

## 🧪 Validation Criteria

**How to validate these planning docs:**

- [ ] Architecture supports all 5 modules
- [ ] Database schema handles all use cases
- [ ] API design covers all user workflows
- [ ] Feature breakdown has clear phases
- [ ] CT Price algorithm is implementable
- [ ] UI hierarchy matches product requirements
- [ ] Integration with Supabase is clear
- [ ] eBay API integration is specified
- [ ] Mobile-first design is evident
- [ ] Chinese localization is considered

---

## ✅ Acceptance Criteria

**Definition of Done:**

- [ ] All 6+ planning documents created
- [ ] Documents are internally consistent
- [ ] Reference existing Supabase schema
- [ ] Include TypeScript type definitions
- [ ] Consider Chinese market specifics
- [ ] Phases are clearly defined
- [ ] Tasks are scoped (2-8 hours each)
- [ ] Technical decisions are justified
- [ ] Integration points are documented
- [ ] Ready for task breakdown phase

---

## 📊 Reference Materials

**Product Requirements:**
See the detailed PRD provided by user covering:
- 5-module bottom navigation structure
- CT Price calculation methodology
- Pokemon card specific attributes (language, variant, condition)
- Data source specifications
- User workflows

**Database Sample:**
card_jp table contains 28,154 Japanese cards with:
- Card names (Japanese)
- Set information
- TCGPlayer image URLs (multiple resolutions)
- Product IDs for linking

**Similar Products:**
- CardLadder (US market leader)
- TCGPlayer (card database)
- Buff.163.com (game item trading platform - UX reference)

---

## 🎓 Key Considerations

**Chinese Market Specifics:**
- WeChat/Alipay integration for future payments
- Simplified Chinese as primary language
- CNY as default currency with USD/JPY conversion
- Baidu SEO optimization
- ICP filing for mainland hosting
- Bilibili/Xiaohongshu for marketing

**Pokemon TCG Specifics:**
- Language variants (JP/EN/CN) have different prices
- Grading companies (PSA, BGS, CGC) affect value dramatically
- Variants (Holo, Reverse Holo, 1st Edition) need separate pricing
- Set release dates matter for historical pricing
- Condition grading scale (PSA 1-10, or NM/LP/HP for raw)

**MVP Scope:**
- Phase 0-2 should be launchable MVP
- Focus on Japanese card data first (28K cards available)
- Start with read-only features (search, view)
- Add collection management in Phase 3
- Market indices can be Phase 4+

---

## 📝 Notes

**This is the foundation for the entire project.**
- Take time to think through architecture decisions
- Consider scalability from day 1
- Plan for mobile-first usage patterns
- Keep Chinese user experience in mind
- Reference the Supabase schema provided
- Design API for future marketplace integrations

**Output will feed into:**
- Task breakdown for each phase
- Component development
- API implementation
- Database migrations

---

**FINAL INSTRUCTIONS:**

Create comprehensive, production-ready planning documents that developers can use to implement CardTrail. Think through:
- How will CT Price be calculated efficiently?
- How will we cache eBay data?
- How will search be fast with 28K+ cards?
- How will charts render on mobile?
- How will we handle user authentication?
- How will we store user collections?

Be specific. Be thorough. Be implementable.

---

**Built with:** Agent Cube
**For:** CardTrail (卡迹) PTCG Price Tracker

