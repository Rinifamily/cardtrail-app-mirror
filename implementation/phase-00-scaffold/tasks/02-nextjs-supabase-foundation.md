# Task 02: Next.js + Supabase Foundation with shadcn/ui + DaisyUI

**Goal:** Complete Next.js 14 app with Supabase connection and UI framework

**Time Estimate:** 8 hours

**Phase:** Phase 0

**Dependencies:** Task 01 (Monorepo Setup)

---

## 📖 Context

**What this task delivers:**
- Next.js 14 application with App Router
- Supabase client connection (client-side and server-side)
- shadcn/ui + DaisyUI installed and configured
- Base UI components (Button, Input, Card, Modal, Toast)
- Tailwind CSS configured
- Can query card_jp table from Supabase
- Basic layout components
- Mobile responsive
- Ready for authentication implementation

**Why this matters:**
This task creates the actual web application that users will interact with. The Next.js + Supabase combination provides SSR for SEO, serverless API routes, and managed database with authentication. shadcn/ui + DaisyUI give us beautiful, accessible components with zero runtime overhead.

**Planning docs:**
- `planning/frontend-architecture.md` - shadcn/ui + DaisyUI decision and patterns (CRITICAL - read sections: UI Framework Decision, Component Organization)
- `planning/architecture-overview.md` - Tech stack and Next.js configuration (Section: Tech Stack, Component Structure)
- `planning/database-architecture.md` - Supabase connection and card_jp table (Section: Existing Database)
- `planning/agents.md` - Core development guidelines (MANDATORY reading)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] Next.js 14 app created in apps/web/
- [ ] App Router configured (not Pages Router)
- [ ] Supabase client connects successfully
- [ ] Can query card_jp table and retrieve cards
- [ ] shadcn/ui components installed
- [ ] DaisyUI configured with Tailwind
- [ ] Base UI components created and working
- [ ] Layout components created (MainLayout, AuthLayout)
- [ ] Mobile-first responsive design

**Technical Requirements:**
- [ ] TypeScript strict mode
- [ ] Tailwind CSS configured
- [ ] Next.js 14+ with App Router
- [ ] Supabase client v2.38.0+
- [ ] shadcn/ui latest
- [ ] DaisyUI 4+
- [ ] Environment variables configured
- [ ] Image optimization configured

**UI/UX Requirements:**
- [ ] Follows DaisyUI theme
- [ ] Mobile-first design (375px viewport)
- [ ] Accessible (keyboard navigation)
- [ ] Fast load time (< 2s)

**Acceptance Criteria:**
- [ ] `task dev` starts Next.js dev server
- [ ] Homepage renders successfully
- [ ] Can query card_jp table from Supabase
- [ ] Base UI components render correctly
- [ ] Tailwind utilities work
- [ ] DaisyUI classes work
- [ ] TypeScript compiles with no errors
- [ ] Mobile responsive (tested on 375px)
- [ ] Deployed to Vercel preview

---

## 📝 Implementation Approach

### 1. Create Next.js App

**Initialize Next.js:**
```bash
cd apps
pnpm create next-app@latest web \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**apps/web/package.json:**
```json
{
  "name": "@cardtrail/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@supabase/supabase-js": "^2.38.0",
    "@supabase/ssr": "^0.0.10",
    "@cardtrail/shared-types": "workspace:*",
    "@cardtrail/db": "workspace:*",
    "@cardtrail/ui": "workspace:*",
    "@cardtrail/validations": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "eslint": "^8.55.0",
    "eslint-config-next": "^14.0.4"
  }
}
```

### 2. Configure Supabase

**lib/supabase/client.ts:**
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@cardtrail/shared-types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**lib/supabase/server.ts:**
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@cardtrail/shared-types/database';

export function createClient() {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
}
```

**Test Supabase connection:**
```typescript
// app/page.tsx
import { createClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const supabase = createClient();
  
  // Test query: Get first 10 cards from card_jp
  const { data: cards, error } = await supabase
    .from('card_jp')
    .select('id, card_name, card_index, set_name, rarity')
    .limit(10);
  
  if (error) {
    return <div>Error: {error.message}</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">CardTrail</h1>
      <div className="grid gap-4">
        {cards?.map((card) => (
          <div key={card.id} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">{card.card_name}</h2>
              <p>{card.set_name} - {card.card_index}</p>
              <p className="badge badge-primary">{card.rarity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Install shadcn/ui + DaisyUI

**Install dependencies:**
```bash
cd apps/web
pnpm add -D daisyui@latest
pnpm dlx shadcn-ui@latest init
```

**Configure Tailwind (tailwind.config.ts):**
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['light', 'dark', 'cupcake'],
    base: true,
    styled: true,
    utils: true,
  },
};

export default config;
```

