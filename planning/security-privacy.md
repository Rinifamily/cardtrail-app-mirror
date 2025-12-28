# CardTrail Security & Privacy

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Owner:** Security Team  
**Related Docs:** [Database Architecture](database-architecture.md), [Backend Architecture](backend-architecture.md), [API Design](api-design.md)

---

## 📖 Overview

This document defines the comprehensive security and privacy strategy for CardTrail, a Pokemon TCG price tracking application targeting the Chinese market. Security and privacy are paramount as users trust us with financial data (collection values) and personal information (email, payment details).

### Security Philosophy

**Defense in Depth, Privacy by Design**

We implement multiple layers of security:
1. **Database Level**: Row-Level Security (RLS) policies
2. **API Level**: Authentication, authorization, input validation
3. **Application Level**: CSRF protection, XSS prevention, secure sessions
4. **Infrastructure Level**: HTTPS, secure headers, secrets management

### Why Security Matters for CardTrail

1. **Financial Data**: Users track collection portfolios worth thousands of dollars
2. **Personal Information**: Email addresses, profile data, collection details
3. **Chinese Market**: PIIL (Personal Information Protection Law) compliance required
4. **User Trust**: Security breaches would destroy credibility in TCG community
5. **Data Integrity**: 28,000+ card database must remain accurate and uncorrupted

---

## 🎯 Goals & Philosophy

### Core Security Principles

#### 1. Zero Trust Architecture

**Never trust, always verify:**
- All database queries go through RLS policies
- All API endpoints validate authentication
- All user inputs are validated and sanitized
- No implicit trust based on network location

#### 2. Principle of Least Privilege

**Grant minimum necessary access:**
- Users can only access their own collections
- Service accounts have scoped permissions
- API keys have limited scopes
- Database roles are narrowly defined

#### 3. Defense in Depth

**Multiple security layers:**
```
┌─────────────────────────────────────┐
│ Infrastructure (HTTPS, Firewall)    │
├─────────────────────────────────────┤
│ Application (CSRF, XSS Prevention)  │
├─────────────────────────────────────┤
│ API (Rate Limiting, Auth)           │
├─────────────────────────────────────┤
│ Database (RLS Policies)             │
└─────────────────────────────────────┘
```

#### 4. Privacy by Design

**Privacy first, not an afterthought:**
- Collect only necessary data
- Anonymize analytics where possible
- Clear consent mechanisms
- Easy data deletion
- Transparent privacy policy

---

## 🏗️ Authentication & Authorization

### Supabase Auth Integration

CardTrail uses **Supabase Auth** for authentication, leveraging industry-standard security practices.

#### Authentication Flow

```
┌─────────────┐      1. Sign up/Login     ┌──────────────┐
│   User      ├─────────────────────────>│  Next.js App │
└─────────────┘                           └──────┬───────┘
                                                 │
                                                 │ 2. Validate
                                                 ▼
                                          ┌──────────────┐
                                          │ Supabase Auth│
                                          └──────┬───────┘
                                                 │
                                                 │ 3. Generate JWT
                                                 ▼
┌─────────────┐   4. Set httpOnly cookie  ┌──────────────┐
│   Browser   │<──────────────────────────┤  Next.js App │
└─────────────┘                           └──────────────┘
       │
       │ 5. Subsequent requests include cookie
       ▼
┌─────────────┐                           ┌──────────────┐
│   API Route │──────────────────────────>│  Verify JWT  │
└─────────────┘      6. Validate          └──────────────┘
```

#### Implementation

```typescript
// lib/auth/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@cardtrail/shared-types/database';

export function createServerSupabaseClient() {
  const cookieStore = cookies();
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', options);
        },
      },
    }
  );
}

// lib/auth/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from './server';

export async function requireAuth(req: NextRequest): Promise<{ user: any } | NextResponse> {
  const supabase = createServerSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      { status: 401 }
    );
  }
  
  return { user };
}

// Usage in API route
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  
  // User is authenticated, proceed with handler
  const collections = await getUserCollections(user.id);
  return NextResponse.json({ data: collections });
}
```

#### Password Policy

**Requirements:**
- Minimum 8 characters
- Must contain: uppercase, lowercase, number
- No common passwords (checked via blocklist)
- Password strength meter shown to users
- Passwords hashed with bcrypt (via Supabase)

```typescript
// lib/auth/password-validation.ts
import zxcvbn from 'zxcvbn';

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
  strength: number; // 0-4
} {
  const errors: string[] = [];
  
  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  // Character requirements
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  
  // Strength check
  const result = zxcvbn(password);
  
  if (result.score < 2) {
    errors.push('Password is too weak');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    strength: result.score,
  };
}
```

#### Session Management

**Strategy:**
- JWT tokens stored in httpOnly cookies (not accessible to JavaScript)
- Access token expires after 1 hour
- Refresh token expires after 7 days
- Automatic token refresh on client-side
- Session invalidation on logout

```typescript
// lib/auth/session.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function useSession() {
  const supabase = createClientComponentClient();
  
  // Automatic token refresh
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully');
        }
        if (event === 'SIGNED_OUT') {
          // Clear local state
          router.push('/login');
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
}
```

#### Email Verification

**Flow:**
1. User signs up with email/password
2. Supabase sends verification email
3. User clicks link in email
4. Email is verified, user can log in
5. Unverified users can't access protected features

```typescript
// app/api/v1/auth/signup/route.ts
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  
  const supabase = createServerSupabaseClient();
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`,
    },
  });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  return NextResponse.json({
    message: 'Verification email sent. Please check your inbox.',
  });
}
```

#### Password Reset Flow

```typescript
// app/api/v1/auth/reset-password/route.ts
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/reset-password`,
  });
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  
  // Always return success to prevent email enumeration
  return NextResponse.json({
    message: 'If the email exists, a reset link has been sent.',
  });
}
```

