# CardTrail Frontend Architecture

**Document Version:** 2.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Author:** Frontend Architecture Team

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [UI Framework Decision: shadcn/ui vs DaisyUI vs 21st.dev](#ui-framework-decision)
4. [Component Organization](#component-organization)
5. [Routing Structure](#routing-structure)
6. [Server vs Client Components](#server-vs-client-components)
7. [Form Validation Patterns](#form-validation-patterns)
8. [State Management](#state-management)
9. [Data Fetching](#data-fetching)
10. [Internationalization](#internationalization)
11. [Responsive Design](#responsive-design)

---

## Overview

### Mobile-First Philosophy

CardTrail is designed **mobile-first** for the Chinese market where 80% of users are on mobile devices. Our frontend architecture prioritizes:

1. **Performance**: < 2s page load, < 100ms interactions
2. **Mobile UX**: Thumb-friendly navigation, swipe gestures
3. **Responsive**: Adapts seamlessly from 375px to 1920px
4. **Accessibility**: WCAG 2.1 AA compliance
5. **Type Safety**: TypeScript strict mode throughout

---

## Tech Stack

### Core Technologies

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Framework** | Next.js (App Router) | 14+ | SSR for SEO, API routes, excellent DX |
| **UI Library** | React | 18+ | Industry standard, hooks, concurrent features |
| **Language** | TypeScript | 5+ | Type safety, better IDE support |
| **Styling** | Tailwind CSS | 3+ | Utility-first, mobile-first, fast development |
| **UI Foundation** | shadcn/ui | Latest | Copy-paste components, full customization |
| **UI Enhancement** | **DaisyUI** (Recommended) | 4+ | Pre-styled Tailwind components, themes |
| **State (Client)** | Zustand | 4+ | Minimal boilerplate, 3KB, great DX |
| **State (Server)** | TanStack Query (React Query) | 5+ | Caching, refetching, optimistic updates |
| **Forms** | React Hook Form | 7+ | Performance, minimal re-renders |
| **Validation** | Zod | 3+ | TypeScript-first schema validation |
| **Charts** | Recharts | 2+ | React-native, composable, mobile-optimized |
| **Icons** | Lucide React | Latest | Lightweight, tree-shakeable, consistent |

---

## UI Framework Decision

### Comparison: shadcn/ui + DaisyUI vs 21st.dev

We evaluated three approaches for UI components:

| Aspect | shadcn/ui + DaisyUI | 21st.dev | Plain shadcn/ui |
|--------|---------------------|----------|----------------|
| **Foundation** | Tailwind classes + React | React components (TypeScript-first) | Radix UI primitives |
| **TypeScript Support** | Good (via types) | Excellent (built-in) | Excellent |
| **Customization** | High (Tailwind utilities) | Medium (component props) | High (full source) |
| **Theme System** | Built-in (30+ themes) | Custom theming | Manual (CSS vars) |
| **Bundle Size** | Small (~50KB + components) | Larger (~150KB) | Minimal (~30KB) |
| **Chinese Support** | Good | Excellent (designed for CN) | Manual |
| **Learning Curve** | Low (HTML + Tailwind) | Medium (component API) | Low |
| **Documentation** | Excellent (both projects) | Excellent | Excellent |
| **Mobile Optimization** | Excellent | Excellent | Excellent |
| **Component Library** | 50+ components (DaisyUI) | 40+ components | ~25 primitives |

### **Recommendation: shadcn/ui + DaisyUI**

**Why this combination?**

1. **Best of Both Worlds**:
   - shadcn/ui: Unstyled primitives with full control (Radix UI + Tailwind)
   - DaisyUI: Pre-styled Tailwind components with semantic classes

2. **Zero Runtime**:
   - DaisyUI is pure CSS (Tailwind classes)
   - No JavaScript overhead
   - Perfect Lighthouse scores

3. **Theming Built-in**:
   - 30+ built-in themes (light, dark, cupcake, etc.)
   - Easy theme switching
   - CSS variables for customization

4. **Mobile-First**:
   - Tailwind mobile-first utilities
   - Touch-friendly components
   - Responsive by default

5. **Chinese Market**:
   - Good font rendering for Chinese characters
   - RTL support (for future markets)
   - Localized components

**Example Usage:**

```tsx
// Base component from shadcn (installed locally)
import { Button as BaseButton } from '@cardtrail/ui/components/button';

// Enhanced with DaisyUI classes
export function PrimaryButton({ children, ...props }: ButtonProps) {
  return (
    <BaseButton className="btn btn-primary" {...props}>
      {children}
    </BaseButton>
  );
}

// Or use DaisyUI directly for simpler components
export function SecondaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="btn btn-secondary">
      {children}
    </button>
  );
}
```

### Why NOT 21st.dev?

**Pros:**
- TypeScript-first
- Great Chinese support
- Well-documented

**Cons:**
- ❌ **Larger bundle size** (150KB vs 50KB)
- ❌ **Less flexible** (component props vs Tailwind utilities)
- ❌ **Smaller ecosystem** (newer project, less community)
- ❌ **Runtime cost** (React components vs pure CSS)

**Verdict:** 21st.dev is great, but DaisyUI's zero-runtime and Tailwind integration is perfect for our mobile-first, performance-critical needs.

### Why NOT plain shadcn/ui?

**Pros:**
- Full control
- Minimal bundle

**Cons:**
- ❌ **More work** (need to style every component)
- ❌ **No built-in themes** (need custom CSS variables)
- ❌ **Slower development** (styling from scratch)

**Verdict:** shadcn alone is great for design-heavy apps, but DaisyUI accelerates development with pre-styled, semantic components.

---

## Component Organization

### Directory Structure

```
apps/web/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing page
│   ├── (auth)/                  # Auth routes group
│   │   ├── layout.tsx          # Auth layout
│   │   ├── login/
│   │   └── signup/
│   └── (main)/                  # Main app routes group
│       ├── layout.tsx          # Main layout (with bottom nav)
│       ├── market/             # 大盘 (Market)
│       ├── collection/         # 持仓 (Collection)
│       ├── search/             # 搜卡 (Search)
│       ├── rankings/           # 榜单 (Rankings)
│       └── profile/            # 我的 (Profile)
│
├── components/                   # App-specific components
│   ├── features/                # Feature-specific components
│   │   ├── cards/
│   │   │   ├── CardProfile.tsx
│   │   │   ├── CardGrid.tsx
│   │   │   └── CardImage.tsx
│   │   ├── collections/
│   │   │   ├── AddCollectionForm.tsx
│   │   │   └── CollectionItem.tsx
│   │   ├── charts/
│   │   │   ├── PriceTrendChart.tsx
│   │   │   └── PortfolioChart.tsx
│   │   └── market/
│   │       ├── MarketIndexCard.tsx
│   │       └── KLineChart.tsx
│   └── layouts/                 # Layout components
│       ├── MainLayout.tsx
│       ├── BottomNav.tsx
│       └── Header.tsx
│
├── lib/                         # Utilities and helpers
│   ├── utils.ts                # General utilities (cn, formatters)
│   └── constants.ts            # App constants
│
└── styles/
    └── globals.css             # Global styles, Tailwind imports
```

### Shared Components (packages/ui)

```
packages/ui/
├── src/
│   ├── components/              # Base UI components
│   │   ├── button.tsx          # Button (from shadcn)
│   │   ├── input.tsx           # Input (from shadcn)
│   │   ├── card.tsx            # Card (from shadcn)
│   │   ├── modal.tsx           # Modal/Dialog (from shadcn)
│   │   ├── tabs.tsx            # Tabs (from shadcn)
│   │   ├── badge.tsx           # Badge (from shadcn)
│   │   ├── skeleton.tsx        # Loading skeleton
│   │   └── index.ts            # Barrel export
│   │
│   ├── hooks/                   # Shared React hooks
│   │   ├── use-toast.ts
│   │   ├── use-debounce.ts
│   │   └── use-media-query.ts
│   │
│   ├── utils/                   # UI utilities
│   │   ├── cn.ts               # Class name helper
│   │   ├── formatters.ts       # Date, number formatters
│   │   └── index.ts
│   │
│   └── index.ts                 # Main export
│
├── package.json
└── tsconfig.json
```

---

## Routing Structure

### Route Groups

Next.js App Router uses route groups `()` for organization without affecting URL structure.

```
app/
├── (auth)/                      # Auth routes (centered layout)
│   ├── layout.tsx              # Auth-specific layout
│   ├── login/page.tsx          # /login
│   └── signup/page.tsx         # /signup
│
└── (main)/                      # Main app routes (with bottom nav)
    ├── layout.tsx              # Main layout
    ├── market/
    │   ├── page.tsx            # /market (CTI dashboard)
    │   └── [index_type]/
    │       └── page.tsx        # /market/wotc (sub-index detail)
    │
    ├── collection/
    │   ├── page.tsx            # /collection (portfolio overview)
    │   ├── add/page.tsx        # /collection/add (add modal/page)
    │   └── analytics/page.tsx  # /collection/analytics
    │
    ├── search/
    │   ├── page.tsx            # /search (search landing)
    │   ├── results/page.tsx    # /search/results
    │   └── cards/
    │       └── [id]/page.tsx   # /search/cards/123 (card profile)
    │
    ├── rankings/
    │   └── page.tsx            # /rankings (leaderboards)
    │
    └── profile/
        ├── page.tsx            # /profile (user profile)
        ├── watchlist/page.tsx  # /profile/watchlist
        ├── settings/page.tsx   # /profile/settings
        └── edit/page.tsx       # /profile/edit
```

### Routing Patterns

**Dynamic Routes:**
```tsx
// app/(main)/search/cards/[id]/page.tsx
export default function CardProfilePage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const cardId = parseInt(params.id);
  // Fetch card data...
}

// Generate static paths for popular cards (ISR)
export async function generateStaticParams() {
  const popularCards = await getPopularCards(100);
  return popularCards.map((card) => ({
    id: card.id.toString()
  }));
}

// Revalidate every 24 hours
export const revalidate = 86400;
```

**Parallel Routes (Future):**
```tsx
// app/(main)/collection/@modal/add/page.tsx
// Renders as modal over /collection
```

---

## Server vs Client Components

### Default: Server Components

**Use Server Components by default.** They:
- Reduce JavaScript bundle size
- Fetch data on server (faster, closer to database)
- Better SEO (fully rendered HTML)
- Improved security (keep secrets on server)

```tsx
// ✅ Server Component (default in App Router)
// app/(main)/search/cards/[id]/page.tsx
export default async function CardProfilePage({ params }: { params: { id: string } }) {
  // Fetch data on server
  const card = await getCardById(parseInt(params.id));
  const priceHistory = await getCardPriceHistory(parseInt(params.id));

  return (
    <div>
      <h1>{card.name}</h1>
      <CTPriceDisplay card={card} />
      <PriceTrendChart data={priceHistory} />
    </div>
  );
}
```

### When to Use Client Components

**Add `'use client'` directive ONLY when you need:**
1. **Interactivity**: `onClick`, `onChange`, `onSubmit`
2. **State**: `useState`, `useReducer`
3. **Effects**: `useEffect`, `useLayoutEffect`
4. **Browser APIs**: `localStorage`, `window`, `document`
5. **Custom Hooks**: Any hook that uses state/effects

```tsx
// ✅ Client Component (interactive)
'use client';

import { useState } from 'react';
import { Button } from '@cardtrail/ui';
import { AddCollectionModal } from './AddCollectionModal';

export function AddToCollectionButton({ card }: { card: Card }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Add to Collection
      </Button>
      
      <AddCollectionModal 
        open={isOpen} 
        onClose={() => setIsOpen(false)}
        card={card}
      />
    </>
  );
}
```

### Composition Pattern

**Keep Client Components small and deep in the tree.**

```tsx
// ✅ GOOD: Server component wraps client component
// app/(main)/search/cards/[id]/page.tsx (Server)
export default async function CardProfilePage({ params }: { params: { id: string } }) {
  const card = await getCardById(parseInt(params.id));

  return (
    <div>
      <CardDisplay card={card} />  {/* Server */}
      <AddToCollectionButton card={card} />  {/* Client */}
    </div>
  );
}

// ❌ BAD: Entire page is client component
'use client';
export default function CardProfilePage({ params }: { params: { id: string } }) {
  const [card, setCard] = useState(null);
  // Loses SSR benefits!
}
```

---

## Form Validation Patterns

### React Hook Form + Zod

**ALWAYS use this pattern for forms:**

```tsx
// 1. Define validation schema (packages/validations/src/collection.ts)
import { z } from 'zod';

export const addCollectionSchema = z.object({
  card_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(1000),
  purchase_price: z.number().positive(),
  purchase_currency: z.enum(['CNY', 'USD', 'JPY']),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grading_company: z.enum(['PSA', 'BGS', 'CGC']).nullable().optional(),
  grade: z.number().min(1).max(10).nullable().optional()
});

export type AddCollectionInput = z.infer<typeof addCollectionSchema>;

// 2. Create form component (apps/web/components/features/collections/AddCollectionForm.tsx)
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addCollectionSchema, type AddCollectionInput } from '@cardtrail/validations';
import { Button, Input, Select } from '@cardtrail/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function AddCollectionForm({ cardId }: { cardId: number }) {
  const queryClient = useQueryClient();
  
  const form = useForm<AddCollectionInput>({
    resolver: zodResolver(addCollectionSchema),
    defaultValues: {
      card_id: cardId,
      quantity: 1,
      purchase_price: 0,
      purchase_currency: 'CNY',
      purchase_date: new Date().toISOString().split('T')[0],
      grading_company: null,
      grade: null
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: AddCollectionInput) => {
      const response = await fetch('/api/v1/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast.success('Card added to collection!');
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(`Failed to add card: ${error.message}`);
    }
  });

  return (
    <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))}>
      <div className="space-y-4">
        <Input
          {...form.register('quantity', { valueAsNumber: true })}
          label="Quantity"
          type="number"
          error={form.formState.errors.quantity?.message}
        />
        
        <Input
          {...form.register('purchase_price', { valueAsNumber: true })}
          label="Purchase Price"
          type="number"
          step="0.01"
          error={form.formState.errors.purchase_price?.message}
        />
        
        <Select
          {...form.register('purchase_currency')}
          label="Currency"
          error={form.formState.errors.purchase_currency?.message}
        >
          <option value="CNY">CNY (¥)</option>
          <option value="USD">USD ($)</option>
          <option value="JPY">JPY (¥)</option>
        </Select>
        
        <Input
          {...form.register('purchase_date')}
          label="Purchase Date"
          type="date"
          error={form.formState.errors.purchase_date?.message}
        />
        
        <Button type="submit" loading={mutation.isPending} className="w-full">
          Add to Collection
        </Button>
      </div>
    </form>
  );
}
```

---

## State Management

### Two-Layer Approach: React Query + Zustand

#### Server State: React Query (TanStack Query)

**For data from APIs/database:**

```tsx
// hooks/useCard.ts
import { useQuery } from '@tanstack/react-query';
import type { Card } from '@cardtrail/shared-types';

export function useCard(cardId: number) {
  return useQuery({
    queryKey: ['card', cardId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/cards/${cardId}`);
      if (!response.ok) throw new Error('Failed to fetch card');
      const json = await response.json();
      return json.data as Card;
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 30 * 60 * 1000  // 30 minutes
  });
}

// Usage in component
export function CardProfile({ cardId }: { cardId: number }) {
  const { data: card, isLoading, error } = useCard(cardId);
  
  if (isLoading) return <CardSkeleton />;
  if (error) return <ErrorState error={error} />;
  
  return <CardDisplay card={card} />;
}
```

#### Client State: Zustand

**For UI state (modals, theme, language):**

```tsx
// stores/uiStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  theme: 'light' | 'dark' | 'system';
  currency: 'CNY' | 'USD' | 'JPY';
  language: 'zh-CN' | 'zh-TW' | 'en';
  
  setTheme: (theme: UIState['theme']) => void;
  setCurrency: (currency: UIState['currency']) => void;
  setLanguage: (language: UIState['language']) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      currency: 'CNY',
      language: 'zh-CN',
      
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
      setLanguage: (language) => set({ language })
    }),
    {
      name: 'cardtrail-ui-state'
    }
  )
);

// Usage
export function SettingsPage() {
  const { currency, setCurrency } = useUIStore();
  
  return (
    <Select value={currency} onValueChange={setCurrency}>
      <option value="CNY">CNY (¥)</option>
      <option value="USD">USD ($)</option>
      <option value="JPY">JPY (¥)</option>
    </Select>
  );
}
```

---

## Data Fetching

### Patterns

#### 1. Server Components (Preferred)

```tsx
// Fetch on server, pass as props
export default async function CardProfilePage({ params }: { params: { id: string } }) {
  const card = await getCardById(parseInt(params.id));
  return <CardProfile card={card} />;
}
```

#### 2. Client Components with React Query

```tsx
'use client';

export function CollectionList() {
  const { data, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: fetchCollections
  });
  
  if (isLoading) return <Skeleton />;
  return <List items={data} />;
}
```

#### 3. Parallel Data Fetching

```tsx
// Fetch multiple resources in parallel
export default async function DashboardPage() {
  const [cards, collections, market] = await Promise.all([
    getPopularCards(),
    getUserCollections(),
    getMarketIndices()
  ]);
  
  return (
    <Dashboard 
      cards={cards}
      collections={collections}
      market={market}
    />
  );
}
```

---

## Internationalization

### Next.js i18n with next-intl

```tsx
// middleware.ts
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['zh-CN', 'zh-TW', 'en'],
  defaultLocale: 'zh-CN'
});

// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();
  
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}

// Usage in component
'use client';
import { useTranslations } from 'next-intl';

export function CardProfile() {
  const t = useTranslations('card');
  
  return (
    <div>
      <h1>{t('profile.title')}</h1>
      <p>{t('profile.description')}</p>
    </div>
  );
}
```

---

## Responsive Design

### Mobile-First Breakpoints

```typescript
// tailwind.config.ts
export default {
  theme: {
    screens: {
      'sm': '640px',   // Mobile landscape
      'md': '768px',   // Tablet
      'lg': '1024px',  // Desktop
      'xl': '1280px',  // Large desktop
      '2xl': '1536px'  // Extra large
    }
  }
}
```

### Responsive Patterns

```tsx
// Mobile-first grid
<div className={cn(
  'grid gap-4',
  'grid-cols-1',        // Mobile: 1 column
  'sm:grid-cols-2',     // Tablet: 2 columns
  'lg:grid-cols-4'      // Desktop: 4 columns
)}>
  {cards.map((card) => <CardItem key={card.id} card={card} />)}
</div>

// Conditional rendering
<div>
  {/* Mobile: Bottom navigation */}
  <BottomNav className="md:hidden" />
  
  {/* Desktop: Top header */}
  <Header className="hidden md:block" />
</div>
```

---

## Summary

### Key Decisions

✅ **UI Framework**: shadcn/ui + DaisyUI (zero-runtime, Tailwind-based)  
✅ **Server First**: Server Components by default  
✅ **State**: React Query (server) + Zustand (client)  
✅ **Forms**: React Hook Form + Zod  
✅ **Mobile-First**: Tailwind breakpoints, responsive utilities  
✅ **i18n**: next-intl for Chinese + English  

### Next Steps

1. Review `ui-component-hierarchy.md` for component details
2. Review `monorepo-architecture.md` for package structure
3. Review `agents.md` for development guidelines
4. Set up shadcn/ui and DaisyUI
5. Start building components

---

**Document Status:** ✅ Ready for Implementation  
**Last Review:** December 4, 2025  
**Next Review:** After frontend setup complete

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Frontend Architecture
