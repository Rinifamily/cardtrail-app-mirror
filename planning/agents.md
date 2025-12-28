# CardTrail AI Development Guidelines

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - **ALL AI AGENTS MUST FOLLOW**  
**Author:** Technical Architecture Team

---

## 🚨 MANDATORY READING

**This document is the source of truth for ALL AI-assisted development in the CardTrail project.**

Every AI agent (GitHub Copilot, Cursor AI, ChatGPT, Claude, etc.) working on this codebase **MUST** follow these guidelines. Violations will result in rejected pull requests and potential security issues.

### Who Should Read This

- ✅ AI coding assistants
- ✅ Human developers using AI tools
- ✅ Code reviewers
- ✅ New team members

---

## 📋 Table of Contents

1. [Core Principles](#core-principles)
2. [Prohibited Actions](#prohibited-actions)
3. [Mandatory Patterns](#mandatory-patterns)
4. [Architecture Rules](#architecture-rules)
5. [Database Operations](#database-operations)
6. [API Development](#api-development)
7. [Frontend Components](#frontend-components)
8. [Forms & Validation](#forms--validation)
9. [Development Workflow](#development-workflow)
10. [UI/UX Rules](#uiux-rules)
11. [Design System Rules](#design-system-rules) 🎨 **NEW**
12. [Performance Rules](#performance-rules)
13. [Testing Rules](#testing-rules)
14. [Security Rules](#security-rules)
15. [Error Handling](#error-handling)
16. [Documentation Rules](#documentation-rules)
17. [When in Doubt](#when-in-doubt)

---

## Core Principles

### K.I.S.S (Keep It Simple, Stupid)

**Always choose the simplest solution that works.**

```typescript
// ❌ BAD: Over-engineered
class CardRepository {
  private cache: Map<number, Card>;
  constructor(private db: Database) {}
  async findById(id: number): Promise<Card | null> {
    if (this.cache.has(id)) return this.cache.get(id)!;
    const card = await this.db.query('...');
    this.cache.set(id, card);
    return card;
  }
}

// ✅ GOOD: Simple and direct
export async function getCardById(id: number): Promise<Card | null> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}
```

### D.R.Y (Don't Repeat Yourself)

**If you write the same code twice, extract it.**

```typescript
// ❌ BAD: Repeated logic
export async function GET(req: Request) {
  const user = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // ... handler logic
}

// ✅ GOOD: Reusable middleware
export async function requireAuth(req: Request) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return user;
}

export async function GET(req: Request) {
  const user = await requireAuth(req);
  if (user instanceof Response) return user;
  // ... handler logic
}
```

### Type Safety First

**TypeScript strict mode is non-negotiable. No `any`, no `@ts-ignore`.**

```typescript
// ❌ BAD: Loses type safety
const data: any = await fetchCardData(id);

// ✅ GOOD: Explicit types
import type { Card } from '@cardtrail/shared-types';
const data: Card = await fetchCardData(id);
```

---

## Prohibited Actions

### ❌ NEVER Do These Things

#### 1. Never Use `eslint-disable` or `@ts-ignore`

```typescript
// ❌ ABSOLUTELY FORBIDDEN
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = response.data;

// @ts-ignore
user.name = undefined;

// ✅ FIX THE ROOT CAUSE INSTEAD
const data: Card = response.data as Card;
```

**Why?** These are code smells. Fix the underlying issue, don't hide it.

#### 2. Never Modify the `card_jp` Table

```sql
-- ❌ ABSOLUTELY FORBIDDEN - These will break production!
ALTER TABLE card_jp RENAME TO cards;
ALTER TABLE card_jp ADD COLUMN new_field TEXT;
ALTER TABLE card_jp DROP COLUMN rarity;
ALTER TABLE card_jp RENAME COLUMN card_name TO name;
UPDATE card_jp SET card_name = 'Updated';
DELETE FROM card_jp WHERE id = 123;
TRUNCATE TABLE card_jp;

-- ✅ ONLY SELECT operations are allowed
SELECT * FROM card_jp WHERE id = 123 LIMIT 1;
SELECT card_name, rarity FROM card_jp WHERE set_slug = 'base-set' LIMIT 100;

-- ✅ You CAN create views for cleaner interface
CREATE VIEW cards AS SELECT id, card_name AS name FROM card_jp;

-- ✅ You CAN reference card_jp.id in foreign keys
ALTER TABLE collections ADD CONSTRAINT fk_card 
  FOREIGN KEY (card_id) REFERENCES card_jp(id);

-- ✅ You CAN create indexes (with team approval)
CREATE INDEX CONCURRENTLY idx_card_jp_name ON card_jp(card_name);
```

**Why?** The `card_jp` table contains 28,154 production cards managed by an external data team. ANY modification could break the production dataset and affect all applications using it.

**If you need additional card fields:**
1. Create a separate `card_extensions` table
2. Use card_jp.id as foreign key
3. Store your additional data there
4. Join when querying

```sql
-- ✅ CORRECT: Extend with separate table
CREATE TABLE card_extensions (
  card_id BIGINT PRIMARY KEY REFERENCES card_jp(id),
  current_price_psa10 DECIMAL(10,2),
  popularity_score INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. Never Use `any` Type

```typescript
// ❌ BAD
function processData(data: any) {
  return data.items.map((item: any) => item.price);
}

// ✅ GOOD
function processData(data: { items: { price: number }[] }) {
  return data.items.map((item) => item.price);
}

// ✅ EVEN BETTER: Use shared types
import type { Card } from '@cardtrail/shared-types';
function processCards(cards: Card[]) {
  return cards.map((card) => card.current_price_psa10);
}
```

#### 4. Never Disable TypeScript Strict Mode

```json
// ❌ FORBIDDEN in tsconfig.json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": false
  }
}

// ✅ REQUIRED
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

#### 5. Never Bypass Row-Level Security (RLS)

```typescript
// ❌ BAD: Using service role key in client-side code
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Exposes all data!
);

// ✅ GOOD: Use anon key (respects RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

#### 6. Never Commit Secrets

```typescript
// ❌ FORBIDDEN
const EBAY_API_KEY = 'sk_live_abc123xyz789';

// ✅ ALWAYS use environment variables
const EBAY_API_KEY = process.env.EBAY_API_KEY;
if (!EBAY_API_KEY) throw new Error('EBAY_API_KEY is required');
```

#### 7. Never Skip Validation

```typescript
// ❌ BAD: Trust user input
export async function POST(req: Request) {
  const body = await req.json();
  await insertCollection(body); // Dangerous!
}

// ✅ GOOD: Always validate
import { addCollectionSchema } from '@cardtrail/validations';

export async function POST(req: Request) {
  const body = await req.json();
  const result = addCollectionSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  
  await insertCollection(result.data);
}
```

---

## Mandatory Patterns

### Database Operations

**ALWAYS follow these patterns when working with Supabase:**

#### 1. NEVER Modify card_jp Table

```typescript
// ❌ ABSOLUTELY FORBIDDEN
ALTER TABLE card_jp RENAME TO cards;
ALTER TABLE card_jp ADD COLUMN ...;
UPDATE card_jp SET ...;

// ✅ ONLY read operations allowed
const { data } = await supabase
  .from('card_jp')
  .select('*')
  .eq('id', cardId)
  .limit(1);

// ✅ Create extension table if you need additional fields
CREATE TABLE card_extensions (
  card_id BIGINT PRIMARY KEY REFERENCES card_jp(id),
  current_price_psa10 DECIMAL(10,2),
  popularity_score INTEGER
);
```

#### 2. Always Use RLS Policies

```typescript
// ✅ Create RLS policies in migrations
CREATE POLICY "Users view own collections"
  ON collections
  FOR SELECT
  USING (auth.uid() = user_id);
```

#### 3. Always Limit Query Results

```typescript
// ❌ BAD: Unbounded query (could return millions of rows)
const { data } = await supabase.from('card_jp').select('*');

// ✅ GOOD: Always limit results
const { data } = await supabase
  .from('card_jp')
  .select('*')
  .limit(100);
```

#### 4. Always Handle Errors

```typescript
// ❌ BAD: Ignoring errors
const { data } = await supabase.from('card_jp').select('*');

// ✅ GOOD: Check for errors
const { data, error } = await supabase.from('card_jp').select('*').limit(100);
if (error) throw error; // or handle gracefully
```

#### 5. Always Use Transactions for Multiple Operations

```typescript
// ✅ GOOD: Atomic operations
const { error } = await supabase.rpc('add_card_to_collection', {
  p_card_id: cardId,
  p_user_id: userId,
  p_quantity: 1
});
```

---

### API Development

**ALWAYS follow these patterns for API routes:**

#### 1. Always Validate Request Body with Zod

```typescript
// packages/validations/src/collection.ts
import { z } from 'zod';

export const addCollectionSchema = z.object({
  card_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(1000),
  purchase_price: z.number().positive()
});

// apps/web/app/api/v1/collections/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const result = addCollectionSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json({
      error: {
        code: 'INVALID_PARAMS',
        message: 'Validation failed',
        details: result.error.errors
      }
    }, { status: 400 });
  }
  
  // Proceed with validated data
  const validData = result.data;
}
```

#### 2. Always Return Consistent Error Format

```typescript
// ✅ GOOD: Standardized error response
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Example
return Response.json({
  error: {
    code: 'CARD_NOT_FOUND',
    message: 'Card with ID 99999 not found'
  }
}, { status: 404 });
```

#### 3. Always Implement Rate Limiting

```typescript
// lib/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';

const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s')
});

// In API route
export async function GET(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { success } = await rateLimiter.limit(ip);
  
  if (!success) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }
  
  // Proceed with handler
}
```

#### 4. Always Use Proper HTTP Status Codes

```typescript
// ✅ GOOD: Semantic status codes
return Response.json({ data: card }, { status: 200 });  // OK
return Response.json({ data: newCard }, { status: 201 }); // Created
return Response.json(null, { status: 204 }); // No Content (delete)
return Response.json({ error: 'Invalid params' }, { status: 400 }); // Bad Request
return Response.json({ error: 'Unauthorized' }, { status: 401 }); // Unauthorized
return Response.json({ error: 'Forbidden' }, { status: 403 }); // Forbidden
return Response.json({ error: 'Not found' }, { status: 404 }); // Not Found
```

---

### Frontend Components

**ALWAYS follow these patterns for React components:**

#### 1. Server Components by Default, Client Only When Needed

```typescript
// ✅ GOOD: Server component (default)
export default async function CardProfile({ params }: { params: { id: string } }) {
  const card = await getCardById(parseInt(params.id));
  return <CardDisplay card={card} />;
}

// ✅ GOOD: Client component when needed (interactivity)
'use client';
export function AddToCollectionButton({ card }: { card: Card }) {
  const [isOpen, setIsOpen] = useState(false);
  return <Button onClick={() => setIsOpen(true)}>Add</Button>;
}
```

#### 2. Always Type Component Props

```typescript
// ❌ BAD: Untyped props
export function CardDisplay({ card }) {
  return <div>{card.name}</div>;
}

// ✅ GOOD: Explicit prop types
import type { Card } from '@cardtrail/shared-types';

interface CardDisplayProps {
  card: Card;
  showPrice?: boolean;
}

export function CardDisplay({ card, showPrice = true }: CardDisplayProps) {
  return (
    <div>
      <h2>{card.name}</h2>
      {showPrice && <p>{card.current_price_psa10}</p>}
    </div>
  );
}
```

#### 3. Always Use Shared UI Components

```typescript
// ❌ BAD: Inline styles and custom buttons
export function MyComponent() {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded">
      Click me
    </button>
  );
}

// ✅ GOOD: Use shared Button component
import { Button } from '@cardtrail/ui';

export function MyComponent() {
  return <Button variant="primary">Click me</Button>;
}
```

#### 4. Always Handle Loading and Error States

```typescript
// ✅ GOOD: Complete state handling
export function CardList() {
  const { data: cards, isLoading, error } = useCards();
  
  if (isLoading) return <CardListSkeleton />;
  if (error) return <ErrorState error={error} retry={() => refetch()} />;
  if (cards.length === 0) return <EmptyState />;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  );
}
```

---

### Forms & Validation

**ALWAYS use React Hook Form + Zod:**

```typescript
// ✅ GOOD: Complete form pattern
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addCollectionSchema } from '@cardtrail/validations';
import type { z } from 'zod';

type AddCollectionInput = z.infer<typeof addCollectionSchema>;

export function AddCollectionForm({ cardId }: { cardId: number }) {
  const form = useForm<AddCollectionInput>({
    resolver: zodResolver(addCollectionSchema),
    defaultValues: {
      card_id: cardId,
      quantity: 1,
      purchase_price: 0,
      purchase_currency: 'CNY',
      purchase_date: new Date().toISOString().split('T')[0]
    }
  });

  const mutation = useMutation({
    mutationFn: addToCollection,
    onSuccess: () => {
      toast.success('Card added to collection!');
      form.reset();
    },
    onError: (error) => {
      toast.error('Failed to add card: ' + error.message);
    }
  });

  return (
    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
      <Input
        {...form.register('quantity')}
        label="Quantity"
        type="number"
        error={form.formState.errors.quantity?.message}
      />
      
      <Input
        {...form.register('purchase_price')}
        label="Purchase Price"
        type="number"
        error={form.formState.errors.purchase_price?.message}
      />
      
      <Button type="submit" loading={mutation.isLoading}>
        Add to Collection
      </Button>
    </form>
  );
}
```

---

## Architecture Rules

### 1. Follow Planning Documents

**ALL code must align with these planning documents:**

- ✅ `architecture-overview.md` - Overall system design
- ✅ `monorepo-architecture.md` - Package structure
- ✅ `frontend-architecture.md` - React/Next.js patterns
- ✅ `backend-architecture.md` - API design
- ✅ `database-architecture.md` - Database schema and RLS
- ✅ `api-design.md` - API contracts
- ✅ `feature-breakdown.md` - Implementation phases
- ✅ `ui-component-hierarchy.md` - Component organization

**If you find a conflict:** Raise it immediately. Don't proceed with implementation.

### 2. Respect Package Boundaries

```typescript
// ❌ BAD: Direct import from app
import { getCardById } from '../../../apps/web/lib/queries';

// ✅ GOOD: Import from shared package
import { getCardById } from '@cardtrail/db/queries/cards';
```

### 3. Never Create Circular Dependencies

```typescript
// ❌ FORBIDDEN
// packages/db/src/index.ts
import { Card } from '@cardtrail/ui/components/Card';

// ✅ CORRECT: UI depends on db, not vice versa
// packages/ui/src/components/Card.tsx
import type { Card } from '@cardtrail/shared-types';
```

---

## Development Workflow

### 1. Always Use Taskfile Commands

```bash
# ✅ GOOD: Use task commands
task dev
task build
task test
task lint
task db:migrate

# ❌ BAD: Direct npm/pnpm commands (inconsistent)
npm run dev
pnpm build
```

### 2. Git Branch Naming

```bash
# ✅ GOOD: Descriptive branch names
feat/card-search-autocomplete
fix/price-calculation-rounding
docs/update-api-documentation
refactor/extract-shared-validations

# ❌ BAD: Vague names
update
fix-bug
new-feature
```

### 3. Commit Message Format

```bash
# ✅ GOOD: Conventional commits
git commit -m "feat: add card search autocomplete"
git commit -m "fix: correct price calculation for PSA 9 cards"
git commit -m "docs: update API documentation for collections endpoint"
git commit -m "refactor: extract shared validation schemas"

# ❌ BAD: Vague messages
git commit -m "updates"
git commit -m "fix bug"
git commit -m "wip"
```

**Format:** `<type>: <description>`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

---

## UI/UX Rules

### 1. Always Use Tailwind + Shared Components

```typescript
// ❌ BAD: Custom CSS or inline styles
<div style={{ padding: '16px', backgroundColor: '#3b82f6' }}>
  <h1 style={{ fontSize: '24px' }}>Card Name</h1>
</div>

// ✅ GOOD: Tailwind utilities
<div className="p-4 bg-blue-500">
  <h1 className="text-2xl font-bold">Card Name</h1>
</div>
```

### 2. Always Design Mobile-First

```typescript
// ✅ GOOD: Mobile-first responsive
<div className={cn(
  'grid gap-4',
  'grid-cols-1',        // Mobile: 1 column
  'sm:grid-cols-2',     // Tablet: 2 columns
  'lg:grid-cols-4'      // Desktop: 4 columns
)}>
  {cards.map((card) => <CardItem key={card.id} card={card} />)}
</div>
```

### 3. UI Language Rules (Before i18n Implementation)

**IMPORTANT: 在 i18n 国际化功能实现之前，所有 UI 文本必须只使用中文。**

```typescript
// ❌ BAD: 中英双语混合
<Button>添加 Add to Collection</Button>
<h1>搜索结果 Search Results</h1>
<p>共 {count} 张卡片 cards</p>

// ✅ GOOD: 只使用中文
<Button>添加到收藏</Button>
<h1>搜索结果</h1>
<p>共 {count} 张卡片</p>

// ✅ GOOD: 品牌名和特殊名词可保留英文
<h1>CTI 指数</h1>
<p>PSA 10 价格</p>
<Badge>CardTrail 认证</Badge>
```

**例外情况（可以使用英文的场景）：**
- ✅ 品牌名称：CardTrail, PSA, BGS, CGC
- ✅ 专业术语：CTI (CardTrail Index), ROI
- ✅ 等级标识：PSA 10, PSA 9, BGS 9.5
- ✅ 货币代码：CNY, USD, JPY
- ✅ 技术标识：API, ID, URL（仅在开发文档中）

**After i18n Implementation:**

Once the i18n system is implemented (Phase 12), switch to using translation keys:

```typescript
// ✅ FUTURE: Use i18n keys
import { useTranslation } from 'next-i18next';

export function CardProfile() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('card.profile.title')}</h1>
      <p>{t('card.profile.description')}</p>
    </div>
  );
}
```

---

## Design System Rules

### 🎨 MANDATORY: Follow design.md Specification

**ALL frontend development MUST follow the design system defined in `planning/design.md`.**

#### 1. Always Use Design System Colors

```typescript
// ❌ BAD: Random colors
<div className="bg-gray-100">
  <h1 className="text-black">Title</h1>
  <p className="text-red-500">+12.5%</p>
</div>

// ✅ GOOD: Design system colors
<div className="bg-canvas">
  <h1 className="text-text-primary">Title</h1>
  <p className="text-positive">+12.5%</p>
</div>
```

**Required Colors (from design.md):**
- `bg-canvas` (#F7F7F7) - Background
- `bg-surface` (#FFFFFF) - Cards/Modals
- `text-text-primary` (#222222) - Main text
- `text-text-secondary` (#717171) - Secondary text
- `text-brand` (#FF5A5F) - Brand/Accent
- `text-positive` (#E0474C) - Price up/Profit (中国红)
- `text-negative` (#008A05) - Price down/Loss (深绿)

#### 2. Always Use Design System Components

```typescript
// ❌ BAD: Custom card styling
<div className="p-4 bg-white rounded-lg shadow-md">
  Card content
</div>

// ✅ GOOD: Design system card
<div className="p-6 bg-surface rounded-xl shadow-[0_6px_16px_rgba(0,0,0,0.08)]">
  Card content
</div>
```

**Required Component Styles (from design.md):**

**Cards:**
- Border radius: `rounded-xl` (12px)
- Shadow: `shadow-[0_6px_16px_rgba(0,0,0,0.08)]`
- Background: `bg-surface`
- No border

**Buttons:**
- Height: `h-12` (48px)
- Border radius: `rounded-lg` (8px)
- Primary: `bg-text-primary text-white`
- Ghost: `bg-transparent border border-divider`
- Brand: `bg-brand text-white`

**Card Images:**
- Must have shadow: `shadow-[0_4px_12px_rgba(0,0,0,0.15)]`
- Rounded: `rounded-lg`

#### 3. Always Use Design System Typography

```typescript
// ❌ BAD: Random font sizes
<div className="text-3xl font-black">¥ 3,450</div>
<p className="text-sm">Card name</p>

// ✅ GOOD: Design system typography
<div className="text-[32pt] font-bold text-text-primary">¥ 3,450</div>
<p className="text-base font-medium text-text-primary">Card name</p>
```

**Required Typography Scale (from design.md):**
- Display (Price): `text-[32pt]` (2rem) + `font-bold` (700)
- Heading 1: `text-2xl` (1.5rem) + `font-bold`
- Heading 2: `text-xl` (1.25rem) + `font-medium`
- Body: `text-base` (1rem) + `font-normal`
- Caption: `text-sm` (0.875rem)
- Small: `text-xs` (0.75rem)

#### 4. Always Follow Page-Specific Design Guidelines

**When implementing ANY page, check `planning/design.md` Section 2 for:**

✅ **Card Detail Page:**
- Hero section with 40vh height
- Giant price display (32pt)
- Segmented control for grades
- Minimal chart (no grid lines)
- Sticky footer with 2 buttons

✅ **Portfolio Page:**
- No traditional nav bar
- Display font for total assets (40pt)
- Red/green profit/loss colors
- Card items with thumbnail + info + price
- Skeleton loading (not spinner)

✅ **Search Results Page:**
- Pill-shaped search bar (rounded-full)
- Horizontal scrolling filter pills
- 2-column grid on mobile
- Card image as primary content

✅ **Market Dashboard:**
- CTI index with huge number
- Sparkline charts
- Horizontal scrolling index cards
- Clean news feed (left text, right 1:1 image)

✅ **Rankings Page:**
- No vertical lines in table
- Gold/silver/bronze badges for top 3
- Minimal horizontal dividers only

#### 5. Color Usage Rules (China Market)

```typescript
// ✅ MANDATORY: Red = Up/Profit, Green = Down/Loss
// This follows Chinese market convention (opposite of Western markets)

// Price increase / Profit
<span className="text-positive">+12.5%</span>

// Price decrease / Loss
<span className="text-negative">-8.3%</span>

// ❌ NEVER use green for positive or red for negative!
```

#### 6. Always Use 8px Spacing System

```typescript
// ✅ GOOD: Use design system spacing
<div className="space-y-4">        {/* 16px = 2x */}
  <div className="px-6 py-4">     {/* 24px, 16px */}
    <div className="mb-2">        {/* 8px = 1x */}
      Content
    </div>
  </div>
</div>

// ❌ BAD: Random spacing
<div className="space-y-3">
  <div className="px-5 py-7">
    Content
  </div>
</div>
```

**Spacing Scale (8px base):**
- `space-y-1` / `p-1` = 4px (0.5x)
- `space-y-2` / `p-2` = 8px (1x)
- `space-y-4` / `p-4` = 16px (2x)
- `space-y-6` / `p-6` = 24px (3x)
- `space-y-8` / `p-8` = 32px (4x)
- `space-y-12` / `p-12` = 48px (6x)

#### 7. Mobile Touch Targets

```typescript
// ✅ GOOD: Minimum 44px touch targets
<button className="h-12 px-6">  {/* 48px height */}
  Button Text
</button>

// ❌ BAD: Too small for mobile
<button className="h-8 px-2">   {/* 32px - too small! */}
  Button
</button>
```

**Rule:** All interactive elements MUST be ≥ 44px tall/wide (iOS HIG standard).

#### 8. Animation Timing

```typescript
// ✅ GOOD: Use design system transitions
<button className="transition-all duration-200 hover:scale-98">
  Click me
</button>

// Standard easing
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
```

**Timing Standards (from design.md):**
- Standard transition: 200ms
- Enter animation: 300ms
- Exit animation: 200ms

#### 9. Loading States

```typescript
// ✅ GOOD: Skeleton screens (design system)
<div className="animate-pulse">
  <div className="h-4 bg-canvas rounded w-3/4 mb-3"></div>
  <div className="h-8 bg-canvas rounded w-1/2"></div>
</div>

// ❌ BAD: Generic spinner (not minimalist)
<div className="spinner-border">Loading...</div>
```

#### 10. Implementation Checklist

**Before submitting ANY frontend code, verify:**

- [ ] Uses colors from design.md color system
- [ ] Cards have 12px border radius and proper shadow
- [ ] Buttons are 48px tall with 8px border radius
- [ ] Price numbers use 32pt font weight 700
- [ ] Red = up/profit, Green = down/loss (China market)
- [ ] Touch targets ≥ 44px
- [ ] Uses 8px spacing system
- [ ] Loading states use Skeleton Screen
- [ ] Transitions are 200ms
- [ ] Page layout follows design.md Section 2 specifications
- [ ] Mobile-first responsive design
- [ ] Background is #F7F7F7 (canvas)
- [ ] No custom shadows (use design system)

### Design System Resources

**MUST read before implementing UI:**
- ✅ `planning/design.md` - Complete design specification
- ✅ `planning/ui-component-hierarchy.md` - Component organization

**If design.md conflicts with other docs:** `design.md` takes precedence for all visual/UI decisions.

---

## Performance Rules

### 1. Always Limit Database Queries

```typescript
// ❌ BAD: Unbounded query
const { data } = await supabase.from('cards').select('*');

// ✅ GOOD: Always limit
const { data } = await supabase
  .from('cards')
  .select('*')
  .limit(100);
```

### 2. Always Optimize Images

```typescript
// ❌ BAD: Regular img tag
<img src={card.image_urls.large} alt={card.name} />

// ✅ GOOD: Next.js Image component
import Image from 'next/image';

<Image
  src={card.image_urls.large}
  alt={card.name}
  width={500}
  height={700}
  placeholder="blur"
  blurDataURL={card.image_urls.small}
  loading="lazy"
/>
```

### 3. Always Use React Query for Server State

```typescript
// ❌ BAD: Manual fetch with useState
const [card, setCard] = useState<Card | null>(null);
useEffect(() => {
  fetchCard(id).then(setCard);
}, [id]);

// ✅ GOOD: React Query handles caching, refetching, etc.
const { data: card, isLoading } = useQuery({
  queryKey: ['card', id],
  queryFn: () => fetchCard(id),
  staleTime: 5 * 60 * 1000 // 5 minutes
});
```

### 4. Always Monitor Bundle Size

```bash
# Check bundle size after adding dependencies
task build
npx @next/bundle-analyzer
```

**Limits:**
- Total bundle: < 200KB (gzipped)
- First Load JS: < 150KB
- Per-page JS: < 50KB

---

## Testing Rules

### 1. Always Write Tests for Business Logic

```typescript
// lib/price-algorithm/calculate-ct-price.ts
export function calculateCTPrice(transactions: Transaction[]): number {
  // Complex logic here
}

// __tests__/lib/price-algorithm.test.ts
import { calculateCTPrice } from '@/lib/price-algorithm';

describe('calculateCTPrice', () => {
  it('should calculate weighted average correctly', () => {
    const transactions = [
      { price: 100, sold_date: new Date(), weight: 1.0 },
      { price: 110, sold_date: new Date(), weight: 0.9 }
    ];
    
    const result = calculateCTPrice(transactions);
    expect(result).toBeCloseTo(104.74, 2);
  });
  
  it('should handle empty transactions', () => {
    expect(() => calculateCTPrice([])).toThrow();
  });
});
```

### 2. Always Test API Endpoints

```typescript
// __tests__/api/cards.test.ts
import { GET } from '@/app/api/v1/cards/route';

describe('GET /api/v1/cards', () => {
  it('should return paginated cards', async () => {
    const req = new Request('http://localhost/api/v1/cards?page=1&per_page=20');
    const response = await GET(req);
    const json = await response.json();
    
    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(20);
    expect(json.pagination).toHaveProperty('total_items');
  });
  
  it('should validate query parameters', async () => {
    const req = new Request('http://localhost/api/v1/cards?per_page=9999');
    const response = await GET(req);
    
    expect(response.status).toBe(400);
  });
});
```

### 3. Test What Matters, Skip What Doesn't

**✅ DO test:**
- Business logic (price calculations, algorithms)
- API endpoints (request/response)
- Complex UI interactions (forms, modals)
- Utility functions

**❌ DON'T test:**
- Trivial getters/setters
- External library code
- Simple UI components (Button, Input)
- Type definitions

---

## Security Rules

### 1. Never Expose Secrets

```typescript
// ❌ FORBIDDEN: Hardcoded secrets
const EBAY_API_KEY = 'sk_live_abc123';

// ✅ GOOD: Environment variables
const EBAY_API_KEY = process.env.EBAY_API_KEY;
if (!EBAY_API_KEY) {
  throw new Error('EBAY_API_KEY is required');
}
```

### 2. Always Validate Input

```typescript
// ❌ BAD: Trust user input
export async function POST(req: Request) {
  const body = await req.json();
  await supabase.from('collections').insert(body);
}

// ✅ GOOD: Validate with Zod
export async function POST(req: Request) {
  const body = await req.json();
  const result = addCollectionSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  
  await supabase.from('collections').insert(result.data);
}
```

### 3. Always Use RLS Policies

```sql
-- ✅ GOOD: Enforce data access at database level
CREATE POLICY "Users view own collections"
  ON collections
  FOR SELECT
  USING (auth.uid() = user_id);
```

### 4. Always Sanitize Output

```typescript
// ❌ BAD: XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: user.bio }} />

// ✅ GOOD: React escapes by default
<div>{user.bio}</div>

// ✅ GOOD: Sanitize if HTML needed
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.bio) }} />
```

---

## Error Handling

### 1. Always Handle Errors Gracefully

```typescript
// ❌ BAD: Silent failure
try {
  await updateCollection(data);
} catch (error) {
  // Nothing happens - user confused
}

