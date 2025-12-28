# CardTrail Performance & Monitoring

**Document Version:** 1.0  
**Last Updated:** December 4, 2025  
**Status:** Golden Source - Ready for Implementation  
**Owner:** Development Team  
**Related Docs:** [Frontend Architecture](frontend-architecture.md), [Backend Architecture](backend-architecture.md), [Testing Strategy](testing-strategy.md)

---

## 📖 Overview

This document defines the comprehensive performance and monitoring strategy for CardTrail, a Pokemon TCG price tracking application. Performance is critical for CardTrail's success as most users access the app on mobile devices with varying network conditions in China.

### Performance Philosophy

**Speed is a Feature, Not a Nice-to-Have**

We prioritize performance because:
1. **Mobile-First**: 70%+ of users on mobile devices
2. **Network Conditions**: Chinese mobile networks vary greatly
3. **Competitive Advantage**: Fast apps win user loyalty
4. **SEO Rankings**: Google rewards fast sites
5. **Conversion**: Slow apps = users leave

### Why Monitoring Matters

**You can't improve what you don't measure.**

Monitoring enables us to:
- Detect performance regressions before users complain
- Identify bottlenecks in real-world conditions
- Make data-driven optimization decisions
- Alert on incidents before they escalate
- Track improvements over time

---

## 🎯 Performance Targets

### Web Vitals (Core Metrics)

Web Vitals are Google's standardized performance metrics that correlate with user experience.

```
Metric                                Mobile Target    Desktop Target    Current
──────────────────────────────────────────────────────────────────────────────────
First Contentful Paint (FCP)          < 1.8s           < 1.2s            TBD
Largest Contentful Paint (LCP)        < 2.5s           < 2.0s            TBD
Cumulative Layout Shift (CLS)         < 0.1            < 0.1             TBD
First Input Delay (FID)               < 100ms          < 100ms           TBD
Interaction to Next Paint (INP)       < 200ms          < 200ms           TBD
Time to Interactive (TTI)             < 3.8s           < 3.0s            TBD
Total Blocking Time (TBT)             < 300ms          < 200ms           TBD
Speed Index                           < 3.4s           < 2.5s            TBD
```

**Rationale for Mobile Targets:**
- 75th percentile of mobile devices
- 4G network conditions
- Chinese market network speeds

### API Performance Targets

```
Endpoint                              p50       p95       p99       Timeout
────────────────────────────────────────────────────────────────────────────
GET /api/v1/cards (search)           < 100ms   < 300ms   < 500ms   5s
GET /api/v1/cards/:id (details)      < 50ms    < 150ms   < 300ms   5s
GET /api/v1/cards/:id/price-history  < 150ms   < 500ms   < 1s      10s
POST /api/v1/collections             < 100ms   < 200ms   < 400ms   5s
GET /api/v1/collections              < 100ms   < 300ms   < 500ms   5s
GET /api/v1/market/indices           < 100ms   < 200ms   < 400ms   5s
GET /api/v1/market/rankings          < 200ms   < 500ms   < 1s      10s
```

**Timeout Policy:**
- Standard endpoints: 5s
- Heavy computation: 10s
- Background jobs: 30s (cron jobs)

### Database Performance Targets

```
Query Type                            Target      Max Acceptable
────────────────────────────────────────────────────────────────
Single card lookup (by ID)           < 10ms      < 50ms
Card search (with filters)           < 100ms     < 300ms
Price history (1 year)               < 150ms     < 500ms
Collection list (paginated)          < 50ms      < 150ms
Portfolio summary (aggregation)      < 200ms     < 1s
Market index calculation             < 500ms     < 2s
```

### Bundle Size Targets

```
Asset Type                           Target        Max Acceptable
────────────────────────────────────────────────────────────────
First Load JS (homepage)             < 150KB       < 200KB
Per-Page JS (additional)             < 50KB        < 80KB
CSS (total)                          < 30KB        < 50KB
Images (per page)                    < 500KB       < 1MB
Total Page Weight                    < 1MB         < 2MB
```

### Lighthouse Score Targets

```
Category                             Mobile        Desktop
────────────────────────────────────────────────────────
Performance                          ≥ 90          ≥ 95
Accessibility                        ≥ 95          ≥ 95
Best Practices                       ≥ 95          ≥ 95
SEO                                  ≥ 95          ≥ 95
```

---

## 🏗️ Frontend Performance Monitoring

