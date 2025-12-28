# Update Task: Refine CardTrail Architecture with Best Practices

**Goal:** Update all planning documents to incorporate modern best practices, proper tech stack, and development workflow patterns

**Time Estimate:** 4-6 hours

---

## 📖 Context

**Current State:**
- Initial planning documents exist in `planning/` directory
- Basic architecture defined but needs refinement
- Need to incorporate proven patterns from production applications

**What Needs to Change:**
We need to update the architecture to follow proven patterns while adapting them to CardTrail's specific needs (PTCG price tracking app).

**Reference Architecture (adapt, don't copy):**
We're learning from a successful production application that uses:
- Monorepo structure (pnpm + Turborepo)
- Type-safe API client generation
- Clear separation of concerns
- AI-friendly development workflow

---

## ✅ Requirements

### 1. Update Architecture Documents

Update these planning documents with new technical decisions:

#### **A. planning/monorepo-architecture.md** (NEW)

**Create a Monorepo structure plan:**

```
cardtrail-app/
├── apps/
│   ├── web/              # Next.js frontend
│   └── api/              # Backend API (choose: Next.js API Routes OR standalone)
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   ├── db/               # Supabase client wrapper
│   └── ui/               # Shared UI components (shadcn)
└── supabase/             # Supabase migrations & functions
```

**Key Decisions to Document:**
- Why Monorepo? (code sharing, type safety, atomic changes)
- Package manager: pnpm (workspace support, fast, efficient)
- Build orchestration: Turborepo (caching, parallel builds)
- Deployment strategy per app

#### **B. planning/frontend-architecture.md** (UPDATE)

**Tech Stack:**
- **Framework:** Next.js 14+ App Router
- **UI Foundation:** shadcn/ui (copy-paste component approach)
- **UI Library:** DaisyUI OR 21st.dev (user will decide)
  - Document pros/cons of each for this project
  - DaisyUI: Tailwind-based, theme system, Chinese-friendly
  - 21st.dev: Modern, React components, TypeScript-first
- **Forms:** react-hook-form + Zod validation
- **State:** Zustand (lightweight) OR TanStack Query (server state)
- **Charts:** Recharts (for K-line charts and price trends)
- **Data Fetching:** Direct Supabase client (no API layer needed initially)

**Architecture Principles:**
```typescript
// Server Components by default
// app/cards/[id]/page.tsx
export default async function CardPage({ params }) {
  const { data: card } = await supabase
    .from('card_jp')
    .select('*')
    .eq('id', params.id)
    .single();
  
  return <CardDetail card={card} />;
}

// Client Components only when needed
// components/collection-form.tsx
'use client';
export function CollectionForm() {
  const form = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema)
  });
  // ...
}
```

**Component Organization:**
```
apps/web/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Route group: 大盘
│   ├── (search)/          # Route group: 搜卡
│   ├── (collection)/      # Route group: 持仓
│   ├── (rankings)/        # Route group: 榜单
│   └── (profile)/         # Route group: 我的
├── components/
│   ├── ui/                # shadcn components
│   ├── cards/             # Card-related components
│   ├── charts/            # Chart components
│   └── layouts/           # Layout components
├── lib/
│   ├── supabase/          # Supabase client setup
│   ├── utils/             # Utilities
│   └── validations/       # Zod schemas
└── hooks/                 # Custom React hooks
```

#### **C. planning/backend-architecture.md** (UPDATE)

**Simplified Backend Approach:**

For MVP (Phase 0-2), use Next.js API Routes + Supabase directly:
```
✅ Simple: No separate backend service
✅ Type-safe: Share types with frontend
✅ Fast: Deploy together with frontend
```

**API Structure:**
```
apps/web/app/api/
├── cards/
│   ├── [id]/route.ts          # GET /api/cards/:id
│   └── search/route.ts        # POST /api/cards/search
├── collections/
│   ├── route.ts               # GET/POST /api/collections
│   └── [id]/route.ts          # GET/PUT/DELETE /api/collections/:id
├── market/
│   ├── index/route.ts         # GET /api/market/index (CTI)
│   └── rankings/route.ts      # GET /api/market/rankings
└── ebay/
    ├── search/route.ts        # POST /api/ebay/search (eBay API proxy)
    └── webhook/route.ts       # POST /api/ebay/webhook
```

**Future Phase 3+:** Consider standalone Fastify service if needed for:
- Complex background jobs
- eBay API rate limiting management
- Real-time price updates

#### **D. planning/database-architecture.md** (UPDATE)

**Use Existing Supabase Setup:**

**Database:** PostgreSQL via Supabase
- URL: `https://dmsvsfsbytemtbbqxqyi.supabase.co`
- Existing `card_jp` table (28K+ cards)

**Schema Extension Plan:**

```sql
-- Extend existing card_jp table (don't modify!)
-- Add new tables:

-- User collections
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  card_id BIGINT REFERENCES card_jp(id),
  grading_company TEXT CHECK (grading_company IN ('PSA', 'BGS', 'CGC', 'Raw')),
  grading_score INT CHECK (grading_score BETWEEN 1 AND 10),
  cost_basis DECIMAL(10,2),
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history cache
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id BIGINT REFERENCES card_jp(id),
  source TEXT, -- 'ebay', 'mercari', etc.
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  grading_company TEXT,
  grading_score INT,
  sale_date DATE,
  listing_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Market index (CTI)
CREATE TABLE market_indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_type TEXT, -- 'overall', 'wotc', 'modern', 'graded_psa10'
  value DECIMAL(10,2),
  volume DECIMAL(10,2),
  transaction_count INT,
  date DATE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User watchlists
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  card_id BIGINT REFERENCES card_jp(id),
  target_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);
```

**RLS Policies:**
- Users can only see/modify their own collections
- Price history is public (read-only for users)
- Market indices are public

**Database Access Pattern:**
```typescript
// packages/db/src/index.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types'; // Auto-generated

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Type-safe queries
const { data, error } = await supabase
  .from('card_jp')
  .select('*')
  .limit(10);
// data is typed as Database['public']['Tables']['card_jp']['Row'][]
```

#### **E. planning/agents.md** (NEW - CRITICAL)

**Create AI/Agent Development Guidelines:**

This file defines rules that AI agents (including this one!) must follow when generating code.

```markdown
# AI Agent Development Guidelines

## 🎯 Core Principles

### K.I.S.S (Keep It Simple, Stupid)
- Simplest solution that works wins
- No premature optimization
- No "for future flexibility" abstractions
- Favor composition over inheritance

### DRY (Don't Repeat Yourself)
- Extract reusable logic
- Use shared types across monorepo
- Single source of truth for schemas

### Type Safety First
- TypeScript strict mode enabled
- No `any` types (use `unknown` if needed)
- Zod schemas for runtime validation
- All functions have explicit return types

## 📋 Architecture Rules

All code must follow these planning documents:
- `planning/monorepo-architecture.md` - Package structure
- `planning/frontend-architecture.md` - UI patterns
- `planning/database-architecture.md` - DB conventions
- `planning/api-design.md` - API contracts

## ❌ Prohibited Actions

### Code Quality
- ❌ No `eslint-disable` comments (fix the issue instead)
- ❌ No `@ts-ignore` or `@ts-expect-error` (fix the types)
- ❌ No `any` types
- ❌ No disabling of strict mode
- ❌ No lowering TypeScript or ESLint standards

### Database
- ❌ Never modify `card_jp` table structure
- ❌ No raw SQL without `.limit()`
- ❌ No queries without proper indexes
- ❌ No RLS policy bypass

### Dependencies
- ❌ No adding dependencies without justification
- ❌ No outdated packages
- ❌ No dual dependencies (pick one state manager)

## ✅ Mandatory Patterns

### Database Operations
```typescript
// ✅ Always use RLS
const { data } = await supabase
  .from('collections')
  .select('*')
  .limit(100); // Always limit

// ❌ Never bypass RLS
supabase.auth.admin // Don't use unless explicitly required
```

### API Routes
```typescript
// ✅ Always validate input
const inputSchema = z.object({
  cardId: z.string().uuid(),
  grade: z.number().int().min(1).max(10)
});

export async function POST(request: Request) {
  const body = await request.json();
  const input = inputSchema.parse(body); // Throws if invalid
  // ...
}
```

### Components
```typescript
// ✅ Server Component by default
export default async function CardPage({ params }) {
  const card = await getCard(params.id);
  return <CardDetail card={card} />;
}

// ✅ Client Component only when needed
'use client';
export function InteractiveChart({ data }) {
  const [range, setRange] = useState('7d');
  // ...
}
```

### Forms
```typescript
// ✅ Always use Zod + react-hook-form
const formSchema = z.object({
  cardId: z.string().min(1),
  costBasis: z.number().positive()
});

type FormInput = z.infer<typeof formSchema>;

const form = useForm<FormInput>({
  resolver: zodResolver(formSchema)
});
```

## 🔧 Development Workflow

### Using Taskfile
All operations use `task` command:
```bash
task dev         # Start development
task build       # Build all packages
task test        # Run tests
task lint        # Lint and format
task db:migrate  # Run Supabase migrations
```

### Git Workflow
```bash
# Feature branch naming
feat/card-search
fix/price-calculation
docs/architecture-update

# Commit message format
feat: add card search with filters
fix: correct CT price calculation for PSA 10
docs: update database schema documentation
```

## 🎨 UI/UX Rules

### Tailwind + DaisyUI/21st.dev
```tsx
// ✅ Use semantic class names
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Pikachu</h2>
  </div>
</div>

// ✅ Use shadcn components
import { Button } from '@/components/ui/button';
<Button variant="outline">Add to Collection</Button>
```

### Responsive Design
```tsx
// ✅ Mobile-first
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {cards.map(card => <CardItem key={card.id} card={card} />)}
</div>
```

### Internationalization
```tsx
// ✅ Support Chinese + English
const t = {
  zh: '添加到收藏',
  en: 'Add to Collection'
};

<Button>{t[locale]}</Button>
```

## 📊 Performance Rules

### Database Queries
- Always paginate (`.limit()`)
- Use proper indexes
- Avoid N+1 queries

### Images
- Use Next.js `<Image />` component
- Serve from Supabase Storage or CDN
- Lazy load card images

### Bundle Size
- Code split by route
- Dynamic import heavy dependencies
- Tree-shake unused code

## 🧪 Testing Rules

### Unit Tests
```typescript
// ✅ Test pure functions
describe('calculateCTPrice', () => {
  it('should calculate weighted average', () => {
    const sales = [100, 110, 105];
    expect(calculateCTPrice(sales)).toBe(105);
  });
});
```

### Integration Tests
```typescript
// ✅ Test API routes
describe('POST /api/collections', () => {
  it('should create collection item', async () => {
    const response = await fetch('/api/collections', {
      method: 'POST',
      body: JSON.stringify({ cardId: '123', costBasis: 50 })
    });
    expect(response.status).toBe(201);
  });
});
```

## 📝 Documentation Rules

### Code Comments
```typescript
// ✅ Explain WHY, not WHAT
// Use exponential decay to favor recent sales over old ones
const weight = Math.exp(-daysSince / DECAY_CONSTANT);

// ❌ Don't state the obvious
// Set the weight variable
const weight = ...;
```

### JSDoc for Public APIs
```typescript
/**
 * Calculate CT Price (guidance price) for a card
 * @param sales - Array of recent sale prices
 * @param grading - Grading company and score
 * @returns Weighted average price in USD
 */
export function calculateCTPrice(
  sales: number[],
  grading: Grading
): number {
  // ...
}
```

## 🚨 Error Handling

### API Routes
```typescript
// ✅ Proper error responses
try {
  const data = await fetchEbayData(cardId);
  return Response.json({ data });
} catch (error) {
  console.error('eBay API error:', error);
  return Response.json(
    { error: 'Failed to fetch card data' },
    { status: 500 }
  );
}
```

### Frontend
```typescript
// ✅ User-friendly error messages
if (error) {
  return (
    <div className="alert alert-error">
      <span>无法加载卡牌数据，请稍后重试</span>
    </div>
  );
}
```

## 🔐 Security Rules

- Never expose Supabase service key on client
- Always use RLS policies
- Validate all user input
- Sanitize data before display
- Use environment variables for secrets

## 💡 When in Doubt

1. Check existing planning docs
2. Follow K.I.S.S principle
3. Ask for clarification
4. Write tests first
5. Document your reasoning
```

#### **F. planning/developer-workflow.md** (NEW)

**Create Taskfile.yml setup plan:**

Document the command structure developers and AI will use:

```yaml
# Taskfile.yml (to be created in project root)
version: '3'

tasks:
  dev:
    desc: Start development environment
    cmds:
      - pnpm run dev
  
  build:
    desc: Build all packages
    cmds:
      - pnpm run build
  
  test:
    desc: Run all tests
    cmds:
      - pnpm run test
  
  lint:
    desc: Lint and format code
    cmds:
      - pnpm run lint
      - pnpm run format
  
  db:migrate:
    desc: Run Supabase migrations
    cmds:
      - supabase db push
  
  db:types:
    desc: Generate TypeScript types from Supabase
    cmds:
      - supabase gen types typescript --local > packages/db/src/types.ts
```

---

## 🏗️ Architecture Constraints

### Must Follow

**Monorepo Principles:**
- pnpm workspaces for package management
- Turborepo for build caching
- Shared types via `packages/shared-types`
- No circular dependencies between packages

**Type Safety:**
- TypeScript strict mode across all packages
- Zod for runtime validation
- Supabase type generation for DB types
- No `any` types allowed

**Component Library:**
- shadcn/ui as base (copy-paste, no npm package)
- DaisyUI OR 21st.dev on top (document pros/cons)
- All components in `packages/ui` for reuse
- Storybook for component documentation (optional Phase 3+)

**Supabase Integration:**
- Use existing database
- Never modify `card_jp` table
- All new tables follow naming convention
- RLS enabled by default
- Type generation via Supabase CLI

**Development Workflow:**
- Taskfile for all operations
- AI agents follow `agents.md` rules
- Planning docs are source of truth
- Git branch naming conventions
- Commit message format

### Adapt (Don't Copy Blindly)

**Reference Architecture Learnings:**

✅ **Copy These Patterns:**
- Monorepo structure (proven scalable)
- Type-safe API patterns
- Zod validation everywhere
- Clear separation of concerns
- Taskfile for consistency

⚠️ **Adapt for CardTrail:**
- We use Supabase, not Aurora
- We may not need separate API service initially
- Our data model is PTCG-specific
- Chinese localization is critical
- Mobile-first is more important

❌ **Don't Copy:**
- Auth0 (we use Supabase Auth)
- Kysely (we use Supabase client)
- OpenAPI generation (maybe Phase 3+)
- Multi-tenancy patterns (B2C app, not B2B)

---

## 📂 Updated Planning Structure

After this task, `planning/` should contain:

```
planning/
├── README.md                       # Index of all planning docs
├── architecture-overview.md        # UPDATE: High-level system design
├── monorepo-architecture.md        # NEW: Package structure
├── frontend-architecture.md        # UPDATE: shadcn + DaisyUI/21st.dev
├── backend-architecture.md         # UPDATE: Simplified Next.js API
├── database-architecture.md        # UPDATE: Supabase-specific
├── api-design.md                   # UPDATE: API endpoints
├── feature-breakdown.md            # UPDATE: Phases with new tech
├── price-algorithm.md              # KEEP: Still valid
├── ui-component-hierarchy.md       # UPDATE: shadcn components
├── agents.md                       # NEW: AI development rules
└── developer-workflow.md           # NEW: Taskfile setup
```

---

## 🧪 Validation Criteria

**How to validate these updates:**

- [ ] Monorepo structure is clear and practical
- [ ] Frontend tech stack is modern (shadcn + DaisyUI/21st.dev)
- [ ] Backend approach is pragmatic (start simple)
- [ ] Database integration uses existing Supabase
- [ ] agents.md defines clear rules for AI code generation
- [ ] developer-workflow.md provides Taskfile setup
- [ ] All planning docs reference each other consistently
- [ ] Chinese market specifics are maintained
- [ ] Mobile-first approach is emphasized
- [ ] Type safety is enforced throughout

---

## ✅ Acceptance Criteria

**Definition of Done:**

- [ ] All planning documents updated
- [ ] New documents (monorepo, agents, workflow) created
- [ ] Tech stack modernized (shadcn, DaisyUI/21st.dev)
- [ ] Supabase integration clarified
- [ ] Development workflow documented (Taskfile)
- [ ] AI agent rules defined in agents.md
- [ ] Reference patterns adapted (not copied)
- [ ] Documents are internally consistent
- [ ] Ready to start Phase 0 implementation
- [ ] Changes committed and pushed

---

## 📝 Key Changes Summary

**Old → New:**

| Aspect | Before | After |
|--------|--------|-------|
| Structure | Unclear | Monorepo (pnpm + Turborepo) |
| Frontend UI | Generic mention | shadcn + DaisyUI/21st.dev |
| Backend | Separate service? | Next.js API Routes (MVP) |
| Database | Generic Postgres | Supabase-specific with existing data |
| Dev Workflow | Undefined | Taskfile with standard commands |
| AI Rules | None | agents.md with strict guidelines |
| Type Safety | Mentioned | Enforced with Zod + Supabase types |

---

## 🎓 Learning from Reference Architecture

**What We're Adopting:**

1. **Monorepo Pattern** - Proven to scale with type sharing
2. **Type Safety First** - Zod schemas + generated types
3. **Taskfile** - Consistent developer experience
4. **agents.md** - AI-friendly development rules
5. **Planning Docs** - Architecture as documentation

**What We're Adapting:**

1. **Database Layer** - Supabase instead of Kysely + Aurora
2. **Backend Strategy** - Start with Next.js API, grow if needed
3. **UI Framework** - shadcn + DaisyUI/21st.dev (more suitable)
4. **Auth** - Supabase Auth instead of Auth0
5. **API Client** - Direct Supabase client for MVP

**What We're Skipping (For Now):**

1. OpenAPI generation (maybe Phase 3+)
2. Separate Fastify service (Phase 3+ if needed)
3. Multi-tenancy (B2C app)
4. Complex observability (start simple)

---

## 💡 Implementation Notes

**For AI Agents Processing This Task:**

1. Read all existing planning documents first
2. Understand the reference patterns (don't copy blindly)
3. Focus on CardTrail's specific needs (PTCG, Chinese market, mobile)
4. Create agents.md with strict rules for future code generation
5. Update all documents for consistency
6. Ensure Supabase integration is clear
7. Validate that tech stack choices fit the use case

**Critical Files to Create:**
- `planning/agents.md` - Will guide all future development
- `planning/monorepo-architecture.md` - Foundation for code structure
- `planning/developer-workflow.md` - How everyone works

**Critical Files to Update:**
- `planning/frontend-architecture.md` - Add shadcn + DaisyUI/21st.dev
- `planning/backend-architecture.md` - Simplify to Next.js API
- `planning/database-architecture.md` - Make Supabase-specific

---

**FINAL INSTRUCTIONS:**

Update all planning documents to reflect modern best practices while keeping CardTrail's specific needs in focus. The goal is a production-ready architecture that:
- Is simple to start with (MVP)
- Scales when needed (Phases 3+)
- Is AI-friendly (clear patterns)
- Is developer-friendly (Taskfile)
- Is type-safe (Zod + TypeScript)
- Uses existing Supabase data

---

**Built with:** Agent Cube
**For:** CardTrail (卡迹) PTCG Price Tracker
**Purpose:** Refine architecture with proven patterns