// ✅ GOOD: User feedback
try {
  await updateCollection(data);
  toast.success('Collection updated!');
} catch (error) {
  console.error('Failed to update collection:', error);
  toast.error('Failed to update collection. Please try again.');
}
```

### 2. Always Log Errors

```typescript
// ✅ GOOD: Log to Sentry
import * as Sentry from '@sentry/nextjs';

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { operation: 'riskyOperation' },
    extra: { userId, data }
  });
  throw error; // Re-throw or handle
}
```

### 3. User-Friendly Error Messages

```typescript
// ❌ BAD: Technical error message
toast.error('Error: ECONNREFUSED 127.0.0.1:5432');

// ✅ GOOD: User-friendly message
toast.error('Unable to connect to database. Please try again later.');
```

---

## Documentation Rules

### 1. Comment WHY, Not WHAT

```typescript
// ❌ BAD: States the obvious
// Set the price to 100
const price = 100;

// ✅ GOOD: Explains reasoning
// PSA 9 cards typically sell for 60% of PSA 10 price
const psa9Price = psa10Price * 0.6;
```

### 2. Always Document Complex Logic

```typescript
/**
 * Calculates CT Price using weighted average of eBay transactions.
 * 
 * Algorithm:
 * 1. Fetch eBay sold listings (last 90 days)
 * 2. Remove outliers using IQR method
 * 3. Apply recency weights (exponential decay, 30-day half-life)
 * 4. Calculate weighted average
 * 
 * @param cardId - Card ID to calculate price for
 * @param grade - Grading tier (psa10, psa9, psa8, raw)
 * @returns CT Price result with confidence level
 */