### Vercel Analytics Setup

Vercel Analytics tracks Web Vitals automatically.

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

**What Vercel Analytics Tracks:**
- Web Vitals (LCP, FID, CLS, FCP, TTFB)
- Page load times
- Bounce rate
- Geographic distribution
- Device types (mobile vs desktop)

**Dashboard Access:**
- https://vercel.com/[team]/[project]/analytics

### Web Vitals Reporting

```typescript
// lib/web-vitals.ts
import { onCLS, onFCP, onFID, onLCP, onTTFB, onINP } from 'web-vitals';

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

function sendToAnalytics(metric: WebVitalsMetric) {
  // Send to custom analytics endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...metric,
        page: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }),
      keepalive: true, // Keep request alive even if page unloads
    }).catch(console.error);
  }
}

export function initWebVitals() {
  onCLS(sendToAnalytics);
  onFCP(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onINP(sendToAnalytics);
}

// app/layout.tsx
useEffect(() => {
  initWebVitals();
}, []);
```

### Custom Performance Tracking Utilities

```typescript
// lib/monitoring/performance-tracker.ts
import * as Sentry from '@sentry/nextjs';

export class PerformanceTracker {
  private marks = new Map<string, number>();
  private transactions = new Map<string, any>();
  
  /**
   * Mark the start of an operation
   */
  mark(name: string): void {
    const now = performance.now();
    this.marks.set(name, now);
    
    // Also use native Performance API
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  }
  
  /**
   * Measure duration between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : performance.now();
    
    if (!start) {
      console.warn(`Performance mark "${startMark}" not found`);
      return 0;
    }
    
    const duration = end! - start;
    
    // Create native performance measure
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        // Marks may not exist in native Performance API
      }
    }
    
    // Send to Sentry
    Sentry.setMeasurement(name, duration, 'millisecond');
    
    // Alert if slow
    const threshold = this.getThreshold(name);
    if (duration > threshold) {
      Sentry.captureMessage(`Performance threshold exceeded: ${name}`, {
        level: 'warning',
        tags: {
          metric: name,
          duration: duration.toString(),
          threshold: threshold.toString(),
        },
      });
    }
    
    // Send to custom analytics
    this.sendMetric(name, duration);
    
    return duration;
  }
  
  /**
   * Track an async operation with Sentry transaction
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    options?: { tags?: Record<string, string> }
  ): Promise<T> {
    const transaction = Sentry.startTransaction({
      name,
      op: 'function',
      tags: options?.tags,
    });
    
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      transaction.setStatus('ok');
      transaction.setData('duration', duration);
      transaction.finish();
      
      // Send metric
      Sentry.setMeasurement(name, duration, 'millisecond');
      this.sendMetric(name, duration);
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      transaction.setStatus('internal_error');
      transaction.setData('duration', duration);
      transaction.setData('error', String(error));
      transaction.finish();
      
      // Log slow failures
      if (duration > 1000) {
        Sentry.captureMessage(`Slow operation failed: ${name} (${duration}ms)`, {
          level: 'warning',
          tags: { operation: name },
        });
      }
      
      throw error;
    }
  }
  
  /**
   * Track page load with comprehensive metrics
   */
  trackPageLoad(pageName: string): void {
    if (typeof window === 'undefined' || !('performance' in window)) return;
    
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (!navigation) return;
      
      // Calculate metrics
      const metrics = {
        // DNS & Connection
        dns_time: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp_connect_time: navigation.connectEnd - navigation.connectStart,
        ssl_time: navigation.connectEnd - navigation.secureConnectionStart,
        
        // Request & Response
        ttfb: navigation.responseStart - navigation.fetchStart,
        response_time: navigation.responseEnd - navigation.responseStart,
        
        // Document Processing
        dom_interactive: navigation.domInteractive - navigation.fetchStart,
        dom_content_loaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        dom_complete: navigation.domComplete - navigation.fetchStart,
        load_complete: navigation.loadEventEnd - navigation.fetchStart,
        
        // Resource Sizes
        transfer_size: navigation.transferSize,
        encoded_body_size: navigation.encodedBodySize,
        decoded_body_size: navigation.decodedBodySize,
        
        // Cache
        was_cached: navigation.transferSize === 0,
      };
      
      // Send all metrics to Sentry
      Object.entries(metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          Sentry.setMeasurement(
            `page_${key}`,
            value,
            key.includes('size') ? 'byte' : 'millisecond'
          );
        }
      });
      
      // Set custom tags
      Sentry.setTag('page', pageName);
      Sentry.setTag('cached', String(metrics.was_cached));
      
      // Alert if slow page load
      if (metrics.load_complete > 3000) {
        Sentry.captureMessage(`Slow page load: ${pageName}`, {
          level: 'warning',
          tags: {
            page: pageName,
            load_time: metrics.load_complete.toString(),
          },
          extra: metrics,
        });
      }
      
      // Send to custom analytics
      fetch('/api/analytics/page-load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page: pageName,
          metrics,
          timestamp: Date.now(),
        }),
        keepalive: true,
      }).catch(console.error);
    });
  }
  
  /**
   * Get performance threshold for specific metric
   */
  private getThreshold(metricName: string): number {
    const thresholds: Record<string, number> = {
      'card-search': 300,
      'api-call': 500,
      'database-query': 150,
      'component-render': 100,
      'image-load': 1000,
      'chart-render': 500,
    };
    
    return thresholds[metricName] || 1000; // Default 1s
  }
  
  /**
   * Send metric to analytics
   */
  private sendMetric(name: string, duration: number, metadata?: any): void {
    if (typeof window === 'undefined') return;
    
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: name,
        duration,
        metadata,
        page: window.location.pathname,
        timestamp: Date.now(),
      }),
      keepalive: true,
    }).catch(() => {
      // Silently fail analytics
    });
  }
}

// Global singleton
export const performanceTracker = new PerformanceTracker();

// React hook for easy usage
export function usePerformanceTracker() {
  return performanceTracker;
}
```