---

## 🏗️ Row-Level Security (RLS)

### RLS Philosophy

**Database-level access control:**
- Every query automatically filtered by RLS policies
- No way to bypass security in application code
- Policies enforced by PostgreSQL, not application logic
- Fail-safe: if no policy exists, access is denied

### RLS Policies for Collections

```sql
-- =====================================================
-- COLLECTIONS TABLE: Private user data
-- =====================================================

-- Enable RLS on collections table
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- Users can view only their own collections
CREATE POLICY "collections_select_policy"
  ON collections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert only their own collections
CREATE POLICY "collections_insert_policy"
  ON collections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own collections
CREATE POLICY "collections_update_policy"
  ON collections
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete only their own collections
CREATE POLICY "collections_delete_policy"
  ON collections
  FOR DELETE
  USING (auth.uid() = user_id);
```

### RLS Policies for Collection Items

```sql
-- =====================================================
-- COLLECTION_ITEMS TABLE: Private user data
-- =====================================================

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Users can view items in their own collections
CREATE POLICY "collection_items_select_policy"
  ON collection_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM collections
      WHERE collections.id = collection_items.collection_id
        AND collections.user_id = auth.uid()
    )
  );

-- Users can add items to their own collections
CREATE POLICY "collection_items_insert_policy"
  ON collection_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM collections
      WHERE collections.id = collection_items.collection_id
        AND collections.user_id = auth.uid()
    )
  );

-- Users can update items in their own collections
CREATE POLICY "collection_items_update_policy"
  ON collection_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM collections
      WHERE collections.id = collection_items.collection_id
        AND collections.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM collections
      WHERE collections.id = collection_items.collection_id
        AND collections.user_id = auth.uid()
    )
  );

-- Users can delete items in their own collections
CREATE POLICY "collection_items_delete_policy"
  ON collection_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM collections
      WHERE collections.id = collection_items.collection_id
        AND collections.user_id = auth.uid()
    )
  );
```

### RLS Policies for Watchlists

```sql
-- =====================================================
-- WATCHLISTS TABLE: Private user data
-- =====================================================

ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

-- Users can manage only their own watchlists
CREATE POLICY "watchlists_all_policy"
  ON watchlists
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### RLS Policies for Public Data

```sql
-- =====================================================
-- CARD_JP TABLE: Public read-only
-- =====================================================

-- Card data is publicly readable
CREATE POLICY "card_jp_select_policy"
  ON card_jp
  FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE for regular users
-- Only service role can modify (via service_role key)

-- =====================================================
-- PRICE_HISTORY TABLE: Public read-only
-- =====================================================

CREATE POLICY "price_history_select_policy"
  ON price_history
  FOR SELECT
  USING (true);

-- =====================================================
-- MARKET_INDICES TABLE: Public read-only
-- =====================================================

CREATE POLICY "market_indices_select_policy"
  ON market_indices
  FOR SELECT
  USING (true);
```

### RLS Policies for User Profiles

```sql
-- =====================================================
-- USER_PROFILES TABLE: Private with selective sharing
-- =====================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "user_profiles_select_own"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public profiles (if profile_public = true)
CREATE POLICY "user_profiles_select_public"
  ON user_profiles
  FOR SELECT
  USING (profile_public = true);

-- Users can insert their own profile (on signup)
CREATE POLICY "user_profiles_insert_policy"
  ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own profile
CREATE POLICY "user_profiles_update_policy"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- USER_SETTINGS TABLE: Private user preferences
-- =====================================================

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_all_policy"
  ON user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRANSACTIONS TABLE: Admin/Service write only
-- =====================================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view transaction history (for market data)
CREATE POLICY "transactions_select_policy"
  ON transactions
  FOR SELECT
  USING (true);

-- Only service role can insert transactions (from eBay API sync)
-- No public INSERT policy - use service_role key

-- =====================================================
-- PRICE_ALERTS TABLE: Private user data
-- =====================================================

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own price alerts
CREATE POLICY "price_alerts_select_policy"
  ON price_alerts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "price_alerts_insert_policy"
  ON price_alerts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "price_alerts_update_policy"
  ON price_alerts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "price_alerts_delete_policy"
  ON price_alerts
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- AUDIT_LOGS TABLE: Admin read-only
-- =====================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "audit_logs_select_own"
  ON audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert audit logs
