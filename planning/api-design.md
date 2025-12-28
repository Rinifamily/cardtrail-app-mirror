# CardTrail API Design Specification

**Document Version:** 2.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Author:** API Architecture Team

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Implementation: Next.js API Routes](#implementation-nextjs-api-routes)
3. [API Conventions](#api-conventions)
4. [Authentication](#authentication)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
6. [Card APIs](#card-apis)
7. [Collection APIs](#collection-apis)
8. [Market APIs](#market-apis)
9. [User APIs](#user-apis)
10. [Internal APIs](#internal-apis)
11. [Webhooks](#webhooks)

---

## Overview

### API Base URL

```
Development:  http://localhost:3000/api/v1
Production:   https://cardtrail.app/api/v1
```

---

## Implementation: Next.js API Routes

### MVP Approach (Phase 0-2)

**All endpoints are implemented as Next.js API Routes.**

**Why Next.js API Routes?**
- ✅ Same codebase as frontend (type-safe)
- ✅ Serverless (auto-scaling, cost-effective)
- ✅ Zero DevOps (Vercel handles deployment)
- ✅ Fast development (hot reload)

**File Structure:**
```
apps/web/app/api/v1/
├── cards/route.ts              → GET/POST /api/v1/cards
├── cards/[id]/route.ts         → GET /api/v1/cards/123
├── collections/route.ts        → GET/POST /api/v1/collections
└── market/indices/route.ts     → GET /api/v1/market/indices
```

**Example Implementation:**
```typescript
// apps/web/app/api/v1/cards/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cardSearchSchema } from '@cardtrail/validations';
import { searchCards } from '@cardtrail/db/queries/cards';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const params = Object.fromEntries(searchParams);
  
  // Validate with Zod
  const result = cardSearchSchema.safeParse(params);
  if (!result.success) {
    return NextResponse.json({
      error: {
        code: 'INVALID_PARAMS',
        message: 'Validation failed',
        details: result.error.errors
      }
    }, { status: 400 });
  }
  
  // Query database
  const cards = await searchCards(result.data);
  
  return NextResponse.json({ data: cards });
}
```

**📖 See [backend-architecture.md](backend-architecture.md) for complete patterns.**

### API Versioning

All APIs are versioned via URL path:
- **Current Version**: v1 (`/api/v1/...`)
- **Version Strategy**: Major versions in path, minor/patch via headers
- **Deprecation Policy**: 6 months notice, maintain backward compatibility

### Supported Methods

| Method | Usage |
|--------|-------|
| `GET` | Retrieve resources |
| `POST` | Create resources |
| `PATCH` | Partially update resources |
| `DELETE` | Delete resources (soft delete when possible) |
| `OPTIONS` | CORS preflight |

### Content Types

- **Request**: `application/json` (default), `multipart/form-data` (file uploads)
- **Response**: `application/json` (always)

---

## API Conventions

### RESTful URL Design

```
✅ Good:
GET    /api/v1/cards
GET    /api/v1/cards/:id
POST   /api/v1/collections
PATCH  /api/v1/collections/:id

❌ Bad:
GET    /api/v1/getCards
POST   /api/v1/collection/add
GET    /api/v1/card-details?id=123
```

### Naming Conventions

- **Resources**: Plural nouns (`cards`, `collections`, not `card`, `collection`)
- **URLs**: Kebab-case (`price-history`, not `priceHistory`)
- **JSON Keys**: Snake_case for consistency with database (`card_id`, not `cardId`)
- **Query Params**: Snake_case (`?page=1&per_page=20`)

### Pagination

All list endpoints support pagination:

```typescript
interface PaginationParams {
  page?: number;       // Page number (1-indexed, default: 1)
  per_page?: number;   // Items per page (default: 20, max: 100)
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
```

**Example:**
```
GET /api/v1/cards?page=2&per_page=50
```

### Filtering

Use query parameters for filtering:

```
GET /api/v1/cards?language=jp&rarity=rare_holo&set_id=123
```

### Sorting

```
GET /api/v1/cards?sort_by=name&sort_order=asc
GET /api/v1/collections?sort_by=purchase_date&sort_order=desc
```

### Field Selection (Sparse Fieldsets)

```
GET /api/v1/cards?fields=id,name,image_urls,current_price_psa10
```

---

## Authentication

### Supabase Auth Integration

CardTrail uses **Supabase Auth** with JWT tokens stored in httpOnly cookies.

#### Authentication Flow

```
1. User logs in → POST /api/v1/auth/login
2. Supabase validates credentials
3. Supabase returns JWT + user object
4. JWT stored in httpOnly cookie
5. Subsequent requests include JWT automatically
6. API routes validate JWT via middleware
```

#### Public vs. Protected Endpoints

**Public** (no auth required):
- `GET /api/v1/cards/*` - Card browsing
- `GET /api/v1/market/*` - Market data
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/signup` - Signup

**Protected** (auth required):
- `POST /api/v1/collections` - Add to collection
- `PATCH /api/v1/collections/:id` - Edit collection
- `GET /api/v1/users/me` - Get current user
- `POST /api/v1/watchlists` - Add to watchlist

#### Authentication Header (Alternative)

For mobile apps or external integrations:

```
Authorization: Bearer <JWT_TOKEN>
```

#### Example Middleware

```typescript
// lib/auth/middleware.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function requireAuth() {
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
    throw new Error('Unauthorized');
  }

  return user;
}
```

---

## Error Handling

### Standard Error Response

```typescript
interface ErrorResponse {
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable error message
    details?: any;          // Additional error details (validation errors, etc.)
    request_id?: string;    // For support debugging
  };
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| **200** | OK | Successful GET, PATCH |
| **201** | Created | Successful POST |
| **204** | No Content | Successful DELETE |
| **400** | Bad Request | Invalid parameters, validation errors |
| **401** | Unauthorized | Missing or invalid authentication |
| **403** | Forbidden | Authenticated but not authorized |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicate resource (e.g., card already in collection) |
| **422** | Unprocessable Entity | Semantic validation errors |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server-side errors |
| **503** | Service Unavailable | Maintenance mode |

### Error Codes

```typescript
enum ErrorCode {
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  INVALID_PARAMS = 'INVALID_PARAMS',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resources
  CARD_NOT_FOUND = 'CARD_NOT_FOUND',
  COLLECTION_NOT_FOUND = 'COLLECTION_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  
  // Business Logic
  DUPLICATE_COLLECTION_ENTRY = 'DUPLICATE_COLLECTION_ENTRY',
  INSUFFICIENT_DATA_FOR_PRICE = 'INSUFFICIENT_DATA_FOR_PRICE',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // External APIs
  EBAY_API_ERROR = 'EBAY_API_ERROR',
  
  // Server
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}
```

### Example Error Responses

**400 Bad Request - Validation Error:**
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Validation failed",
    "details": [
      {
        "field": "purchase_price",
        "message": "Must be a positive number"
      },
      {
        "field": "purchase_date",
        "message": "Invalid date format, expected YYYY-MM-DD"
      }
    ]
  }
}
```

**404 Not Found:**
```json
{
  "error": {
    "code": "CARD_NOT_FOUND",
    "message": "Card with ID 99999 not found"
  }
}
```

**429 Rate Limit:**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset_at": "2024-12-04T12:00:00Z"
    }
  }
}
```

---

## Rate Limiting

### Rate Limit Tiers

| Endpoint Type | Limit | Window | Headers |
|--------------|-------|--------|---------|
| **Public (unauthenticated)** | 100 req | 15 min | `X-RateLimit-*` |
| **Authenticated** | 1000 req | 15 min | `X-RateLimit-*` |
| **Write Operations** | 100 req | 15 min | `X-RateLimit-*` |
| **Search** | 300 req | 15 min | `X-RateLimit-*` |

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 998
X-RateLimit-Reset: 1701691200
X-RateLimit-Reset-After: 3600
```

### Rate Limit Response (429)

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset_at": "2024-12-04T13:00:00Z"
    }
  }
}
```

### Implementation

```typescript
// lib/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export const rateLimiters = {
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true
  }),
  
  authenticated: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '15 m'),
    analytics: true
  }),
  
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true
  })
};
```

---

## Card APIs

### 1. Search Cards

**Endpoint:** `GET /api/v1/cards`

**Description:** Search and filter Pokemon cards

**Authentication:** Public (no auth required)

**Query Parameters:**
```typescript
interface CardSearchParams {
  q?: string;              // Search query (card name)
  language?: 'jp' | 'en' | 'cn';
  rarity?: string;         // "rare_holo", "ultra_rare", etc.
  set_id?: number;
  type?: string;           // "Fire", "Water", etc.
  min_price?: number;
  max_price?: number;
  grade?: 'psa10' | 'psa9' | 'psa8' | 'raw';
  sort_by?: 'name' | 'price' | 'popularity' | 'release_date';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}
```

**Response:**
```typescript
interface CardSearchResponse {
  data: Card[];
  pagination: Pagination;
}
```

**Example Request:**
```bash
curl -X GET "https://cardtrail.app/api/v1/cards?q=pikachu&language=jp&rarity=rare_holo&page=1&per_page=20" \
  -H "Content-Type: application/json"
```

**Example Response (200 OK):**
```json
{
  "data": [
    {
      "id": 123,
      "name": "Pikachu",
      "number": "025/165",
      "set_id": 45,
      "rarity": "Rare Holo",
      "language": "jp",
      "image_urls": {
        "small": "https://tcgplayer.com/small.jpg",
        "large": "https://tcgplayer.com/large.jpg"
      },
      "current_price_psa10": 150.00,
      "current_price_raw": 45.00,
      "popularity_score": 95,
      "type": "Lightning",
      "hp": 60,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-12-04T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 156,
    "total_pages": 8,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 2. Get Card by ID

**Endpoint:** `GET /api/v1/cards/:id`

**Description:** Get detailed card information

**Authentication:** Public

**Path Parameters:**
- `id` (number, required): Card ID

**Response:**
```typescript
interface CardDetailResponse {
  data: Card & {
    set?: Set;                    // Joined set information
    price_updated_at?: string;    // Last price update timestamp
    sales_volume_30d?: number;    // 30-day sales volume
  };
}
```

**Example Request:**
```bash
curl -X GET "https://cardtrail.app/api/v1/cards/123" \
  -H "Content-Type: application/json"
```

**Example Response (200 OK):**
```json
{
  "data": {
    "id": 123,
    "name": "Pikachu",
    "number": "025/165",
    "set_id": 45,
    "set": {
      "id": 45,
      "name": "Scarlet & Violet",
      "slug": "scarlet-violet",
      "release_date": "2023-03-31"
    },
    "rarity": "Rare Holo",
    "language": "jp",
    "image_urls": {
      "small": "https://tcgplayer.com/small.jpg",
      "large": "https://tcgplayer.com/large.jpg"
    },
    "current_price_psa10": 150.00,
    "current_price_psa9": 90.00,
    "current_price_raw": 45.00,
    "price_updated_at": "2024-12-04T06:00:00Z",
    "sales_volume_30d": 127,
    "popularity_score": 95,
    "type": "Lightning",
    "hp": 60
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "error": {
    "code": "CARD_NOT_FOUND",
    "message": "Card with ID 99999 not found"
  }
}
```

---

### 3. Get Card Price History

**Endpoint:** `GET /api/v1/cards/:id/price-history`

**Description:** Get historical pricing data for charts

**Authentication:** Public

**Path Parameters:**
- `id` (number, required): Card ID

**Query Parameters:**
```typescript
interface PriceHistoryParams {
  grade?: 'raw' | 'psa8' | 'psa9' | 'psa10' | 'bgs9_5' | 'cgc9_5';
  period?: '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
  start_date?: string;  // YYYY-MM-DD
  end_date?: string;    // YYYY-MM-DD
}
```

**Response:**
```typescript
interface PriceHistoryResponse {
  data: {
    card_id: number;
    grade: string;
    history: Array<{
      date: string;       // YYYY-MM-DD
      price: number;
      sales_count: number;
      lowest_price?: number;
      highest_price?: number;
    }>;
  };
}
```

**Example Request:**
```bash
curl -X GET "https://cardtrail.app/api/v1/cards/123/price-history?grade=psa10&period=6M" \
  -H "Content-Type: application/json"
```

**Example Response (200 OK):**
```json
{
  "data": {
    "card_id": 123,
    "grade": "psa10",
    "history": [
      {
        "date": "2024-06-01",
        "price": 120.00,
        "sales_count": 8,
        "lowest_price": 110.00,
        "highest_price": 135.00
      },
      {
        "date": "2024-06-02",
        "price": 125.00,
        "sales_count": 12,
        "lowest_price": 115.00,
        "highest_price": 140.00
      },
      {
        "date": "2024-12-04",
        "price": 150.00,
        "sales_count": 6,
        "lowest_price": 145.00,
        "highest_price": 160.00
      }
    ]
  }
}
```

---

### 4. Compare Cards

**Endpoint:** `POST /api/v1/cards/compare`

**Description:** Compare pricing and stats of multiple cards

**Authentication:** Public

**Request Body:**
```typescript
interface CompareCardsRequest {
  card_ids: number[];   // Max 5 cards
  grade?: string;       // Default: 'psa10'
  period?: string;      // Default: '1M'
}
```

**Response:**
```typescript
interface CompareCardsResponse {
  data: Array<{
    card: Card;
    current_price: number;
    price_change_percent: number;  // vs. 30 days ago
    price_trend: 'up' | 'down' | 'stable';
  }>;
}
```

**Example Request:**
```bash
curl -X POST "https://cardtrail.app/api/v1/cards/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "card_ids": [123, 456, 789],
    "grade": "psa10",
    "period": "1M"
  }'
```

**Example Response (200 OK):**
```json
{
  "data": [
    {
      "card": {
        "id": 123,
        "name": "Pikachu",
        "image_urls": { "small": "..." }
      },
      "current_price": 150.00,
      "price_change_percent": 12.5,
      "price_trend": "up"
    },
    {
      "card": {
        "id": 456,
        "name": "Charizard",
        "image_urls": { "small": "..." }
      },
      "current_price": 2500.00,
      "price_change_percent": -5.2,
      "price_trend": "down"
    }
  ]
}
```

---

## Collection APIs

### 5. Get User Collections

**Endpoint:** `GET /api/v1/collections`

**Description:** Get current user's card collection

**Authentication:** Required

**Query Parameters:**
```typescript
interface GetCollectionsParams {
  card_id?: number;              // Filter by specific card
  grading_company?: string;
  grade?: number;
  sort_by?: 'purchase_date' | 'current_value' | 'profit_loss';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}
```

**Response:**
```typescript
interface CollectionsResponse {
  data: Array<Collection & {
    card: Card;
    current_value: number;      // Current market value
    profit_loss: number;        // P/L per card
    profit_loss_percent: number;
  }>;
  pagination: Pagination;
}
```

**Example Request:**
```bash
curl -X GET "https://cardtrail.app/api/v1/collections?sort_by=profit_loss&sort_order=desc" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Example Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1001,
      "user_id": "uuid",
      "card_id": 123,
      "card": {
        "id": 123,
        "name": "Pikachu",
        "image_urls": { "small": "..." },
        "current_price_psa10": 150.00
      },
      "quantity": 2,
      "purchase_price": 100.00,
      "purchase_currency": "CNY",
      "purchase_date": "2024-06-01",
      "grading_company": "PSA",
      "grade": 10,
      "certification_number": "12345678",
      "current_value": 150.00,
      "profit_loss": 50.00,
      "profit_loss_percent": 50.0,
      "storage_location": "Binder A - Page 3",
      "notes": "Bought at local card shop",
      "created_at": "2024-06-01T12:00:00Z",
      "updated_at": "2024-12-04T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 45,
    "total_pages": 3,
    "has_next": true,
    "has_prev": false
  }
}
```

---

### 6. Add to Collection

**Endpoint:** `POST /api/v1/collections`

**Description:** Add a card to user's collection

**Authentication:** Required

**Request Body:**
```typescript
interface AddCollectionRequest {
  card_id: number;
  quantity: number;                  // Min: 1, Max: 1000
  purchase_price: number;            // Positive number
  purchase_currency: 'CNY' | 'USD' | 'JPY';
  purchase_date: string;             // YYYY-MM-DD
  grading_company?: 'PSA' | 'BGS' | 'CGC' | null;
  grade?: number | null;             // 1.0 - 10.0
  certification_number?: string;
  condition?: 'Mint' | 'Near Mint' | 'Lightly Played' | 'Played' | 'Damaged';
  storage_location?: string;
  notes?: string;                    // Max 500 chars
}
```

**Response:**
```typescript
interface AddCollectionResponse {
  data: Collection & {
    card: Card;
  };
}
```

**Example Request:**
```bash
curl -X POST "https://cardtrail.app/api/v1/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "card_id": 123,
    "quantity": 1,
    "purchase_price": 100.00,
    "purchase_currency": "CNY",
    "purchase_date": "2024-12-01",
    "grading_company": "PSA",
    "grade": 10,
    "certification_number": "12345678",
    "storage_location": "Safe Box",
    "notes": "Investment piece"
  }'
```

**Example Response (201 Created):**
```json
{
  "data": {
    "id": 1002,
    "user_id": "uuid",
    "card_id": 123,
    "card": {
      "id": 123,
      "name": "Pikachu",
      "image_urls": { "small": "..." }
    },
    "quantity": 1,
    "purchase_price": 100.00,
    "purchase_currency": "CNY",
    "purchase_date": "2024-12-01",
    "grading_company": "PSA",
    "grade": 10,
    "certification_number": "12345678",
    "storage_location": "Safe Box",
    "notes": "Investment piece",
    "created_at": "2024-12-04T10:30:00Z",
    "updated_at": "2024-12-04T10:30:00Z"
  }
}
```

**Error Response (400 Bad Request - Validation):**
```json
{
  "error": {
    "code": "INVALID_PARAMS",
    "message": "Validation failed",
    "details": [
      {
        "field": "purchase_price",
        "message": "Must be a positive number"
      },
      {
        "field": "grade",
        "message": "Grade must be between 1 and 10 when grading_company is specified"
      }
    ]
  }
}
```

---

### 7. Update Collection Entry

**Endpoint:** `PATCH /api/v1/collections/:id`

**Description:** Update a collection entry

**Authentication:** Required (user must own the collection entry)

**Path Parameters:**
- `id` (number, required): Collection entry ID

**Request Body:** (Partial update)
```typescript
interface UpdateCollectionRequest {
  quantity?: number;
  purchase_price?: number;
  storage_location?: string;
  notes?: string;
  is_for_sale?: boolean;
  asking_price?: number;
}
```

**Response:**
```typescript
interface UpdateCollectionResponse {
  data: Collection;
}
```

**Example Request:**
```bash
curl -X PATCH "https://cardtrail.app/api/v1/collections/1002" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "quantity": 2,
    "notes": "Bought another copy",
    "storage_location": "Binder A - Page 5"
  }'
```

**Example Response (200 OK):**
```json
{
  "data": {
    "id": 1002,
    "user_id": "uuid",
    "card_id": 123,
    "quantity": 2,
    "purchase_price": 100.00,
    "notes": "Bought another copy",
    "storage_location": "Binder A - Page 5",
    "updated_at": "2024-12-04T11:00:00Z"
  }
}
```

---

### 8. Delete Collection Entry

**Endpoint:** `DELETE /api/v1/collections/:id`

**Description:** Remove a card from collection (soft delete)

**Authentication:** Required (user must own the entry)

**Path Parameters:**
- `id` (number, required): Collection entry ID

**Response:** 204 No Content

**Example Request:**
```bash
curl -X DELETE "https://cardtrail.app/api/v1/collections/1002" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Example Response:** 204 No Content (empty body)

---

### 9. Get Portfolio Summary

**Endpoint:** `GET /api/v1/collections/summary`

**Description:** Get aggregated portfolio statistics

**Authentication:** Required

**Response:**
```typescript
interface PortfolioSummaryResponse {
  data: {
    total_cards: number;
    unique_cards: number;
    total_invested: number;          // Total amount spent
    current_value: number;           // Current market value
    profit_loss: number;             // P/L amount
    profit_loss_percent: number;     // P/L percentage
    top_holdings: Array<{            // Top 5 cards by value
      card: Card;
      quantity: number;
      current_value: number;
    }>;
    distribution_by_rarity: {
      [rarity: string]: {
        count: number;
        value: number;
      };
    };
    distribution_by_set: {
      [set_name: string]: {
        count: number;
        value: number;
      };
    };
    distribution_by_grade: {
      [grade: string]: {
        count: number;
        value: number;
      };
    };
  };
}
```

**Example Request:**
```bash
curl -X GET "https://cardtrail.app/api/v1/collections/summary" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Example Response (200 OK):**
```json
{
  "data": {
    "total_cards": 127,
    "unique_cards": 85,
    "total_invested": 15000.00,
    "current_value": 18500.00,
    "profit_loss": 3500.00,
    "profit_loss_percent": 23.33,
    "top_holdings": [
      {
        "card": {
          "id": 456,
          "name": "Charizard",
          "image_urls": { "small": "..." }
        },
        "quantity": 1,
        "current_value": 2500.00
      }
    ],
    "distribution_by_rarity": {
      "Ultra Rare": { "count": 12, "value": 8500.00 },
      "Rare Holo": { "count": 35, "value": 6000.00 },
      "Rare": { "count": 40, "value": 2500.00 }
    },
    "distribution_by_set": {
      "Scarlet & Violet": { "count": 25, "value": 5000.00 },
      "Base Set": { "count": 15, "value": 7500.00 }
    },
    "distribution_by_grade": {
      "PSA 10": { "count": 20, "value": 12000.00 },
      "PSA 9": { "count": 30, "value": 4500.00 },
      "Raw": { "count": 77, "value": 2000.00 }
    }
  }
}
```

---

## Market APIs

### 10. Get Market Indices

**Endpoint:** `GET /api/v1/market/indices`

**Description:** Get CTI (CardTrail Index) and sub-indices

**Authentication:** Public

**Query Parameters:**
```typescript
interface MarketIndicesParams {
  index_type?: 'CTI' | 'WOTC' | 'Modern' | 'Japanese' | 'English' | 'ALL';
  period?: '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
  start_date?: string;  // YYYY-MM-DD
  end_date?: string;    // YYYY-MM-DD
}
```

**Response:**
```typescript
interface MarketIndicesResponse {
  data: {
    indices: Array<{
      index_type: string;
      current_value: number;
      change_percent: number;
      change_amount: number;
      history: Array<{
        date: string;
        value: number;
        volume: number;
      }>;
    }>;
  };
}
```

**Example Request:**
```bash
curl -X GET "https://cardtrail.app/api/v1/market/indices?index_type=CTI&period=1M"
```

**Example Response (200 OK):**
```json
{
  "data": {
    "indices": [
      {
        "index_type": "CTI",
        "current_value": 1245.67,
        "change_percent": 5.2,
        "change_amount": 61.32,
        "history": [
          { "date": "2024-11-04", "value": 1184.35, "volume": 125000 },
          { "date": "2024-11-05", "value": 1190.12, "volume": 130000 },
          { "date": "2024-12-04", "value": 1245.67, "volume": 145000 }
        ]
      }
    ]
  }
}
```

---

### 11. Get Market Rankings

**Endpoint:** `GET /api/v1/market/rankings`

**Description:** Get top risers, fallers, most traded cards

**Authentication:** Public

**Query Parameters:**
```typescript
interface MarketRankingsParams {
  type: 'risers' | 'fallers' | 'volume' | 'new_listings';
  period?: '1D' | '7D' | '30D';
  limit?: number;  // Default: 20, Max: 100
  language?: 'jp' | 'en' | 'cn';
  grade?: 'psa10' | 'psa9' | 'psa8' | 'raw';
}
```

**Response:**
```typescript
interface MarketRankingsResponse {
  data: {
    type: string;
    period: string;
    updated_at: string;
    rankings: Array<{
      rank: number;
      card: Card;
      current_price: number;
      change_percent: number;
      change_amount: number;
      sales_volume?: number;  // For volume rankings
    }>;
  };
}
```

**Example Request:**
```bash
curl -X GET "https://cardtrail.app/api/v1/market/rankings?type=risers&period=7D&limit=10"
```

**Example Response (200 OK):**
```json
{
  "data": {
    "type": "risers",
    "period": "7D",
    "updated_at": "2024-12-04T06:00:00Z",
    "rankings": [
      {
        "rank": 1,
        "card": {
          "id": 789,
          "name": "Umbreon VMAX",
          "image_urls": { "small": "..." },
          "rarity": "Ultra Rare"
        },
        "current_price": 350.00,
        "change_percent": 45.8,
        "change_amount": 110.00
      },
      {
        "rank": 2,
        "card": {
          "id": 234,
          "name": "Rayquaza VMAX",
          "image_urls": { "small": "..." },
          "rarity": "Secret Rare"
        },
        "current_price": 520.00,
        "change_percent": 38.2,
        "change_amount": 144.00
      }
    ]
  }
}
```

---

### 12. Get Market News

**Endpoint:** `GET /api/v1/market/news`

**Description:** Get curated market news and insights (future feature)

**Authentication:** Public

**Query Parameters:**
```typescript
interface MarketNewsParams {
  category?: 'announcements' | 'price_alerts' | 'trends';
  page?: number;
  per_page?: number;
}
```

**Response:**
```typescript
interface MarketNewsResponse {
  data: Array<{
    id: number;
    title: string;
    summary: string;
    category: string;
    published_at: string;
    image_url?: string;
    url?: string;
  }>;
  pagination: Pagination;
}
```

---

## User APIs

### 13. Get Current User

**Endpoint:** `GET /api/v1/users/me`

**Description:** Get current authenticated user's profile

**Authentication:** Required

**Response:**
```typescript
interface GetUserResponse {
  data: {
    user: User;
    settings: UserSettings;
  };
}
```

**Example Request:**
```bash
curl -X GET "https://cardtrail.app/api/v1/users/me" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Example Response (200 OK):**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "username": "pokemon_master",
      "email": "user@example.com",
      "avatar_url": "https://...",
      "bio": "Pokemon TCG collector since 1999",
      "location": "Shanghai, China",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "settings": {
      "currency": "CNY",
      "language": "zh-CN",
      "theme": "dark",
      "email_notifications": true,
      "price_alert_notifications": true,
      "default_chart_period": "1M",
      "default_grade_view": "PSA10"
    }
  }
}
```

---

### 14. Update User Profile

**Endpoint:** `PATCH /api/v1/users/me`

**Description:** Update current user's profile

**Authentication:** Required

**Request Body:**
```typescript
interface UpdateUserRequest {
  username?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatar_url?: string;
  settings?: Partial<UserSettings>;
}
```

**Response:**
```typescript
interface UpdateUserResponse {
  data: {
    user: User;
    settings: UserSettings;
  };
}
```

**Example Request:**
```bash
curl -X PATCH "https://cardtrail.app/api/v1/users/me" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "bio": "Updated bio",
    "settings": {
      "currency": "USD",
      "theme": "light"
    }
  }'