#### Usage Examples in Real Components

```typescript
// components/features/search/CardSearchPage.tsx
'use client';

import { usePerformanceTracker } from '@/lib/monitoring/performance-tracker';
import { useEffect, useState } from 'react';

export function CardSearchPage() {
  const tracker = usePerformanceTracker();
  const [results, setResults] = useState<Card[]>([]);
  
  // Track page load
  useEffect(() => {
    tracker.trackPageLoad('search-page');
  }, []);
  
  const handleSearch = async (query: string) => {
    // Track search performance
    const cards = await tracker.measureAsync('card-search', async () => {
      const response = await fetch(`/api/v1/cards?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();
      return data.data;
    }, { tags: { query } });
    
    setResults(cards);
  };
  
  return (
    <div>
      <SearchBar onSearch={handleSearch} />
      <CardGrid cards={results} />
    </div>
  );
}

// components/features/charts/PriceChart.tsx
export function PriceChart({ data }: { data: PriceHistory[] }) {
  const tracker = usePerformanceTracker();
  
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const renderTime = performance.now() - startTime;
      tracker.trackComponentRender('PriceChart', renderTime);
    };
  }, [data]);
  
  return (/* Recharts JSX */);
}
```

### Real User Monitoring (RUM)

```typescript
// lib/rum.ts
interface RUMData {
  page: string;
  loadTime: number;
  ttfb: number;
  domContentLoaded: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connection: string;
  country?: string;
}

export function trackPageLoad() {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('load', () => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    const rumData: RUMData = {
      page: window.location.pathname,
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      ttfb: navigation.responseStart - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      deviceType: getDeviceType(),
      connection: getConnectionType(),
    };
    
    // Send to analytics
    fetch('/api/analytics/rum', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rumData),
      keepalive: true,
    }).catch(console.error);
  });
}