export async function calculateCTPrice(
  cardId: number,
  grade: GradeType
): Promise<CTPriceResult> {
  // Implementation
}
```

### 3. Always Update Documentation When Code Changes

When you update code, check if these docs need updates:
- API documentation (`api-design.md`)
- Component documentation (Storybook)
- README files
- JSDoc comments

---

## When in Doubt

### Decision Framework

1. **Check Planning Docs**: Does the architecture specify how to handle this?
2. **Check Existing Code**: Is there a similar pattern elsewhere?
3. **K.I.S.S Principle**: What's the simplest solution?
4. **Ask for Review**: Create draft PR and request feedback

### Red Flags (Stop and Ask)

🚩 "I need to disable TypeScript errors"  
🚩 "I need to modify the cards table directly"  
🚩 "This requires a new dependency (>50KB)"  
🚩 "I can't find a similar pattern in the codebase"  
🚩 "This violates one of the prohibited actions"

**When you see a red flag:** Stop. Ask for review before proceeding.

---

## Summary Checklist

Before submitting code, verify:

**Code Quality:**
- [ ] No `eslint-disable` or `@ts-ignore`
- [ ] No `any` types
- [ ] TypeScript strict mode passing
- [ ] All inputs validated with Zod
- [ ] All database queries use RLS
- [ ] All database queries are limited
- [ ] No hardcoded secrets

**Design System (Frontend Only):**
- [ ] Uses design.md color system (canvas, surface, text-primary, etc.)
- [ ] Cards have 12px radius + proper shadow
- [ ] Buttons are 48px tall
- [ ] Price numbers are 32pt bold
- [ ] Red = up, Green = down (China market)
- [ ] Touch targets ≥ 44px
- [ ] Uses 8px spacing system
- [ ] Skeleton screens for loading
- [ ] Page follows design.md layout specs

**General:**
- [ ] Mobile-first responsive design
- [ ] Error handling with user feedback
- [ ] Loading and empty states implemented
- [ ] Tests written for business logic
- [ ] Comments explain WHY, not WHAT
- [ ] Follows existing patterns
- [ ] Uses Taskfile commands
- [ ] Conventional commit message
- [ ] Documentation updated if needed

---

## Enforcement

**Code reviews will reject PRs that violate these guidelines.**

AI agents that consistently violate these rules will be:
1. Flagged in code review
2. Discussed with the team
3. Potentially blocked from the repository

**These rules exist to ensure:**
- Code quality
- Security
- Performance
- Maintainability
- Team productivity

---

**Document Status:** ✅ Mandatory for ALL Development  
**Last Review:** December 4, 2025  
**Next Review:** After onboarding 3+ developers

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) AI Development Guidelines