```

---

### 15. Get Watchlist

**Endpoint:** `GET /api/v1/users/watchlists`

**Description:** Get current user's watchlist

**Authentication:** Required

**Query Parameters:**
```typescript
interface GetWatchlistParams {
  alert_enabled?: boolean;
  page?: number;
  per_page?: number;
}
```

**Response:**
```typescript
interface GetWatchlistResponse {
  data: Array<Watchlist & {
    card: Card;
    current_price: number;
    price_change_percent: number;
    is_below_target: boolean;
  }>;
  pagination: Pagination;
}
```

**Example Response (200 OK):**
```json
{
  "data": [
    {
      "id": 5001,
      "user_id": "uuid",
      "card_id": 123,
      "card": {
        "id": 123,
        "name": "Pikachu",
        "image_urls": { "small": "..." },
        "current_price_psa10": 150.00
      },
      "target_price": 120.00,
      "target_grade": "psa10",
      "alert_enabled": true,
      "current_price": 150.00,
      "price_change_percent": -2.3,
      "is_below_target": false,
      "created_at": "2024-11-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 12,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  }
}
```

---

### 16. Add to Watchlist

**Endpoint:** `POST /api/v1/users/watchlists`

**Description:** Add a card to watchlist

**Authentication:** Required

**Request Body:**
```typescript
interface AddWatchlistRequest {
  card_id: number;
  target_price?: number;
  target_grade?: 'psa10' | 'psa9' | 'psa8' | 'raw';
  alert_enabled?: boolean;  // Default: true
  notes?: string;
}
```

**Response:**
```typescript
interface AddWatchlistResponse {
  data: Watchlist;
}
```

**Example Request:**
```bash
curl -X POST "https://cardtrail.app/api/v1/users/watchlists" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "card_id": 123,
    "target_price": 120.00,
    "target_grade": "psa10",
    "alert_enabled": true,
    "notes": "Buy when price drops"
  }'
```

**Example Response (201 Created):**
```json
{
  "data": {
    "id": 5002,
    "user_id": "uuid",
    "card_id": 123,
    "target_price": 120.00,
    "target_grade": "psa10",
    "alert_enabled": true,
    "notes": "Buy when price drops",
    "created_at": "2024-12-04T11:00:00Z"
  }
}
```

---

### 17. Delete from Watchlist

**Endpoint:** `DELETE /api/v1/users/watchlists/:id`

**Description:** Remove a card from watchlist

**Authentication:** Required

**Path Parameters:**
- `id` (number, required): Watchlist entry ID

**Response:** 204 No Content

**Example Request:**
```bash
curl -X DELETE "https://cardtrail.app/api/v1/users/watchlists/5002" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Internal APIs

### 18. Sync Prices (Cron Job)

**Endpoint:** `POST /api/internal/sync-prices`

**Description:** Trigger price update for all tracked cards (daily cron job)

**Authentication:** Internal API key

**Request Headers:**
```
X-Internal-API-Key: <SECRET_KEY>
```

**Request Body:**
```typescript
interface SyncPricesRequest {
  card_ids?: number[];  // If specified, only sync these cards
  force?: boolean;      // Force update even if recently updated
}
```

**Response:**
```typescript
interface SyncPricesResponse {
  data: {
    started_at: string;
    status: 'queued' | 'processing' | 'completed';
    total_cards: number;
    estimated_duration_seconds: number;
  };
}
```

**Example Request:**
```bash
curl -X POST "https://cardtrail.app/api/internal/sync-prices" \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: <SECRET_KEY>" \
  -d '{
    "force": false
  }'
```

**Example Response (200 OK):**
```json
{
  "data": {
    "started_at": "2024-12-04T06:00:00Z",
    "status": "processing",
    "total_cards": 30000,
    "estimated_duration_seconds": 7200
  }
}
```

---

### 19. eBay Search Proxy (Internal)

**Endpoint:** `GET /api/internal/ebay/search`

**Description:** Internal proxy for eBay API calls (with rate limiting and caching)

**Authentication:** Internal API key

**Query Parameters:**
```typescript
interface EbaySearchParams {
  keywords: string;
  completed?: boolean;  // Search completed listings
  sold?: boolean;       // Only sold items
  category_id?: string;
  min_price?: number;
  max_price?: number;
  limit?: number;
}
```

**Response:** eBay API response (proxied)

---

## Webhooks

### Future: Price Alert Webhooks

**Endpoint:** User-provided URL

**Trigger:** When card price drops below target price

**Payload:**
```typescript
interface PriceAlertWebhook {
  event: 'price_alert';
  timestamp: string;
  data: {
    user_id: string;
    watchlist_id: number;
    card: {
      id: number;
      name: string;
      image_url: string;
    };
    target_price: number;
    current_price: number;
    grade: string;
  };
}
```

---

## API Testing

### Example: Full User Flow

```bash
# 1. Sign up
curl -X POST "https://cardtrail.app/api/v1/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# 2. Login (returns JWT in cookie)
curl -X POST "https://cardtrail.app/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' \
  -c cookies.txt

# 3. Search for cards
curl -X GET "https://cardtrail.app/api/v1/cards?q=pikachu"

# 4. View card details
curl -X GET "https://cardtrail.app/api/v1/cards/123"

# 5. Add to collection (authenticated)
curl -X POST "https://cardtrail.app/api/v1/collections" \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "card_id": 123,
    "quantity": 1,
    "purchase_price": 100.00,
    "purchase_currency": "CNY",
    "purchase_date": "2024-12-01",
    "grading_company": "PSA",
    "grade": 10
  }'

# 6. View portfolio summary
curl -X GET "https://cardtrail.app/api/v1/collections/summary" \
  -b cookies.txt
```

---

## Summary

### API Coverage

✅ **Card APIs**: Search, details, price history, comparison  
✅ **Collection APIs**: CRUD operations, portfolio stats  
✅ **Market APIs**: Indices, rankings, news  
✅ **User APIs**: Profile, settings, watchlists  
✅ **Internal APIs**: Price sync, eBay proxy  

### Key Features

- **RESTful Design**: Consistent URL patterns, HTTP methods
- **Authentication**: Supabase JWT with httpOnly cookies
- **Rate Limiting**: Tiered limits for public/authenticated/write operations
- **Error Handling**: Standardized error responses with codes
- **Pagination**: All list endpoints support pagination
- **Validation**: Zod schemas for request validation
- **Caching**: Strategic caching for performance
- **Security**: Row-Level Security, input validation, rate limiting

### Next Steps

1. **CRITICAL**: Review `agents.md` for AI development guidelines
2. Review `backend-architecture.md` for Next.js API Routes patterns
3. Review `database-architecture.md` for Supabase access patterns
4. Review `feature-breakdown.md` for implementation phases
5. Review `price-algorithm.md` for CT Price calculation details
6. Implement API routes in Next.js `app/api/v1/` directory
7. Write integration tests for critical flows
8. Set up monitoring and logging

---

**Document Status:** ✅ Ready for Implementation  
**Version:** 2.0 (Updated for Next.js API Routes)  
**Last Review:** December 4, 2025  
**Next Review:** After Phase 1 API implementation

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) API Architecture