function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getConnectionType(): string {
  // @ts-ignore
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return connection?.effectiveType || 'unknown';
}
```

### Geographic Performance Tracking

**Important for Chinese market:**

```typescript
// lib/geo-performance.ts
export async function trackGeoPerformance() {
  // Get user's location (approximate)
  const response = await fetch('https://ipapi.co/json/');
  const location = await response.json();
  
  // Track performance by region
  fetch('/api/analytics/geo-performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      country: location.country_code,
      city: location.city,
      region: location.region,
      isp: location.org,
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    }),
    keepalive: true,
  }).catch(console.error);
}
```

---

## 🏗️ Backend Performance Monitoring

### Complete Sentry Configuration

#### Client-Side Configuration

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Environment & Release
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Profiling
  profilesSampleRate: 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
  
  // Integrations
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/cardtrail\.app/,
        /^https:\/\/.*\.supabase\.co/,
      ],
      routingInstrumentation: Sentry.nextRouterInstrumentation,
    }),
    new Sentry.Replay({
      maskAllText: true, // Privacy: mask all text
      blockAllMedia: true, // Privacy: block all images/video
      maskAllInputs: true, // Privacy: mask form inputs
    }),
  ],
  
  // Error Filtering
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'chrome-extension://',
    'moz-extension://',
    // React errors that are not actionable
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Network errors
    'NetworkError',
    'Non-Error promise rejection captured',
    'AbortError',
    // Mobile-specific
    'UnhandledRejection: Timeout',
  ],
  
  // beforeSend: Filter and enrich events
  beforeSend(event, hint) {
    // Filter out bot traffic
    const userAgent = event.request?.headers?.['user-agent'] || '';
    if (userAgent.includes('bot') || userAgent.includes('crawler')) {
      return null;
    }
    
    // Add custom context
    event.contexts = {
      ...event.contexts,
      app: {
        deployment_url: process.env.NEXT_PUBLIC_VERCEL_URL,
        deployment_env: process.env.NEXT_PUBLIC_VERCEL_ENV,
      },
    };
    
    // Scrub sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data?.email) {
          breadcrumb.data.email = '[REDACTED]';
        }
        if (breadcrumb.data?.password) {
          breadcrumb.data.password = '[REDACTED]';
        }
        return breadcrumb;
      });
    }
    
    return event;
  },
  
  // beforeBreadcrumb: Filter breadcrumbs
  beforeBreadcrumb(breadcrumb, hint) {
    // Don't log console breadcrumbs in production
    if (breadcrumb.category === 'console' && process.env.NODE_ENV === 'production') {
      return null;
    }
    
    return breadcrumb;
  },
});
```

#### Server-Side Configuration

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  environment: process.env.VERCEL_ENV || 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  // Server-side performance monitoring
  tracesSampleRate: 1.0, // 100% for server-side (lower volume)
  
  // Integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Postgres(),
  ],
  
  // Error Filtering
  ignoreErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
  ],
  
  beforeSend(event) {
    // Scrub sensitive data from server errors
    if (event.request?.data) {
      const data = event.request.data;
      if (typeof data === 'object') {
        delete data.password;
        delete data.api_key;
        delete data.token;
      }
    }
    
    return event;
  },
});
```

#### Next.js Instrumentation

```typescript
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
```

#### Sentry Configuration File

```typescript
// sentry.properties
defaults.url=https://sentry.io/
defaults.org=cardtrail
defaults.project=cardtrail-web
auth.token=[YOUR_AUTH_TOKEN]
```

### API Endpoint Monitoring

```typescript
// lib/monitoring/api-monitor.ts
import * as Sentry from '@sentry/nextjs';

export async function monitorAPICall<T>(
  endpoint: string,
  handler: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const transaction = Sentry.startTransaction({
    name: endpoint,
    op: 'http.server',
  });
  
  try {
    const result = await handler();
    const duration = Date.now() - startTime;
    
    // Track success
    Sentry.addBreadcrumb({
      category: 'api',
      message: `${endpoint} succeeded in ${duration}ms`,
      level: 'info',
      data: { duration },
    });
    
    // Alert if slow (p95 > 1s)
    if (duration > 1000) {
      Sentry.captureMessage(`Slow API call: ${endpoint} took ${duration}ms`, {
        level: 'warning',
        tags: {
          endpoint,
          duration: duration.toString(),
        },
      });
    }
    
    transaction.setStatus('ok');
    transaction.finish();
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Track failure
    Sentry.captureException(error, {
      tags: {
        endpoint,
        duration: duration.toString(),
      },
    });
    
    transaction.setStatus('internal_error');
    transaction.finish();
    
    throw error;
  }
}

// Usage in API route
export async function GET(req: NextRequest) {
  return monitorAPICall('GET /api/v1/cards', async () => {
    const cards = await searchCards(params);
    return NextResponse.json({ data: cards });
  });
}
```

### Database Query Monitoring

```typescript
// lib/monitoring/db-monitor.ts
export async function monitorDBQuery<T>(
  queryName: string,
  query: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await query();
    const duration = Date.now() - startTime;
    
    // Log to Sentry
    Sentry.addBreadcrumb({
      category: 'database',
      message: `Query "${queryName}" completed in ${duration}ms`,
      level: 'info',
      data: { duration },
    });
    
    // Alert if very slow
    if (duration > 500) {
      Sentry.captureMessage(`Slow database query: ${queryName} took ${duration}ms`, {
        level: 'warning',
        tags: {
          query: queryName,
          duration: duration.toString(),
        },
      });
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    Sentry.captureException(error, {
      tags: {
        query: queryName,
        duration: duration.toString(),
      },
    });
    
    throw error;
  }
}

