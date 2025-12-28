# CardTrail Monorepo Architecture

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Author:** Technical Architecture Team

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Package Manager: pnpm](#package-manager-pnpm)
4. [Build Orchestration: Turborepo](#build-orchestration-turborepo)
5. [Package Dependencies](#package-dependencies)
6. [Code Sharing Patterns](#code-sharing-patterns)
7. [Deployment Strategy](#deployment-strategy)
8. [Development Workflow](#development-workflow)

---

## Overview

### Why Monorepo?

CardTrail uses a monorepo architecture to organize code for maximum developer productivity and type safety. A monorepo allows us to:

1. **Share Code Easily**: Types, utilities, UI components shared across apps without npm publish
2. **Atomic Changes**: Update shared code and all consumers in single commit/PR
3. **Type Safety**: TypeScript types flow seamlessly across packages
4. **Simplified Versioning**: No need to manage inter-package versions
5. **Better Tooling**: Single lint/test/build configuration
6. **Faster CI**: Turborepo caches builds, only rebuilds what changed

### When NOT to Use Monorepo

**We're NOT building:**
- Microservices with different languages (we're TypeScript-only)
- Multiple products with different teams (single team, single product)
- Open-source libraries (no need for separate npm packages)

**We ARE building:**
- Single product (CardTrail) with web app + potential mobile app
- Shared types between frontend and backend
- Reusable UI components
- Future: Admin dashboard, API service

---

## Monorepo Structure

### Directory Tree

```
cardtrail-app/
├── apps/
│   ├── web/                    # Next.js web application (Phase 0-2)
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # App-specific components
│   │   ├── public/            # Static assets
│   │   ├── package.json
│   │   └── next.config.js
│   │
│   └── api/                    # Standalone API service (Phase 3+ FUTURE)
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── database.ts    # Database types (generated from Supabase)
│   │   │   ├── api.ts         # API request/response types
│   │   │   ├── domain.ts      # Business logic types (Card, Collection, etc.)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                     # Supabase client wrapper
│   │   ├── src/
│   │   │   ├── client.ts      # Supabase client initialization
│   │   │   ├── queries/       # Reusable database queries
│   │   │   │   ├── cards.ts
│   │   │   │   ├── collections.ts
│   │   │   │   └── users.ts
│   │   │   ├── mutations/     # Database mutations
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ui/                     # Shared UI components (shadcn)
│   │   ├── src/
│   │   │   ├── components/    # Base components (Button, Input, Card)
│   │   │   ├── hooks/         # Shared React hooks
│   │   │   ├── utils/         # UI utilities (cn, formatters)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── validations/            # Zod validation schemas
│   │   ├── src/
│   │   │   ├── card.ts
│   │   │   ├── collection.ts
│   │   │   ├── user.ts
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                 # Shared configuration
│       ├── eslint-config/     # Shared ESLint config
│       ├── tsconfig/          # Shared TypeScript configs
│       │   ├── base.json
│       │   ├── nextjs.json
│       │   └── react.json
│       └── tailwind-config/   # Shared Tailwind config
│
├── supabase/                   # Supabase migrations & functions
│   ├── migrations/            # SQL migration files
│   ├── functions/             # Edge functions
│   └── config.toml
│
├── scripts/                    # Build and deployment scripts
│   ├── generate-types.ts      # Generate types from Supabase
│   ├── seed-database.ts       # Seed test data
│   └── deploy.sh
│
├── .github/
│   └── workflows/             # GitHub Actions CI/CD
│       ├── ci.yml
│       └── deploy.yml
│
├── package.json               # Root package.json (workspaces)
├── pnpm-workspace.yaml        # pnpm workspace configuration
├── turbo.json                 # Turborepo configuration
├── Taskfile.yml               # Task runner configuration
└── README.md
```

### Package Purposes

| Package | Purpose | Consumers | External Dependencies |
|---------|---------|-----------|----------------------|
| **apps/web** | Main Next.js application | End users | Next.js, React, @packages/* |
| **apps/api** | Standalone API (Phase 3+) | Mobile apps, third-party | Fastify, @packages/* |
| **packages/shared-types** | TypeScript types | All packages | None (types only) |
| **packages/db** | Supabase client & queries | apps/web, apps/api | @supabase/supabase-js |
| **packages/ui** | Reusable UI components | apps/web | React, Tailwind |
| **packages/validations** | Zod schemas | All packages | Zod |
| **packages/config** | Shared configs | All packages | ESLint, TypeScript |

---

## Package Manager: pnpm

### Why pnpm?

We chose **pnpm** over npm/yarn for several reasons:

1. **Disk Space Efficiency**: Content-addressable storage (shared across projects)
2. **Installation Speed**: 2-3x faster than npm, faster than yarn
3. **Strict Dependency Resolution**: Only packages in `dependencies` are accessible
4. **Built-in Workspace Support**: First-class monorepo support
5. **Compatibility**: Drop-in replacement for npm (same commands)

### pnpm Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root package.json

```json
{
  "name": "cardtrail-monorepo",
  "private": true,
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "db:types": "pnpm --filter @cardtrail/db generate-types"
  },
  "devDependencies": {
    "@turbo/gen": "^1.11.0",
    "prettier": "^3.1.0",
    "turbo": "^1.11.0",
    "typescript": "^5.3.0"
  }
}
```

### Installing Dependencies

```bash
# Install dependencies for entire monorepo
pnpm install

# Add dependency to specific package
pnpm --filter @cardtrail/web add next
pnpm --filter @cardtrail/ui add react

# Add dev dependency to root
pnpm add -Dw prettier

# Remove dependency
pnpm --filter @cardtrail/web remove lodash
```

### Dependency Rules

1. **External packages**: Install in package where used
2. **Shared packages**: Reference via workspace protocol
3. **Dev tools**: Install at root (ESLint, Prettier, TypeScript)

```json
// apps/web/package.json
{
  "name": "@cardtrail/web",
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "@cardtrail/shared-types": "workspace:*",
    "@cardtrail/db": "workspace:*",
    "@cardtrail/ui": "workspace:*"
  }
}
```

---

## Build Orchestration: Turborepo

### Why Turborepo?

**Turborepo** handles build orchestration and caching:

1. **Intelligent Caching**: Never rebuild what hasn't changed
2. **Parallel Execution**: Build packages concurrently
3. **Task Pipelines**: Define task dependencies
4. **Remote Caching**: Share cache across team/CI (Vercel)
5. **Incremental Adoption**: Works with existing scripts

### turbo.json Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "**/.env.*local",
    "tsconfig.json",
    ".eslintrc.js"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Pipeline Explanation

**Task Dependencies (`dependsOn`):**
- `^build`: Run `build` in dependencies first
- Example: Building `apps/web` will first build `packages/shared-types`, `packages/db`, `packages/ui`

**Caching:**
- `outputs`: Files to cache (build artifacts)
- `cache: false`: Don't cache (for dev server, clean commands)
- `persistent: true`: Long-running tasks (dev servers)

### Build Pipeline Diagram

```
┌─────────────────────────────────────────────┐
│  turbo run build                            │
└───────────────┬─────────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│ Build Shared │  │ Build Config │
│ Types        │  │ Packages     │
└──────┬───────┘  └──────┬───────┘
        │               │
        └───────┬───────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
┌──────────────┐  ┌──────────────┐
│ Build db     │  │ Build ui     │
│ Package      │  │ Package      │
└──────┬───────┘  └──────┬───────┘
        │               │
        └───────┬───────┘
                │
                ▼
        ┌──────────────┐
        │ Build apps/  │
        │ web (Next.js)│
        └──────────────┘
```

### Turborepo Commands

```bash
# Build everything
turbo run build

# Build in parallel with verbose output
turbo run build --parallel --force

# Clear Turborepo cache
turbo run build --force

# Run dev servers (web app only)
turbo run dev --filter=@cardtrail/web

# Run tests for changed packages only
turbo run test --filter=[HEAD^1]

# Check what would be cached
turbo run build --dry-run
```

### Caching Strategy

**Local Cache:**
- Location: `node_modules/.cache/turbo`
- Shared across all developers on same machine

**Remote Cache (Vercel):**
- Share cache across team and CI
- Requires Vercel account
- Enable: `npx turbo login` → `npx turbo link`

```bash
# Enable remote caching
npx turbo login
npx turbo link
```

---

## Package Dependencies

### Dependency Graph

```
apps/web
  ├─→ @cardtrail/shared-types
  ├─→ @cardtrail/db
  │    ├─→ @cardtrail/shared-types
  │    └─→ @supabase/supabase-js
  ├─→ @cardtrail/ui
  │    └─→ @cardtrail/shared-types
  └─→ @cardtrail/validations
       └─→ @cardtrail/shared-types

apps/api (Phase 3+)
  ├─→ @cardtrail/shared-types
  ├─→ @cardtrail/db
  └─→ @cardtrail/validations
```

### Package Boundaries

**Rules:**
1. **Shared types** can have NO dependencies (only types)
2. **DB package** depends on shared-types
3. **UI package** depends on shared-types
4. **Apps** can depend on any package
5. **NO circular dependencies** (enforced by TypeScript)

### Enforcing Boundaries

```json
// packages/shared-types/package.json
{
  "name": "@cardtrail/shared-types",
  "dependencies": {}, // MUST be empty
  "devDependencies": {
    "typescript": "^5.3.0"
  }
}
```

---

## Code Sharing Patterns

### 1. Sharing Types

```typescript
// packages/shared-types/src/domain.ts
export interface Card {
  id: number;
  name: string;
  current_price_psa10: number | null;
  // ...
}

// apps/web/components/CardDisplay.tsx
import { Card } from '@cardtrail/shared-types';

export function CardDisplay({ card }: { card: Card }) {
  return <div>{card.name}</div>;
}
```

### 2. Sharing Database Queries

```typescript
// packages/db/src/queries/cards.ts
import { supabase } from '../client';
import type { Card } from '@cardtrail/shared-types';

export async function getCardById(id: number): Promise<Card | null> {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// apps/web/app/api/v1/cards/[id]/route.ts
import { getCardById } from '@cardtrail/db/queries/cards';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const card = await getCardById(parseInt(params.id));
  return Response.json({ data: card });
}
```

### 3. Sharing UI Components

```typescript
// packages/ui/src/components/Button.tsx
import { forwardRef } from 'react';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', ...props }, ref) => {
    return (
      <button ref={ref} className={cn(buttonVariants[variant])} {...props}>
        {children}
      </button>
    );
  }
);

// apps/web/components/AddToCollectionButton.tsx
import { Button } from '@cardtrail/ui';

export function AddToCollectionButton() {
  return <Button variant="primary">Add to Collection</Button>;
}
```

### 4. Sharing Validations

```typescript
// packages/validations/src/collection.ts
import { z } from 'zod';

export const addCollectionSchema = z.object({
  card_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(1000),
  purchase_price: z.number().positive(),
  purchase_currency: z.enum(['CNY', 'USD', 'JPY']),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

// apps/web/app/api/v1/collections/route.ts
import { addCollectionSchema } from '@cardtrail/validations';

export async function POST(req: Request) {
  const body = await req.json();
  const result = addCollectionSchema.safeParse(body);
  
  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  
  // Proceed with validated data
}
```

---

## Deployment Strategy

### Phase 0-2: Monolithic Deployment

**Single App (apps/web):**
- Deploy entire Next.js app to Vercel
- API routes included in same deployment
- Database: Supabase (separate service)

```
┌──────────────────────────────────┐
│      Vercel Deployment           │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Next.js App (apps/web)    │ │
│  │  • Frontend (App Router)   │ │
│  │  • API Routes (/api/v1/*)  │ │
│  │  • Uses all packages/*     │ │
│  └────────────────────────────┘ │
└──────────────────────────────────┘
           │
           │ Database Connection
           ▼
┌──────────────────────────────────┐
│      Supabase (Database)         │
└──────────────────────────────────┘
```

**Deployment Command:**
```bash
# Vercel automatically detects Next.js
turbo run build --filter=@cardtrail/web
vercel deploy --prod
```

### Phase 3+: Multi-App Deployment

**Separate API Service:**
- `apps/web`: Deploy to Vercel (frontend + some API routes)
- `apps/api`: Deploy to Fly.io or Railway (standalone Fastify API)
- Both share `packages/*` code

```
┌────────────────────┐        ┌────────────────────┐
│  Vercel (Web)      │        │  Fly.io (API)      │
│  • Frontend        │───────>│  • Fastify Server  │
│  • Light API       │  HTTP  │  • Heavy compute   │
│  • Uses packages/* │        │  • Uses packages/* │
└────────────────────┘        └────────────────────┘
           │                            │
           └────────────┬───────────────┘
                        │
                        ▼
                ┌──────────────────┐
                │  Supabase (DB)   │
                └──────────────────┘
```

**Why Split in Phase 3+?**
- Next.js API Routes have 10s timeout on Vercel
- Long-running jobs (price calculation) need standalone service
- Mobile apps can call standalone API directly

---

## Development Workflow

### Getting Started

```bash
# 1. Clone repository
git clone https://github.com/your-org/cardtrail-app.git
cd cardtrail-app

# 2. Install pnpm (if not installed)
npm install -g pnpm

# 3. Install dependencies
pnpm install

# 4. Copy environment variables
cp .env.example .env.local

# 5. Generate database types
pnpm db:types

# 6. Run development server
pnpm dev
```

### Common Commands

```bash
# Development
pnpm dev                          # Start all dev servers
pnpm dev --filter=@cardtrail/web  # Start only web app

# Building
pnpm build                        # Build all apps
pnpm build --filter=@cardtrail/web # Build only web app

# Testing
pnpm test                         # Run all tests
pnpm test --filter=@cardtrail/web # Run web app tests

# Code Quality
pnpm lint                         # Lint all packages
pnpm type-check                   # TypeScript check all packages
pnpm format                       # Format all files with Prettier

# Database
pnpm db:types                     # Generate TypeScript types from Supabase
pnpm db:migrate                   # Run database migrations

# Cleaning
pnpm clean                        # Remove all build artifacts and node_modules
```

### Adding New Package

```bash
# Create new package from template
pnpm turbo gen workspace

# Or manually:
mkdir -p packages/my-package/src
cd packages/my-package

# Create package.json
cat > package.json << EOF
{
  "name": "@cardtrail/my-package",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@cardtrail/tsconfig": "workspace:*"
  }
}
EOF

# Create tsconfig.json
cat > tsconfig.json << EOF
{
  "extends": "@cardtrail/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
EOF

# Install dependencies
pnpm install
```

### Environment Variables

Each app has its own `.env.local`:

```bash
# apps/web/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

EBAY_APP_ID=xxx
EBAY_DEV_ID=xxx
EBAY_CERT_ID=xxx

INTERNAL_API_KEY=xxx
```

**Sharing Environment Variables:**
- Use root `.env.local` for shared variables
- Apps inherit from root
- App-specific variables override root

---

## Best Practices

### DO ✅

1. **Keep packages focused**: Each package has single responsibility
2. **Use workspace protocol**: `"@cardtrail/ui": "workspace:*"`
3. **Generate types from source**: Supabase types from database
4. **Cache aggressively**: Leverage Turborepo caching
5. **Test package boundaries**: No circular dependencies
6. **Document breaking changes**: Update all consumers
7. **Version packages together**: Simplify dependency management

### DON'T ❌

1. **Don't create circular dependencies**: packages/a → packages/b → packages/a
2. **Don't add dependencies to shared-types**: Keep it type-only
3. **Don't bypass Turborepo**: Use `turbo run`, not `pnpm run`
4. **Don't duplicate code**: Move to shared package instead
5. **Don't skip type checking**: Always run `type-check` before commit
6. **Don't ignore build errors**: Fix in shared packages first
7. **Don't commit node_modules**: Always in .gitignore

---

## Troubleshooting

### Common Issues

**Issue: Package not found**
```bash
# Solution: Install from monorepo root
pnpm install
```

**Issue: Type errors after updating shared-types**
```bash
# Solution: Rebuild all packages
turbo run build --force
```

**Issue: Changes not reflected**
```bash
# Solution: Clear Turborepo cache
turbo run dev --force
```

**Issue: pnpm install fails**
```bash
# Solution: Clear pnpm cache
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Summary

### Key Decisions

✅ **Monorepo**: All code in single repository  
✅ **pnpm**: Fast, efficient package manager with workspace support  
✅ **Turborepo**: Intelligent build caching and orchestration  
✅ **Packages**: Shared types, DB client, UI components, validations  
✅ **Single App (Phase 0-2)**: Next.js web app with API routes  
✅ **Future Split (Phase 3+)**: Standalone API service when needed  

### Benefits Realized

- **Type Safety**: TypeScript types shared across all packages
- **Fast Builds**: Turborepo caches unchanged packages
- **Code Reuse**: UI components, DB queries, validations shared
- **Atomic Changes**: Update types and all consumers in single commit
- **Simplified Testing**: Test packages independently

### Next Steps

1. Review `developer-workflow.md` for Taskfile commands
2. Review `agents.md` for AI development guidelines
3. Set up local development environment
4. Generate database types: `pnpm db:types`
5. Start development: `pnpm dev`

---

**Document Status:** ✅ Ready for Implementation  
**Last Review:** December 4, 2025  
**Next Review:** After monorepo setup complete

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Monorepo Architecture