-- No public INSERT policy - use service_role key
```

### Testing RLS Policies

```typescript
// __tests__/integration/security/rls-policies.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('RLS Policies', () => {
  let adminSupabase: any;
  let user1Supabase: any;
  let user2Supabase: any;
  let user1Id: string;
  let user2Id: string;
  
  beforeEach(async () => {
    // Create admin client
    adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Create User 1
    const { data: { user: u1 } } = await adminSupabase.auth.admin.createUser({
      email: `user1-${Date.now()}@test.com`,
      password: 'TestPass123!',
      email_confirm: true,
    });
    user1Id = u1!.id;
    
    // Create User 2
    const { data: { user: u2 } } = await adminSupabase.auth.admin.createUser({
      email: `user2-${Date.now()}@test.com`,
      password: 'TestPass123!',
      email_confirm: true,
    });
    user2Id = u2!.id;
    
    // Create authenticated clients
    user1Supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error: signIn1Error } = await user1Supabase.auth.signInWithPassword({
      email: u1!.email!,
      password: 'TestPass123!',
    });
    expect(signIn1Error).toBeNull();
    
    user2Supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error: signIn2Error } = await user2Supabase.auth.signInWithPassword({
      email: u2!.email!,
      password: 'TestPass123!',
    });
    expect(signIn2Error).toBeNull();
  });
  
  afterEach(async () => {
    // Cleanup test users
    await adminSupabase.auth.admin.deleteUser(user1Id);
    await adminSupabase.auth.admin.deleteUser(user2Id);
  });
  
  describe('Collections RLS', () => {
    it('should prevent user from viewing another user\'s collections', async () => {
      // User 1 creates a collection
      const { data: collection } = await user1Supabase
        .from('collections')
        .insert({
          user_id: user1Id,
          card_id: 1,
          quantity: 2,
          purchase_price: 150.00,
          purchase_currency: 'CNY',
          purchase_date: '2024-12-01',
        })
        .select()
        .single();
      
      expect(collection).toBeDefined();
      
      // User 2 tries to view User 1's collection
      const { data, error } = await user2Supabase
        .from('collections')
        .select()
        .eq('id', collection.id);
      
      // RLS should filter it out (returns empty, not error)
      expect(data).toHaveLength(0);
      expect(error).toBeNull();
    });
    
    it('should prevent user from updating another user\'s collection', async () => {
      // User 1 creates a collection
      const { data: collection } = await user1Supabase
        .from('collections')
        .insert({
          user_id: user1Id,
          card_id: 1,
          quantity: 1,
          purchase_price: 100,
          purchase_currency: 'CNY',
          purchase_date: '2024-12-01',
        })
        .select()
        .single();
      
      // User 2 tries to update User 1's collection
      const { data, error } = await user2Supabase
        .from('collections')
        .update({ quantity: 999 })
        .eq('id', collection.id);
      
      // RLS should deny update (0 rows updated)
      expect(data).toHaveLength(0);
      
      // Verify quantity unchanged
      const { data: unchanged } = await user1Supabase
        .from('collections')
        .select()
        .eq('id', collection.id)
        .single();
      
      expect(unchanged.quantity).toBe(1);
    });
    
    it('should prevent user from deleting another user\'s collection', async () => {
      // User 1 creates a collection
      const { data: collection } = await user1Supabase
        .from('collections')
        .insert({
          user_id: user1Id,
          card_id: 1,
          quantity: 1,
          purchase_price: 100,
          purchase_currency: 'CNY',
          purchase_date: '2024-12-01',
        })
        .select()
        .single();
      
      // User 2 tries to delete User 1's collection
      const { error } = await user2Supabase
        .from('collections')
        .delete()
        .eq('id', collection.id);
      
      // RLS should deny delete
      expect(error).toBeNull(); // No error, just 0 rows affected
      
      // Verify collection still exists
      const { data: stillExists } = await user1Supabase
        .from('collections')
        .select()
        .eq('id', collection.id)
        .single();
      
      expect(stillExists).toBeDefined();
    });
  });
  
  describe('Watchlists RLS', () => {
    it('should prevent user from viewing another user\'s watchlists', async () => {
      // User 1 creates a watchlist
      const { data: watchlist } = await user1Supabase
        .from('watchlists')
        .insert({
          user_id: user1Id,
          card_id: 1,
          target_price: 100.00,
          alert_enabled: true,
        })
        .select()
        .single();
      
      // User 2 tries to view it
      const { data } = await user2Supabase
        .from('watchlists')
        .select()
        .eq('id', watchlist.id);
      
      expect(data).toHaveLength(0);
    });
  });
  
  describe('Price Alerts RLS', () => {
    it('should prevent user from managing another user\'s alerts', async () => {
      // User 1 creates a price alert
      const { data: alert } = await user1Supabase
        .from('price_alerts')
        .insert({
          user_id: user1Id,
          card_id: 1,
          alert_type: 'price_drop',
          threshold_price: 50.00,
          notification_method: 'email',
        })
        .select()
        .single();
      
      // User 2 tries to disable it
      const { data, error } = await user2Supabase
        .from('price_alerts')
        .update({ alert_enabled: false })
        .eq('id', alert.id);
      
      expect(data).toHaveLength(0);
      
      // Verify alert still enabled
      const { data: stillEnabled } = await user1Supabase
        .from('price_alerts')
        .select()
        .eq('id', alert.id)
        .single();
      
      expect(stillEnabled.alert_enabled).toBe(true);
    });
  });
  
  describe('Public Data RLS', () => {
    it('should allow all users to view card data', async () => {
      // Both users can view cards
      const { data: user1Cards } = await user1Supabase
        .from('card_jp')
        .select()
        .limit(10);
      
      const { data: user2Cards } = await user2Supabase
        .from('card_jp')
        .select()
        .limit(10);
      
      expect(user1Cards).toHaveLength(10);
      expect(user2Cards).toHaveLength(10);
    });
    
    it('should allow all users to view price history', async () => {
      const { data, error } = await user1Supabase
        .from('price_history')
        .select()
        .eq('card_id', 1)
        .limit(30);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
    
    it('should allow all users to view market indices', async () => {
      const { data, error } = await user1Supabase
        .from('market_indices')
        .select()
        .eq('index_type', 'CTI')
        .limit(30);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });
  
  describe('Audit Logs RLS', () => {
    it('should allow users to view only their own audit logs', async () => {
      // Create audit logs for both users
      await adminSupabase.from('audit_logs').insert([
        {
          user_id: user1Id,
          action: 'collection_created',
          resource_type: 'collection',
        },
        {
          user_id: user2Id,
          action: 'collection_created',
          resource_type: 'collection',
        },
      ]);
      
      // User 1 queries audit logs
      const { data: user1Logs } = await user1Supabase
        .from('audit_logs')
        .select();
      
      // User 2 queries audit logs
      const { data: user2Logs } = await user2Supabase
        .from('audit_logs')
        .select();
      
      // Each user should only see their own logs
      expect(user1Logs?.every(log => log.user_id === user1Id)).toBe(true);
      expect(user2Logs?.every(log => log.user_id === user2Id)).toBe(true);
    });
  });
});
```

---

## 🏗️ API Security

### Input Validation

**ALL API inputs MUST be validated with Zod schemas.**

```typescript
// packages/validations/src/collection.ts
import { z } from 'zod';

export const addCollectionSchema = z.object({
  card_id: z.number().int().positive('Card ID must be positive'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(1000, 'Quantity cannot exceed 1000'),
  purchase_price: z.number().positive('Purchase price must be positive'),
  purchase_currency: z.enum(['CNY', 'USD', 'JPY'], { 
    errorMap: () => ({ message: 'Invalid currency' }) 
  }),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  grading_company: z.enum(['PSA', 'BGS', 'CGC', 'None']).optional(),
  grade: z.number().min(1).max(10).optional(),
  certification_number: z.string().max(50).optional(),
  storage_location: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

// app/api/v1/collections/route.ts
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const body = await req.json();
  
  // Validate with Zod
  const result = addCollectionSchema.safeParse(body);
  
  if (!result.success) {
    return NextResponse.json({
      error: {
        code: 'INVALID_PARAMS',
        message: 'Validation failed',
        details: result.error.errors,
      },
    }, { status: 400 });
  }
  
  // Proceed with validated data
  const validatedData = result.data;
  
  // Insert into database
  const { data: collection, error } = await supabase
    .from('collections')
    .insert({
      ...validatedData,
      user_id: authResult.user.id,
    })
    .select()
    .single();
  
  if (error) {
    return NextResponse.json({
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to create collection',
      },
    }, { status: 500 });
  }
  
  return NextResponse.json({ data: collection }, { status: 201 });
}
```

### Rate Limiting

**Prevent abuse with Upstash Redis rate limiting.**

```typescript
// lib/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limiters for different endpoints
export const rateLimiters = {
  // Public endpoints: 100 requests per 15 minutes
  public: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true,
    prefix: 'ratelimit:public',
  }),
  
  // Authenticated endpoints: 1000 requests per 15 minutes
  authenticated: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '15 m'),
    analytics: true,
    prefix: 'ratelimit:authenticated',
  }),
  
  // Write operations: 100 requests per 15 minutes
  write: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true,
    prefix: 'ratelimit:write',
  }),
  
  // Login attempts: 5 attempts per 15 minutes (prevent brute force)
  login: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'ratelimit:login',
  }),
};