// Usage
export async function getCardById(id: number) {
  return monitorDBQuery('getCardById', async () => {
    const { data, error } = await supabase
      .from('card_jp')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  });
}
```

### Supabase Dashboard Metrics

**Monitor via Supabase Dashboard:**
- Database CPU usage
- Database memory usage
- Connection pool usage
- Query execution time
- Active connections
- Slow queries (> 500ms)

**Alerts:**
- CPU > 80% for 5 minutes → Email + Slack
- Connection pool > 80% → Page on-call engineer
- Slow queries > 10/minute → Investigate

---

## 🏗️ Performance Optimization Strategies

### Next.js Optimizations

#### 1. Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

export function CardImage({ card }: { card: Card }) {
  return (
    <Image
      src={card.image_urls.large}
      alt={card.name}
      width={300}
      height={420}
      loading="lazy"
      placeholder="blur"
      blurDataURL={card.image_urls.small} // Low-res placeholder
      quality={85} // Balance quality vs size
      sizes="(max-width: 768px) 100vw, 300px"
    />
  );
}
```

#### 2. Code Splitting

```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const PriceChart = dynamic(() => import('@/components/PriceChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Don't render on server (chart libraries are heavy)
});

export function CardProfile({ card }: { card: Card }) {
  return (
    <div>
      <CardDetails card={card} />
      <PriceChart cardId={card.id} />
    </div>
  );
}
```

#### 3. Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'latin-ext'], // Don't load unnecessary subsets
  display: 'swap', // Show fallback font while loading
  preload: true,
  variable: '--font-inter',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

#### 4. Static Generation & ISR

```typescript
// Generate static pages for popular cards
export async function generateStaticParams() {
  const popularCards = await getPopularCards(100);
  
  return popularCards.map((card) => ({
    id: card.id.toString(),
  }));
}

// Revalidate every hour
export const revalidate = 3600;

export default async function CardProfilePage({ params }: { params: { id: string } }) {
  const card = await getCardById(parseInt(params.id));
  return <CardProfile card={card} />;
}
```

#### 5. Streaming & Suspense

```typescript
// Stream slow data
import { Suspense } from 'react';

export default async function CardProfilePage({ params }: { params: { id: string } }) {
  const card = await getCardById(parseInt(params.id)); // Fast query
  
  return (
    <div>
      <CardHeader card={card} />
      
      <Suspense fallback={<ChartSkeleton />}>
        <PriceChartAsync cardId={card.id} /> {/* Slow query, streamed */}
      </Suspense>
      
      <Suspense fallback={<TableSkeleton />}>
        <SalesHistoryAsync cardId={card.id} /> {/* Slow query, streamed */}
      </Suspense>
    </div>
  );
}
```

### Database Optimizations

#### 1. Indexes

```sql
-- Card search index
CREATE INDEX idx_card_jp_name_trgm ON card_jp USING GIN (card_name gin_trgm_ops);

-- Collection queries
CREATE INDEX idx_collections_user_id ON collections(user_id);
CREATE INDEX idx_collections_card_id ON collections(card_id);
CREATE INDEX idx_collections_user_card ON collections(user_id, card_id);

-- Price history queries
CREATE INDEX idx_price_history_card_date ON price_history(card_id, date DESC);

-- Partial indexes for common filters
CREATE INDEX idx_watchlists_active 
  ON watchlists(user_id, card_id) 
  WHERE alert_enabled = TRUE;
```

#### 2. Query Optimization

```typescript
// ❌ BAD: N+1 queries
for (const collection of collections) {
  const card = await getCardById(collection.card_id); // N queries
}

// ✅ GOOD: Single query with join
const { data } = await supabase
  .from('collections')
  .select(`
    *,
    card:card_jp(*)
  `)
  .eq('user_id', userId);
```

#### 3. Materialized Views