**Install base components:**
```bash
pnpm dlx shadcn-ui@latest add button
pnpm dlx shadcn-ui@latest add input
pnpm dlx shadcn-ui@latest add card
pnpm dlx shadcn-ui@latest add dialog
pnpm dlx shadcn-ui@latest add toast
```

### 4. Create Base Components

**Move shadcn components to packages/ui:**
```bash
cp -r apps/web/components/ui/* packages/ui/src/components/
```

**Create layout components:**
```typescript
// components/layouts/MainLayout.tsx
export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-base-100">
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
```

### 5. Configure Environment

**.env.local:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://dmsvsfsbytemtbbqxqyi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**.env.example:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 6. Deployment

- [ ] Connect GitHub to Vercel
- [ ] Configure environment variables in Vercel
- [ ] Deploy to preview
- [ ] Test preview deployment
- [ ] Verify Supabase connection works

---

## 🏗️ Key Principles

### KISS (Keep It Simple)
- ✅ Use Next.js defaults (App Router, TypeScript)
- ✅ Use shadcn/ui defaults (copy-paste components)
- ✅ Use DaisyUI themes (no custom CSS)
- ❌ No custom webpack config
- ❌ No complex build optimizations yet

### DRY (Don't Repeat Yourself)
- ✅ Shared UI components in packages/ui
- ✅ Shared Supabase client utilities
- ✅ Shared TypeScript types
- ❌ No duplicate component code

### Must Follow
- `planning/frontend-architecture.md` - UI framework patterns
- `planning/agents.md` - Development rules
- TypeScript strict mode
- Mobile-first design
- Supabase anon key (not service role key) on client

---

## 🚀 Step-by-Step Execution

### Step 1: Create Next.js App (1 hour)
- [ ] Run create-next-app in apps/ directory
- [ ] Configure TypeScript and Tailwind
- [ ] Test app runs with `pnpm dev`
- [ ] Update root Taskfile to run web app

### Step 2: Install UI Frameworks (1 hour)
- [ ] Install DaisyUI
- [ ] Configure Tailwind with DaisyUI
- [ ] Install shadcn/ui CLI
- [ ] Add base components (button, input, card, dialog, toast)
- [ ] Test components render

### Step 3: Supabase Integration (2 hours)
- [ ] Install Supabase packages
- [ ] Create client and server utilities
- [ ] Configure environment variables
- [ ] Test connection with card_jp query
- [ ] Verify data returns correctly

### Step 4: Create Base Components (2 hours)
- [ ] Move shadcn components to packages/ui
- [ ] Create MainLayout component
- [ ] Create AuthLayout component
- [ ] Test components in app
- [ ] Make mobile responsive

### Step 5: Testing (1 hour)
- [ ] Test Supabase connection
- [ ] Test UI components render
- [ ] Test mobile responsive (375px)
- [ ] Fix any issues

### Step 6: Deployment (1 hour)
- [ ] Connect to Vercel
- [ ] Configure environment variables
- [ ] Deploy to preview
- [ ] Test preview deployment
- [ ] Commit and push

---

## ✅ Done When

**This task is complete when:**
- [ ] Next.js app running locally
- [ ] Supabase connection working
- [ ] Can query card_jp table
- [ ] shadcn/ui + DaisyUI working
- [ ] Base UI components created
- [ ] Layout components created
- [ ] TypeScript compiles
- [ ] Mobile responsive (375px)
- [ ] Deployed to Vercel preview

**No need for:**
- ❌ Complete feature implementations
- ❌ Authentication (next task)
- ❌ Complex components
- ❌ Perfect styling

---

## 🔗 Related Tasks

**Depends on:**
- Task 01: Monorepo Setup

**Blocks:**
- Task 03: Testing & Dev Tools
- Phase 1, Task 02: Full Authentication Flow

**Related:**
- Phase 2, Task 01: Complete Search Feature (uses UI components)

---

## 📚 Resources

**Planning Documents:**
- `planning/frontend-architecture.md` - UI framework decision
- `planning/architecture-overview.md` - Next.js configuration
- `planning/database-architecture.md` - Supabase setup

**External Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [DaisyUI Documentation](https://daisyui.com)

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