// Usage in API route
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown';
  
  const { success, limit, remaining, reset } = await rateLimiters.public.limit(ip);
  
  if (!success) {
    return NextResponse.json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        details: {
          limit,
          remaining,
          reset: new Date(reset).toISOString(),
        },
      },
    }, {
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': reset.toString(),
      },
    });
  }
  
  // Add rate limit headers to response
  const response = NextResponse.json({ data: [] });
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());
  
  return response;
}
```

### CSRF Protection

Next.js provides automatic CSRF protection for POST requests.

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // CSRF token validation for state-changing operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // Verify origin matches host (prevent CSRF)
    if (origin && !origin.includes(host!)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

### XSS Prevention

```typescript
// lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
  });
}

// Usage in components
export function UserBio({ bio }: { bio: string }) {
  const sanitizedBio = sanitizeHtml(bio);
  
  return (
    <div dangerouslySetInnerHTML={{ __html: sanitizedBio }} />
  );
}
```

### SQL Injection Prevention

**Supabase automatically prevents SQL injection via parameterized queries.**

```typescript
// ✅ SAFE: Supabase parameterizes queries
const { data } = await supabase
  .from('card_jp')
  .select()
  .eq('name', userInput); // userInput is safely escaped

// ❌ DANGEROUS: Never use raw SQL with user input
// const { data } = await supabase.rpc('execute_sql', {
//   sql: `SELECT * FROM card_jp WHERE name = '${userInput}'`
// });
```

---

## 🏗️ Data Privacy & PIIL Compliance

### Personal Information Protection Law (PIIL)

China's PIIL is similar to GDPR and requires:
1. **Informed Consent**: Clear explanation of data collection
2. **Data Minimization**: Collect only necessary data
3. **User Rights**: Access, rectification, deletion, portability
4. **Security Safeguards**: Protect personal information
5. **Cross-Border Transfer**: Restrictions on data leaving China

### Privacy Policy

**Must include:**
- What data we collect (email, collection data)
- Why we collect it (authentication, portfolio tracking)
- How long we keep it (active accounts: indefinite, deleted: 30 days)
- User rights (access, delete, export)
- Contact information (support email)

**Template:**

```markdown
## CardTrail Privacy Policy (卡迹隐私政策)

**Last Updated:** December 4, 2025

### 1. Data Collection (数据收集)

We collect the following information:
- **Account Data**: Email address, username
- **Collection Data**: Cards owned, purchase prices, dates
- **Usage Data**: Pages visited, features used (anonymized)

### 2. Purpose (使用目的)

- Authentication and account management
- Portfolio tracking and valuation
- Service improvements

### 3. Data Storage (数据存储)

- Stored in Singapore (Supabase)
- Encrypted at rest and in transit
- Access restricted to authorized personnel

### 4. Your Rights (您的权利)

- **Access**: View your personal data
- **Rectification**: Correct inaccurate data
- **Deletion**: Delete your account and data
- **Portability**: Export your data (CSV)

### 5. Data Retention (数据保留)