```sql
-- Precompute portfolio summaries
CREATE MATERIALIZED VIEW portfolio_summaries AS
SELECT
  user_id,
  COUNT(*) as total_cards,
  SUM(quantity) as total_quantity,
  SUM(purchase_price * quantity) as total_invested,
  SUM(
    COALESCE(
      CASE
        WHEN grading_company = 'PSA' AND grade = 10 
          THEN ext.current_price_psa10
        ELSE ext.current_price_raw
      END,
      purchase_price
    ) * quantity
  ) as current_value
FROM collections c
LEFT JOIN card_extensions ext ON c.card_id = ext.card_id
WHERE c.deleted_at IS NULL
GROUP BY user_id;

-- Refresh daily
REFRESH MATERIALIZED VIEW portfolio_summaries;
```

#### 4. Caching Strategy

```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getCachedCard(cardId: number): Promise<Card | null> {
  // Check cache first
  const cached = await redis.get(`card:${cardId}`);
  if (cached) {
    return cached as Card;
  }
  
  // Cache miss - fetch from database
  const card = await getCardById(cardId);
  
  if (card) {
    // Cache for 24 hours
    await redis.set(`card:${cardId}`, card, { ex: 86400 });
  }
  
  return card;
}

// Invalidate cache on update
export async function updateCard(cardId: number, updates: Partial<Card>) {
  await supabase.from('card_jp').update(updates).eq('id', cardId);
  
  // Invalidate cache
  await redis.del(`card:${cardId}`);
}
```

### Bundle Size Optimization

#### 1. Analyze Bundle

```bash
# Install analyzer
pnpm add -D @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... your config
});

# Run analysis
ANALYZE=true pnpm build
```

#### 2. Tree Shaking

```typescript
// ❌ BAD: Imports entire library
import _ from 'lodash';
_.map(array, fn);

// ✅ GOOD: Import only what you need
import map from 'lodash/map';
map(array, fn);
```

#### 3. Remove Unused Dependencies

```bash
# Find unused dependencies
pnpm dlx depcheck

# Remove unused dependencies
pnpm remove unused-package
```

---

## 🏗️ Performance Budget

### Lighthouse CI Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'pnpm start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/search',
        'http://localhost:3000/search/cards/1',
        'http://localhost:3000/collection',
      ],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],
        
        // Sizes
        'resource-summary:script:size': ['error', { maxNumericValue: 300000 }], // 300KB
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 50000 }], // 50KB
        'resource-summary:image:size': ['warn', { maxNumericValue: 500000 }], // 500KB
        'resource-summary:total:size': ['warn', { maxNumericValue: 1000000 }], // 1MB
        
        // Best practices
        'uses-http2': 'error',
        'uses-responsive-images': 'warn',
        'offscreen-images': 'warn',
        'unused-javascript': ['warn', { maxNumericValue: 50000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Check

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build app
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
      
      - name: Run Lighthouse CI
        run: |
          pnpm add -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
      
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-results
          path: .lighthouseci
```

---

## 🏗️ Alerting & Notifications

### Alert Rules

```typescript
// lib/alerting/rules.ts
export const alertRules = {
  // Performance degradation
  slowApiEndpoint: {
    condition: 'p95_response_time > 1000ms',
    severity: 'warning',
    notification: ['slack', 'email'],
    cooldown: 3600, // 1 hour
  },
  
  // Error rate spike
  highErrorRate: {
    condition: 'error_rate > 5%',
    severity: 'critical',
    notification: ['slack', 'pagerduty', 'email'],
    cooldown: 300, // 5 minutes
  },
  
  // Database issues
  slowQueries: {
    condition: 'slow_queries_per_min > 10',
    severity: 'warning',
    notification: ['slack'],
    cooldown: 1800, // 30 minutes
  },
  
  // Infrastructure
  highCpuUsage: {
    condition: 'database_cpu > 80%',
    severity: 'warning',
    notification: ['slack', 'email'],
    cooldown: 1800,
  },
  
  // User experience
  poorWebVitals: {
    condition: 'lcp_p75 > 4000ms',
    severity: 'warning',
    notification: ['slack'],
    cooldown: 86400, // Daily
  },
};
```

### Sentry Alerts

**Configure in Sentry dashboard:**
1. Go to Alerts → Create Alert
2. Set conditions:
   - Error rate > 1% in 5 minutes
   - Response time p95 > 1s
   - New error type detected
3. Set notifications:
   - Slack: #alerts channel
   - Email: dev-team@cardtrail.com
   - PagerDuty: For critical alerts

### Slack Notifications

```typescript
// lib/alerting/slack.ts
export async function sendSlackAlert({
  title,
  message,
  severity,
  metadata,
}: {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metadata?: Record<string, any>;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;
  
  const color = {
    info: '#36a64f',
    warning: '#ff9900',
    error: '#ff0000',
    critical: '#8b0000',
  }[severity];
  
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title,
          text: message,
          fields: metadata
            ? Object.entries(metadata).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              }))
            : [],
          footer: 'CardTrail Monitoring',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }),
  });
}

