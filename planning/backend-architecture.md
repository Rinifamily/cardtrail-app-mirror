# CardTrail Backend Architecture

**Document Version:** 2.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Author:** Backend Architecture Team

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [MVP Strategy: Next.js API Routes](#mvp-strategy-nextjs-api-routes)
3. [API Structure](#api-structure)
4. [Request/Response Patterns](#requestresponse-patterns)
5. [Authentication & Authorization](#authentication--authorization)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Caching Strategy](#caching-strategy)
9. [Future: Phase 3+ Standalone Service](#future-phase-3-standalone-service)

---

## Overview

### Simplified Backend for MVP

**For Phase 0-2 (MVP), CardTrail uses Next.js API Routes instead of a separate backend service.**

**Why?**
1. **Simplicity**: One codebase, one deployment
2. **Type Safety**: Share types between frontend and API
3. **Fast Development**: No CORS, no separate auth
4. **Cost-Effective**: Serverless pricing model
5. **Vercel Integration**: Seamless deployment

**When to split?** Phase 3+ when we need:
- Long-running jobs (>10s timeout)
- Heavy compute (price calculations for 10K+ cards)
- Mobile app with direct API access

---

## MVP Strategy: Next.js API Routes

### What Are API Routes?

Next.js API Routes are **serverless functions** that run on demand:
- Each file in `app/api/` directory becomes an endpoint
- Automatic routing based on file structure
- Server-side execution (access to secrets, database)
- Deployed as serverless functions on Vercel

**Example:**
```
app/api/v1/cards/route.ts       → GET/POST  /api/v1/cards
app/api/v1/cards/[id]/route.ts  → GET/PATCH /api/v1/cards/123
```

### Pros & Cons

**✅ Pros:**
- **Zero DevOps**: No server to manage
- **Auto-scaling**: Handles traffic spikes automatically
- **Cost-effective**: Pay per request
- **Fast development**: Same repo as frontend
- **Type-safe**: Share TypeScript types

**❌ Cons:**
- **Cold starts**: ~1s first request (mitigated with edge functions)
- **10s timeout**: Vercel limit (can upgrade to 60s on Pro)
- **Stateless**: No WebSocket support (use Supabase Realtime)
- **Limited control**: Can't customize server config

**Verdict:** Perfect for MVP. We can migrate to standalone service in Phase 3+ if needed.

---

## API Structure

### Directory Layout

```
apps/web/app/api/
└── v1/                          # API version 1
    ├── cards/
    │   ├── route.ts            # GET  /api/v1/cards (search)
    │   │                        # POST /api/v1/cards (future: admin)
    │   ├── [id]/
    │   │   ├── route.ts        # GET    /api/v1/cards/123
    │   │   │                    # PATCH  /api/v1/cards/123 (future: admin)
    │   │   └── price-history/
    │   │       └── route.ts    # GET /api/v1/cards/123/price-history
    │   └── compare/
    │       └── route.ts        # POST /api/v1/cards/compare
    │
    ├── collections/
    │   ├── route.ts            # GET  /api/v1/collections
    │   │                        # POST /api/v1/collections
    │   ├── [id]/
    │   │   └── route.ts        # PATCH  /api/v1/collections/123
    │   │                        # DELETE /api/v1/collections/123
    │   └── summary/
    │       └── route.ts        # GET /api/v1/collections/summary
    │
    ├── market/
    │   ├── indices/
    │   │   └── route.ts        # GET /api/v1/market/indices
    │   ├── rankings/
    │   │   └── route.ts        # GET /api/v1/market/rankings
    │   └── news/
    │       └── route.ts        # GET /api/v1/market/news
    │
    ├── users/
    │   ├── me/
    │   │   └── route.ts        # GET   /api/v1/users/me
    │   │                        # PATCH /api/v1/users/me
    │   └── watchlists/
    │       ├── route.ts        # GET  /api/v1/users/watchlists
    │       │                    # POST /api/v1/users/watchlists
    │       └── [id]/
    │           └── route.ts    # DELETE /api/v1/users/watchlists/123
    │
    └── internal/                # Protected internal APIs
        ├── sync-prices/
        │   └── route.ts        # POST /api/internal/sync-prices (cron)
        └── ebay/
            └── search/
                └── route.ts    # GET /api/internal/ebay/search
```

### File Structure: route.ts

Each `route.ts` exports HTTP method functions:

```typescript
// app/api/v1/cards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCards } from '@cardtrail/db/queries/cards';
import { cardSearchSchema } from '@cardtrail/validations';

// GET /api/v1/cards
export async function GET(req: NextRequest) {
  try {
    // 1. Extract query params
    const { searchParams } = new URL(req.url);
    const params = Object.fromEntries(searchParams);
    
    // 2. Validate with Zod
    const result = cardSearchSchema.safeParse(params);
    if (!result.success) {
      return NextResponse.json({
        error: {
          code: 'INVALID_PARAMS',
          message: 'Invalid query parameters',
          details: result.error.errors
        }
      }, { status: 400 });
    }
    
    // 3. Fetch data
    const cards = await getCards(result.data);
    
    // 4. Return response
    return NextResponse.json({
      data: cards.data,
      pagination: cards.pagination
    });
    
  } catch (error) {
    console.error('Failed to fetch cards:', error);
    return NextResponse.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch cards'
      }
    }, { status: 500 });
  }
}

// POST /api/v1/cards (future: admin only)
export async function POST(req: NextRequest) {
  // Admin-only endpoint to create cards
  // TODO: Phase 3+
  return NextResponse.json({
    error: { code: 'NOT_IMPLEMENTED', message: 'Not implemented' }
  }, { status: 501 });
}
```

---

## Request/Response Patterns

### Standard Response Format

**Success Response:**
```typescript
interface SuccessResponse<T> {
  data: T;
  pagination?: Pagination; // For list endpoints
}

// Example
{
  "data": {
    "id": 123,
    "name": "Pikachu",
    "current_price_psa10": 150.00
  }
}
```

**Error Response:**
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

// Example
{
  "error": {
    "code": "CARD_NOT_FOUND",
    "message": "Card with ID 99999 not found"
  }
}
```

### Validation Pattern (ALWAYS use Zod)

```typescript
// 1. Define schema in packages/validations
import { z } from 'zod';

export const addCollectionSchema = z.object({
  card_id: z.number().int().positive(),
  quantity: z.number().int().min(1).max(1000),
  purchase_price: z.number().positive()
});

// 2. Validate in API route
import { addCollectionSchema } from '@cardtrail/validations';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = addCollectionSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json({
      error: {
        code: 'INVALID_PARAMS',
        message: 'Validation failed',
        details: result.error.errors
      }
    }, { status: 400 });
  }
  
  // Proceed with validated data
  const data = result.data; // TypeScript knows the type!
}
```

---

## Authentication & Authorization

### Supabase Auth Integration

```typescript
// lib/auth/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@cardtrail/shared-types';

export async function requireAuth(): Promise<User | NextResponse> {
  const cookieStore = cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        }
      }
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    }, { status: 401 });
  }

  return user as User;
}