- Active accounts: Indefinite
- Deleted accounts: 30-day grace period, then permanent deletion
- Anonymized analytics: 90 days

### 6. Contact (联系方式)

Email: privacy@cardtrail.com
```

### Consent Management

```typescript
// components/CookieConsent.tsx
'use client';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);
  
  const acceptAll = () => {
    localStorage.setItem('cookie-consent', 'all');
    setShowBanner(false);
    
    // Enable analytics
    enableAnalytics();
  };
  
  const acceptEssential = () => {
    localStorage.setItem('cookie-consent', 'essential');
    setShowBanner(false);
    
    // Don't enable analytics
  };
  
  if (!showBanner) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-sm">
          <p className="font-semibold">Cookie Notice (Cookie 通知)</p>
          <p className="text-gray-600">
            We use cookies to improve your experience. 
            我们使用 Cookie 来改善您的体验。
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={acceptEssential}
            className="px-4 py-2 border rounded"
          >
            Essential Only (仅必要)
          </button>
          <button
            onClick={acceptAll}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Accept All (全部接受)
          </button>
        </div>
      </div>
    </div>
  );
}
```

### User Data Rights Implementation

#### 1. Right to Access (PIPL Article 45)

```typescript
// app/api/v1/users/me/data/route.ts
import { createServerSupabaseClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  const supabase = createServerSupabaseClient();
  
  // Gather ALL user data across all tables
  const [
    profile,
    collections,
    watchlists,
    priceAlerts,
    settings,
    auditLogs,
  ] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', user.id).single(),
    supabase.from('collections').select('*, card:card_jp(card_name, card_index, set_name)').eq('user_id', user.id),
    supabase.from('watchlists').select('*, card:card_jp(card_name, card_index)').eq('user_id', user.id),
    supabase.from('price_alerts').select('*').eq('user_id', user.id),
    supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
    supabase.from('audit_logs').select('*').eq('user_id', user.id).order('timestamp', { ascending: false }).limit(100),
  ]);
  
  // Compile complete user data package
  const userData = {
    exported_at: new Date().toISOString(),
    export_version: '1.0',
    user: {
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    profile: profile.data,
    collections: {
      total: collections.data?.length || 0,
      items: collections.data || [],
    },
    watchlists: {
      total: watchlists.data?.length || 0,
      items: watchlists.data || [],
    },
    price_alerts: {
      total: priceAlerts.data?.length || 0,
      items: priceAlerts.data || [],
    },
    settings: settings.data,
    audit_logs: {
      total: auditLogs.data?.length || 0,
      recent_activities: auditLogs.data || [],
      note: 'Showing last 100 activities. Contact support for complete history.',
    },
  };
  
  return NextResponse.json(userData, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="cardtrail-data-${user.id}-${Date.now()}.json"`,
    },
  });
}
```

#### 2. Right to Export (Data Portability - PIIL Article 45)

```typescript
// app/api/v1/users/me/export/route.ts
import { createServerSupabaseClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { stringify } from 'csv-stringify/sync';

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  const supabase = createServerSupabaseClient();
  
  // Get format from query param (json or csv)
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'json';
  
  // Gather all user data
  const [collections, watchlists, priceAlerts] = await Promise.all([
    supabase
      .from('collections')
      .select('*, card:card_jp(id, card_name, card_index, set_name, rarity)')
      .eq('user_id', user.id),
    supabase
      .from('watchlists')
      .select('*, card:card_jp(id, card_name, card_index)')
      .eq('user_id', user.id),
    supabase
      .from('price_alerts')
      .select('*')
      .eq('user_id', user.id),
  ]);
  
  if (format === 'csv') {
    // Export collections as CSV
    const collectionRows = (collections.data || []).map(item => ({
      'Card Name': item.card?.card_name || 'Unknown',
      'Card Number': item.card?.card_index || 'N/A',
      'Set': item.card?.set_name || 'N/A',
      'Quantity': item.quantity,
      'Purchase Price': item.purchase_price,
      'Currency': item.purchase_currency,
      'Purchase Date': item.purchase_date,
      'Grading Company': item.grading_company || 'Raw',
      'Grade': item.grade || 'N/A',
      'Storage Location': item.storage_location || '',
      'Notes': item.notes || '',
      'Added At': item.created_at,
    }));
    
    const csv = stringify(collectionRows, {
      header: true,
      columns: [
        'Card Name',
        'Card Number',
        'Set',
        'Quantity',
        'Purchase Price',
        'Currency',
        'Purchase Date',
        'Grading Company',
        'Grade',
        'Storage Location',
        'Notes',
        'Added At',
      ],
    });
    
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="cardtrail-collection-${Date.now()}.csv"`,
      },
    });
  }
  
  // JSON export (comprehensive)
  const exportData = {
    exported_at: new Date().toISOString(),
    format_version: '1.0',
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    },
    collections: {
      total: collections.data?.length || 0,
      items: collections.data || [],
    },
    watchlists: {
      total: watchlists.data?.length || 0,
      items: watchlists.data || [],
    },
    price_alerts: {
      total: priceAlerts.data?.length || 0,
      items: priceAlerts.data || [],
    },
  };
  
  return NextResponse.json(exportData, {
    headers: {
      'Content-Disposition': `attachment; filename="cardtrail-export-${Date.now()}.json"`,
    },
  });
}
```

#### 3. Right to Deletion (PIIL Article 47)

```typescript
// app/api/v1/users/me/delete/route.ts
import { createServerSupabaseClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { logAuditEvent } from '@/lib/audit-log';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  const supabase = createServerSupabaseClient();
  
  // Soft delete with 30-day grace period (PIIL requirement)
  const deletionDate = new Date();
  const scheduledDeletion = new Date(deletionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Update user profile to mark for deletion
  const { error: profileError } = await supabase
    .from('user_profiles')
    .update({
      deleted_at: deletionDate.toISOString(),
      scheduled_deletion_at: scheduledDeletion.toISOString(),
      deletion_reason: 'user_requested',
    })
    .eq('user_id', user.id);
  
  if (profileError) {
    console.error('Failed to mark user for deletion:', profileError);
    return NextResponse.json({
      error: {
        code: 'DELETION_FAILED',
        message: 'Failed to schedule account deletion',
      },
    }, { status: 500 });
  }
  
  // Anonymize collections (keep for market statistics, remove user link)
  const { error: collectionsError } = await supabase
    .from('collections')
    .update({ 
      user_id: '00000000-0000-0000-0000-000000000000', // Anonymous placeholder
      anonymized_at: deletionDate.toISOString(),
    })
    .eq('user_id', user.id);
  
  // Immediately delete watchlists (not needed for statistics)
  await supabase
    .from('watchlists')
    .delete()
    .eq('user_id', user.id);
  
  // Immediately delete price alerts
  await supabase
    .from('price_alerts')
    .delete()
    .eq('user_id', user.id);
  
  // Disable user settings (prevent access)
  await supabase
    .from('user_settings')
    .update({ 
      account_disabled: true,
      disabled_at: deletionDate.toISOString(),
    })
    .eq('user_id', user.id);
  
  // Log audit event
  await logAuditEvent({
    user_id: user.id,
    action: 'account_deletion_requested',
    resource_type: 'user_account',
    resource_id: user.id,
    metadata: {
      deletion_date: deletionDate.toISOString(),
      scheduled_deletion: scheduledDeletion.toISOString(),
    },
    ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
    user_agent: req.headers.get('user-agent') ?? 'unknown',
  });
  
  // Sign out user immediately
  await supabase.auth.signOut();
  
  // Send confirmation email
  await sendDeletionConfirmationEmail(user.email!, scheduledDeletion);
  
  return NextResponse.json({
    status: 'scheduled',
    message: 'Your account has been scheduled for deletion',
    scheduled_deletion_at: scheduledDeletion.toISOString(),
    grace_period_days: 30,
    cancellation_url: `${process.env.NEXT_PUBLIC_BASE_URL}/account/cancel-deletion`,
  }, { status: 200 });
}

// Helper: Send deletion confirmation email
async function sendDeletionConfirmationEmail(email: string, deletionDate: Date) {
  // Implementation would use your email service (SendGrid, Resend, etc.)
  const emailContent = {
    to: email,
    subject: 'Account Deletion Scheduled - CardTrail',
    html: `
      <h1>Account Deletion Scheduled</h1>
      <p>Your CardTrail account has been scheduled for deletion.</p>
      <p><strong>Deletion Date:</strong> ${deletionDate.toLocaleDateString('zh-CN')}</p>
      <p>You have 30 days to cancel this request.</p>
      <p><a href="${process.env.NEXT_PUBLIC_BASE_URL}/account/cancel-deletion">Cancel Deletion</a></p>
    `,
  };
  
  // Send via email service
  // await emailService.send(emailContent);
}
```

```typescript
// app/api/v1/users/me/cancel-deletion/route.ts
import { createServerSupabaseClient } from '@/lib/auth/server';
import { requireAuth } from '@/lib/auth/middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  const { user } = authResult;
  const supabase = createServerSupabaseClient();
  
  // Cancel deletion
  const { error } = await supabase
    .from('user_profiles')
    .update({
      deleted_at: null,
      scheduled_deletion_at: null,
      deletion_reason: null,
    })
    .eq('user_id', user.id)
    .not('deleted_at', 'is', null); // Only if actually scheduled for deletion
  
  if (error) {
    return NextResponse.json({
      error: {
        code: 'CANCELLATION_FAILED',
        message: 'Failed to cancel account deletion',
      },
    }, { status: 500 });
  }
  
  // Re-enable account
  await supabase
    .from('user_settings')
    .update({
      account_disabled: false,
      disabled_at: null,
    })
    .eq('user_id', user.id);
  
  return NextResponse.json({
    status: 'cancelled',
    message: 'Account deletion has been cancelled',
  });
}
```

#### 4. Permanent Deletion (Cron Job)

```typescript
// app/api/internal/cleanup-deleted-users/route.ts
export async function POST(req: NextRequest) {
  // Verify internal API key
  const apiKey = req.headers.get('X-Internal-API-Key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  const now = new Date();
  
  // Find users scheduled for deletion
  const { data: usersToDelete } = await supabase
    .from('user_profiles')
    .select('user_id')
    .not('deleted_at', 'is', null)
    .lte('scheduled_deletion_at', now.toISOString());
  
  if (!usersToDelete || usersToDelete.length === 0) {
    return NextResponse.json({ deleted: 0 });
  }
  
  // Permanently delete users
  for (const user of usersToDelete) {
    // Delete user profile
    await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', user.user_id);
    
    // Delete auth user
    await supabase.auth.admin.deleteUser(user.user_id);
  }
  
  return NextResponse.json({ deleted: usersToDelete.length });
}

// Cron configuration (vercel.json)
{
  "crons": [{
    "path": "/api/internal/cleanup-deleted-users",
    "schedule": "0 2 * * *"  // Daily at 2 AM
  }]
}
```

---

## 🏗️ Secret Management

### Environment Variables

**NEVER commit secrets to Git.**

```bash
# .env.local (NEVER commit)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx  # Public, safe to expose to client
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx      # CRITICAL: Never expose to client
EBAY_APP_ID=xxxxx
EBAY_DEV_ID=xxxxx
EBAY_CERT_ID=xxxxx
SENTRY_DSN=xxxxx
UPSTASH_REDIS_REST_URL=xxxxx
UPSTASH_REDIS_REST_TOKEN=xxxxx
INTERNAL_API_KEY=xxxxx  # For cron jobs and internal APIs

# .env.example (commit this)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Secret Rotation Policy

**Schedule:**
- **Service Role Keys**: Rotate every 90 days
- **API Keys (eBay, etc.)**: Rotate every 180 days
- **Internal API Keys**: Rotate every 90 days

**Rotation Procedure:**
1. Generate new key in service dashboard
2. Add new key to environment variables
3. Update code to use new key
4. Deploy changes
5. Verify new key works
6. Revoke old key after 7 days grace period

### Vercel Environment Variables

**Configuration:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add secrets with appropriate scope:
   - **Production**: Production-only secrets
   - **Preview**: Staging/PR secrets
   - **Development**: Local development secrets

**Best Practices:**
- Use different keys for each environment
- Never use production keys in development
- Regularly audit who has access to secrets

---

## 🏗️ Frontend Security

### Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-inline
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.ebay.com",
    ].join('; '),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY', // Prevent clickjacking
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff', // Prevent MIME sniffing
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains', // Force HTTPS
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### HTTPS Enforcement