// Usage
await sendSlackAlert({
  title: 'Slow API Endpoint',
  message: 'GET /api/v1/cards p95 exceeded 1s',
  severity: 'warning',
  metadata: {
    endpoint: '/api/v1/cards',
    p95: '1250ms',
    threshold: '1000ms',
  },
});
```

---

## 🏗️ Performance Dashboard

### Grafana Setup (Optional)

```yaml
# docker-compose.yml
version: '3.8'
services:
  grafana:
    image: grafana/grafana:latest
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards

volumes:
  grafana-data:
```

**Grafana Dashboards:**
1. **Web Vitals Dashboard**
   - LCP trend (past 7 days)
   - FID distribution
   - CLS by page
   - Geographic breakdown

2. **API Performance Dashboard**
   - Request rate
   - Response time (p50, p95, p99)
   - Error rate
   - Top slow endpoints

3. **Database Dashboard**
   - Query execution time
   - Connection pool usage
   - Slow queries
   - Cache hit rate

4. **Infrastructure Dashboard**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

---

## ✅ Implementation Checklist

### Setup
- [ ] Install Vercel Analytics
- [ ] Install Sentry
- [ ] Configure Web Vitals tracking
- [ ] Set up custom performance tracking
- [ ] Configure Lighthouse CI

### Monitoring
- [ ] Implement API endpoint monitoring
- [ ] Implement database query monitoring
- [ ] Set up Real User Monitoring (RUM)
- [ ] Configure geographic performance tracking
- [ ] Create performance dashboard

### Optimization
- [ ] Optimize images with Next.js Image
- [ ] Implement code splitting
- [ ] Configure font optimization
- [ ] Set up static generation & ISR
- [ ] Add database indexes
- [ ] Implement caching strategy
- [ ] Optimize bundle size

### Alerting
- [ ] Configure Sentry alerts
- [ ] Set up Slack notifications
- [ ] Define alert rules
- [ ] Test alert delivery
- [ ] Create on-call rotation

### Documentation
- [ ] Document performance targets
- [ ] Create performance runbook
- [ ] Train team on monitoring tools
- [ ] Schedule quarterly performance review

---

## 🚨 Common Pitfalls

**Pitfall 1: Not Measuring Before Optimizing**
**Problem:** Optimizing the wrong things
**Solution:** Always measure first, optimize high-impact areas

**Pitfall 2: Ignoring Mobile Performance**
**Problem:** Great desktop performance, terrible mobile
**Solution:** Always test on real mobile devices

**Pitfall 3: No Performance Budget**
**Problem:** Bundle size grows unchecked
**Solution:** Set limits and enforce in CI/CD

**Pitfall 4: Over-Optimizing**
**Problem:** Spend weeks optimizing low-impact code
**Solution:** Follow 80/20 rule - focus on biggest wins

**Pitfall 5: Not Monitoring Production**
**Problem:** Performance regressions go unnoticed
**Solution:** Continuous monitoring with alerts

---

## 📚 References

**External Resources:**
- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Sentry Performance](https://docs.sentry.io/product/performance/)
- [Vercel Analytics](https://vercel.com/docs/analytics)

**Internal Documentation:**
- [Frontend Architecture](frontend-architecture.md)
- [Backend Architecture](backend-architecture.md)
- [Testing Strategy](testing-strategy.md)

---

## 🔄 Review & Updates

**Review Schedule:** Monthly

**Update Triggers:**
- Performance targets not met
- New features added
- Framework updates
- User complaints about speed

**Monthly Review Checklist:**
- [ ] Review Web Vitals trends
- [ ] Check for slow API endpoints
- [ ] Identify slow database queries
- [ ] Review bundle size
- [ ] Check alert effectiveness
- [ ] Update performance targets if needed

---

**Document Version:** 1.0  
**Created:** December 4, 2025  
**Contributors:** Development Team  
**Next Review:** January 4, 2026

---

**Built with Agent Cube** 🧊  
**For:** CardTrail (卡迹) Performance & Monitoring