// Usage in protected route
export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user; // Return error response
  
  // User is authenticated, proceed
  const collections = await getUserCollections(user.id);
  return NextResponse.json({ data: collections });
}
```

### Internal API Protection

```typescript
// lib/auth/internal.ts
export function verifyInternalKey(req: NextRequest): boolean {
  const apiKey = req.headers.get('X-Internal-API-Key');
  return apiKey === process.env.INTERNAL_API_KEY;
}

// Usage in internal route
export async function POST(req: NextRequest) {
  if (!verifyInternalKey(req)) {
    return NextResponse.json({
      error: { code: 'FORBIDDEN', message: 'Invalid API key' }
    }, { status: 403 });
  }
  
  // Proceed with internal operation
  await syncAllPrices();
  return NextResponse.json({ status: 'queued' });
}
```

---

## Error Handling

### Consistent Error Pattern

```typescript
// lib/errors.ts
export class APIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
  }
}

export function handleAPIError(error: unknown): NextResponse {
  if (error instanceof APIError) {
    return NextResponse.json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      }
    }, { status: error.statusCode });
  }
  
  // Unknown error
  console.error('Unexpected error:', error);
  return NextResponse.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  }, { status: 500 });
}

// Usage
export async function GET(req: NextRequest) {
  try {
    const card = await getCardById(123);
    if (!card) {
      throw new APIError('CARD_NOT_FOUND', 'Card not found', 404);
    }
    return NextResponse.json({ data: card });
  } catch (error) {
    return handleAPIError(error);
  }
}
```

---

## Rate Limiting

### Upstash Redis Rate Limiter

```typescript
// lib/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export const rateLimiters = {
  // Public endpoints: 100 requests per 15 minutes
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true
  }),
  
  // Authenticated endpoints: 1000 requests per 15 minutes
  authenticated: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '15 m'),
    analytics: true
  }),
  
  // Write operations: 100 requests per 15 minutes
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true
  })
};