**Vercel automatically provides HTTPS for all deployments.**

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Redirect HTTP to HTTPS (only needed for custom domains)
  const proto = request.headers.get('x-forwarded-proto');
  if (proto === 'http') {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
      301
    );
  }
  
  return NextResponse.next();
}
```

### Dependency Vulnerability Scanning

```bash
# Run npm audit
pnpm audit

# Fix vulnerabilities
pnpm audit fix

# Install Snyk for continuous monitoring
pnpm add -D snyk
pnpm snyk test

# GitHub Dependabot (automatic)
# Enable in repository settings
```

---

## 🏗️ Audit Logging

### Audit Log Schema

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### Audit Logging Implementation

```typescript
// lib/audit-log.ts
interface AuditLogEvent {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export async function logAuditEvent(event: AuditLogEvent) {
  const { error } = await supabase.from('audit_logs').insert({
    ...event,
    timestamp: new Date().toISOString(),
  });
  
  if (error) {
    console.error('Failed to log audit event:', error);
  }
}

// Usage in API routes
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  
  // ... handle request ...
  
  // Log audit event
  await logAuditEvent({
    user_id: authResult.user.id,
    action: 'collection_created',
    resource_type: 'collection',
    resource_id: collection.id,
    metadata: {
      card_id: collection.card_id,
      quantity: collection.quantity,
    },
    ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
    user_agent: req.headers.get('user-agent') ?? 'unknown',
  });
  
