/**
 * Internal API: Price Sync Endpoint
 * 
 * Automated endpoint for syncing card prices daily.
 * Triggered by Vercel Cron or manual invocation.
 * 
 * Authentication: x-internal-api-key header (HTTP/2 standard lowercase)
 * 
 * Request:
 *   POST /api/internal/sync-prices
 *   Headers: x-internal-api-key: <secret>
 *   Query: ?limit=100&offset=0&dryRun=true
 * 
 * Response:
 *   {
 *     "status": "completed",
 *     "summary": { totalCards, processed, successful, failed, ... }
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncPrices } from '@/lib/internal/sync-prices';
import { sendSyncSummaryEmail } from '@/lib/internal/email-notifier';

// Disable static optimization for this route
export const dynamic = 'force-dynamic';

// Set max execution time to 5 minutes (Vercel Pro limit)
// Hobby plan is limited to 10 seconds
export const maxDuration = 300;

/**
 * POST /api/internal/sync-prices
 * 
 * Main price sync endpoint
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ============================================
  // Authentication
  // ============================================
  // Use lowercase header for HTTP/2 standard compliance
  const apiKey = req.headers.get('x-internal-api-key');
  const expectedKey = process.env.INTERNAL_API_KEY;

  if (!expectedKey) {
    console.error('[sync-prices] INTERNAL_API_KEY not configured');
    return NextResponse.json(
      { status: 'failed', error: 'API key not configured' },
      { status: 500 }
    );
  }

  if (apiKey !== expectedKey) {
    console.warn('[sync-prices] Unauthorized access attempt');
    return NextResponse.json(
      { status: 'failed', error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // ============================================
  // Parse Query Parameters
  // ============================================
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '1000', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const dryRun = searchParams.get('dryRun') === 'true';

  console.log('[sync-prices] Starting price sync', { limit, offset, dryRun });

  try {
    // ============================================
    // Execute Sync
    // ============================================
    const summary = await syncPrices({ limit, offset, dryRun });

    // ============================================
    // Check Failure Rate
    // ============================================
    const failureRate = summary.processed > 0
      ? (summary.failed / summary.processed) * 100
      : 0;

    if (failureRate > 20) {
      console.error(`[sync-prices] ⚠️ High failure rate: ${failureRate.toFixed(1)}%`);
      // TODO: Send alert to Sentry or monitoring service
    }

    // ============================================
    // Send Email Notification
    // ============================================
    if (!dryRun) {
      await sendSyncSummaryEmail(summary);
    }

    // ============================================
    // Log to Monitoring (Sentry)
    // ============================================
    if (process.env.SENTRY_DSN) {
      // TODO: Send structured log to Sentry
      // Example:
      // Sentry.captureMessage('Price sync completed', {
      //   level: failureRate > 20 ? 'error' : 'info',
      //   extra: summary,
      // });
    }

    // ============================================
    // Return Response
    // ============================================
    const totalDuration = Math.round((Date.now() - startTime) / 1000);

    console.log(`[sync-prices] ✓ Completed in ${totalDuration}s`);

    return NextResponse.json({
      status: 'completed',
      summary: {
        ...summary,
        totalDuration: `${totalDuration}s`,
      },
    });
  } catch (error) {
    // ============================================
    // Error Handling
    // ============================================
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-prices] ✗ Fatal error:', errorMessage);

    // Log to Sentry if configured
    if (process.env.SENTRY_DSN) {
      // TODO: Sentry.captureException(error);
    }

    return NextResponse.json(
      {
        status: 'failed',
        error: errorMessage,
        summary: {
          totalCards: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          duration: '0s',
          errors: [],
        },
      },
      { status: 500 }
    );
  }
}