// Usage in API route
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
  const { success, limit, remaining, reset } = await rateLimiters.public.limit(ip);

  if (!success) {
    return NextResponse.json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        details: { limit, remaining, reset }
      }
    }, { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString()
      }
    });
  }

  // Proceed with handler
}
```

---

## Caching Strategy

### Vercel Edge Cache

```typescript
// Cache GET responses at edge
export async function GET(req: NextRequest) {
  const card = await getCardById(123);
  
  return NextResponse.json({ data: card }, {
    headers: {
      // Cache for 1 hour, serve stale for 24 hours while revalidating
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
```

### Next.js Revalidation

```typescript
// app/api/v1/cards/[id]/route.ts
export const revalidate = 3600; // Revalidate every hour

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const card = await getCardById(parseInt(params.id));
  return NextResponse.json({ data: card });
}
```

### Manual Cache Invalidation

```typescript
// lib/cache.ts
import { revalidateTag } from 'next/cache';

export function invalidateCardCache(cardId: number) {
  revalidateTag(`card-${cardId}`);
}

// Usage in mutation
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  await updateCard(parseInt(params.id), data);
  invalidateCardCache(parseInt(params.id));
  return NextResponse.json({ data: updatedCard });
}
```

---

## Future: Phase 3+ Standalone Service

### When to Split?

**Indicators you need a standalone service:**
1. ⚠️ API routes timing out (>10s)
2. ⚠️ Heavy compute workloads (price calculations)
3. ⚠️ Need WebSocket support (real-time features)
4. ⚠️ Mobile app needs direct API access
5. ⚠️ Complex background jobs

### Migration Path

**Phase 3+: Add `apps/api` package**

```
apps/
├── web/                  # Next.js (frontend + light API)
└── api/                  # Fastify (standalone API)
    ├── src/
    │   ├── routes/
    │   │   ├── cards.ts
    │   │   ├── collections.ts
    │   │   └── market.ts
    │   ├── plugins/
    │   │   ├── auth.ts
    │   │   └── rate-limit.ts
    │   └── server.ts
    └── package.json
```

**Fastify Server Example:**

```typescript
// apps/api/src/server.ts
import Fastify from 'fastify';
import { getCardById } from '@cardtrail/db/queries/cards';

const fastify = Fastify({ logger: true });

fastify.get('/api/v1/cards/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const card = await getCardById(parseInt(id));
  
  if (!card) {
    return reply.code(404).send({
      error: { code: 'CARD_NOT_FOUND', message: 'Card not found' }
    });
  }
  
  return { data: card };
});

fastify.listen({ port: 3001, host: '0.0.0.0' });
```

**Deployment:**
- `apps/web` → Vercel (frontend)
- `apps/api` → Fly.io or Railway (backend)

**Benefits:**
- No timeout limits
- Better control over server
- Cheaper for high compute
- WebSocket support

**Costs:**
- More DevOps complexity
- Need to manage CORS
- Separate auth handling
- Higher baseline cost

---

## Summary

### MVP Architecture (Phase 0-2)

✅ **Next.js API Routes** for all backend logic  
✅ **Supabase** for database and auth  
✅ **Serverless** deployment on Vercel  
✅ **Type-safe** with shared TypeScript types  
✅ **Simple** to develop and deploy  

### Phase 3+ Migration (If Needed)

⚠️ **Standalone Fastify service** for heavy compute  
⚠️ **Separate deployment** to Fly.io or Railway  
⚠️ **Keep Next.js API** for frontend-specific endpoints  
⚠️ **Share packages** (`db`, `shared-types`, `validations`)  

### Key Patterns

- **Always validate** with Zod
- **Always rate limit** with Upstash Redis
- **Always authenticate** protected routes
- **Always handle errors** consistently
- **Always cache** GET responses
- **Never expose** secrets in client code

---

**Document Status:** ✅ Ready for Implementation  
**Last Review:** December 4, 2025  
**Next Review:** After MVP launch, before Phase 3

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Backend Architecture