  return NextResponse.json({ data: collection });
}
```

### Audit Events to Log

**User Actions:**
- User sign up
- User login
- User logout
- Password change
- Password reset
- Email verification

**Collection Actions:**
- Collection created
- Collection updated
- Collection deleted
- Bulk import

**Security Events:**
- Failed login attempts
- Rate limit exceeded
- Unauthorized access attempts
- API key usage

**Admin Actions:**
- User account suspended
- Data export requested
- Settings changed

### Audit Log Retention

**Policy:**
- Retain logs for 90 days
- Automatically delete logs older than 90 days
- Critical security events retained for 1 year

```sql
-- Cron job to delete old audit logs
CREATE OR REPLACE FUNCTION delete_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '90 days'
    AND action NOT IN ('security_breach', 'unauthorized_access');
  
  -- Keep security events for 1 year
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '1 year'
    AND action IN ('security_breach', 'unauthorized_access');
END;
$$ LANGUAGE plpgsql;
```

---

## 🏗️ Incident Response

### Security Incident Classification

**Severity Levels:**

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P0 (Critical)** | Active breach, data loss | Immediate (< 5 min) | Database exposed, mass data leak |
| **P1 (High)** | Potential breach, RLS bypass | < 30 min | Unauthorized access attempt, SQL injection |
| **P2 (Medium)** | Security vulnerability | < 4 hours | Outdated dependency, weak password policy |
| **P3 (Low)** | Security improvement | Next sprint | Better encryption, additional logging |

### Incident Response Procedures

#### 1. Detection

**How incidents are detected:**
- Sentry alerts (errors, anomalies)
- Supabase logs (failed auth, unusual queries)
- Rate limiter alerts (DDoS attempts)
- User reports (suspicious activity)

#### 2. Containment

**Immediate actions:**
1. **Isolate affected systems**: Temporarily disable affected API endpoints
2. **Revoke compromised credentials**: Rotate API keys, service role keys
3. **Block malicious IPs**: Add to firewall/rate limiter blocklist
4. **Preserve evidence**: Save logs, database snapshots

```typescript
// Emergency: Disable specific API endpoint
export async function POST(req: NextRequest) {
  // Emergency kill switch
  if (process.env.DISABLE_COLLECTION_WRITES === 'true') {
    return NextResponse.json({
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'This feature is temporarily unavailable',
      },
    }, { status: 503 });
  }
  
  // Normal handler...
}
```

#### 3. Investigation

**Questions to answer:**
- What happened? (timeline of events)
- How did it happen? (attack vector)
- What data was affected?
- How many users were impacted?
- Is the breach ongoing?

**Tools:**
- Supabase dashboard (query logs, auth logs)
- Sentry error tracking
- Audit logs
- Server logs (Vercel logs)

#### 4. Remediation

**Steps:**
1. **Fix vulnerability**: Patch code, update dependencies
2. **Restore data**: From backups if necessary
3. **Verify fix**: Test in staging environment
4. **Deploy patch**: To production ASAP
5. **Monitor**: Watch for recurrence

#### 5. Notification

**PIIL Requirement:** Notify affected users within 72 hours.

**Email Template:**

```markdown
Subject: Important Security Update - CardTrail (卡迹)

Dear [User Name],

We are writing to inform you of a security incident that may have affected your account.

**What Happened:**
On [date], we discovered [brief description of incident].

**What Information Was Affected:**
[List affected data types: email addresses, collection data, etc.]

**What We're Doing:**
- [Action 1: e.g., Patched vulnerability]
- [Action 2: e.g., Reset all passwords]
- [Action 3: e.g., Enhanced monitoring]

**What You Should Do:**
- [Recommendation 1: e.g., Change your password]
- [Recommendation 2: e.g., Review your collection data]
- [Recommendation 3: e.g., Enable 2FA when available]

**Questions?**
Contact our support team at security@cardtrail.com

We sincerely apologize for this incident and are committed to protecting your data.

Best regards,
CardTrail Security Team
```

#### 6. Post-Mortem

**Within 7 days of incident:**

```markdown
## Security Incident Post-Mortem

**Incident ID:** INC-2024-001
**Date:** December 4, 2024
**Severity:** P1 (High)

### What Happened
[Timeline of events]

### Root Cause
[Technical explanation]

### Impact
- Users affected: 150
- Data exposed: Email addresses
- Duration: 2 hours

### What Went Well
- Detection was fast (5 minutes)
- Containment was effective
- No sensitive data leaked

### What Could Be Improved
- Need better monitoring for X
- Should have prevented Y
- Communication was slow

### Action Items
- [ ] Implement additional monitoring
- [ ] Rotate all API keys
- [ ] Update security training
- [ ] Add automated security checks

### Lessons Learned
[Key takeaways]
```

---

## ✅ Implementation Checklist

### Authentication & Authorization
- [ ] Implement Supabase Auth integration
- [ ] Set up email verification flow
- [ ] Create password reset flow
- [ ] Implement session management
- [ ] Add password strength validation
- [ ] Test authentication flows

### Row-Level Security
- [ ] Enable RLS on all user tables
- [ ] Create RLS policies for collections
- [ ] Create RLS policies for watchlists
- [ ] Create RLS policies for user profiles
- [ ] Test RLS policies (can't access other users' data)
- [ ] Document all RLS policies

### API Security
- [ ] Implement input validation with Zod for all endpoints
- [ ] Set up rate limiting with Upstash Redis
- [ ] Add CSRF protection middleware
- [ ] Implement XSS prevention
- [ ] Test API security (try to bypass validation)
- [ ] Document API security patterns

### Data Privacy
- [ ] Create privacy policy page (Chinese + English)
- [ ] Implement cookie consent banner
- [ ] Add user data export API
- [ ] Add account deletion API
- [ ] Set up automatic deletion cron job
- [ ] Test data deletion flow

### Secret Management
- [ ] Move all secrets to environment variables
- [ ] Configure Vercel environment variables
- [ ] Create secret rotation schedule
- [ ] Document secret rotation procedures
- [ ] Audit who has access to secrets

### Monitoring & Logging
- [ ] Set up audit logging
- [ ] Configure Sentry error tracking
- [ ] Create security alert rules
- [ ] Set up log retention policy
- [ ] Test incident detection

### Compliance
- [ ] Review PIIL requirements
- [ ] Update terms of service
- [ ] Add data processing agreements
- [ ] Document compliance procedures
- [ ] Schedule annual compliance audit

---

## 🚨 Common Pitfalls

**Pitfall 1: Exposing Service Role Key to Client**
**Problem:** Anyone can bypass RLS and access all data
**Solution:** Only use service_role key server-side, use anon key on client

```typescript
// ❌ DANGEROUS
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// ✅ SAFE (server-side only)
const supabase = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
```

**Pitfall 2: Trusting User Input**
**Problem:** SQL injection, XSS attacks
**Solution:** Always validate with Zod, sanitize HTML

**Pitfall 3: Weak Password Policy**
**Problem:** Accounts easily compromised
**Solution:** Enforce strong passwords (min 8 chars, complexity)

**Pitfall 4: No Rate Limiting**
**Problem:** DDoS attacks, brute force login attempts
**Solution:** Implement rate limiting on all endpoints

**Pitfall 5: Ignoring Security Updates**
**Problem:** Vulnerable dependencies
**Solution:** Run `pnpm audit` weekly, update dependencies

---

## 📚 References

**External Resources:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [PIIL Official Text (Chinese)](http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

**Internal Documentation:**
- [Database Architecture](database-architecture.md) - RLS policies
- [Backend Architecture](backend-architecture.md) - API authentication
- [API Design](api-design.md) - Endpoint specifications

**Security Tools:**
- [Snyk](https://snyk.io) - Dependency scanning
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [Sentry](https://sentry.io) - Error monitoring

---

## 🔄 Review & Updates

**Review Schedule:** Quarterly (every 3 months)

**Update Triggers:**
- Security incident occurs
- New PIIL regulations
- Major framework update
- Dependency vulnerability discovered
- Team security training

**Quarterly Review Checklist:**
- [ ] Review and rotate secrets
- [ ] Audit RLS policies
- [ ] Check for vulnerable dependencies
- [ ] Review audit logs for anomalies
- [ ] Update security documentation
- [ ] Conduct penetration testing
- [ ] Review incident response procedures

---

**Document Version:** 1.0  
**Created:** December 4, 2025  
**Contributors:** Security Team, Development Team  
**Next Review:** March 4, 2026

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Security & Privacy
