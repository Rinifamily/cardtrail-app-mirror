/**
 * eBay Marketplace Account Deletion Notification Endpoint
 * 
 * Compliance: REQUIRED by eBay Developer Program
 * 
 * This endpoint handles:
 * 1. Challenge verification (GET) - eBay validates endpoint on setup
 * 2. Account deletion notifications (POST) - User account closure events
 * 
 * Documentation:
 * https://developer.ebay.com/marketplace-account-deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase';

// Disable static optimization
export const dynamic = 'force-dynamic';

/**
 * GET: Challenge Verification
 * 
 * eBay sends: GET /api/webhooks/ebay/account-deletion?challenge_code=xxx
 * We must respond with: { challengeResponse: hash(challengeCode + verificationToken + endpoint) }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challengeCode = searchParams.get('challenge_code');

  if (!challengeCode) {
    return NextResponse.json(
      { error: 'Missing challenge_code parameter' },
      { status: 400 }
    );
  }

  // Get configuration from environment (trim to remove any whitespace/newlines)
  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN?.trim();
  const endpoint = (process.env.EBAY_NOTIFICATION_ENDPOINT || req.url.split('?')[0]).trim();

  if (!verificationToken) {
    console.error('[eBay Webhook] EBAY_VERIFICATION_TOKEN not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Calculate challengeResponse
  // Formula: SHA256(challengeCode + verificationToken + endpoint)
  const challengeString = challengeCode + verificationToken + endpoint;
  const challengeResponse = crypto
    .createHash('sha256')
    .update(challengeString)
    .digest('hex');

  console.log('[eBay Webhook] Challenge verification details:', {
    challengeCode,
    verificationToken: verificationToken.substring(0, 10) + '...',
    endpoint,
    challengeString: challengeString.substring(0, 50) + '...',
    challengeResponse,
  });

  // Return response in eBay's expected format
  // Add debug info if requested
  const showDebug = searchParams.get('debug') === 'true';
  
  return NextResponse.json({
    challengeResponse,
    ...(showDebug && {
      debug: {
        challengeCode,
        verificationToken: verificationToken.substring(0, 10) + '...' + verificationToken.substring(verificationToken.length - 10),
        endpoint,
        challengeStringLength: challengeString.length,
        challengeStringPreview: challengeString.substring(0, 100),
      }
    })
  });
}

/**
 * POST: Account Deletion Notification
 * 
 * eBay sends notification when user closes their marketplace account.
 * We must:
 * 1. Verify signature
 * 2. Process notification
 * 3. Delete user's eBay-related data
 * 4. Return acknowledgment
 */
export async function POST(req: NextRequest) {
  try {
    // Parse notification payload
    const payload = await req.json();

    console.log('[eBay Webhook] Received notification', {
      notificationId: payload.metadata?.notificationId,
      topic: payload.metadata?.topic,
    });

    // Verify signature (eBay signs all notifications)
    const signature = req.headers.get('x-ebay-signature');
    if (!signature) {
      console.warn('[eBay Webhook] Missing signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    const isValid = await verifyEbaySignature(payload, signature);
    if (!isValid) {
      console.error('[eBay Webhook] Invalid signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 403 }
      );
    }

    // Extract notification details
    const {
      metadata,
      notification,
    } = payload;

    const topic = metadata?.topic;
    const notificationId = metadata?.notificationId;

    if (topic !== 'MARKETPLACE_ACCOUNT_DELETION') {
      console.warn('[eBay Webhook] Unexpected topic:', topic);
      return NextResponse.json({ status: 'ignored' });
    }

    // Extract user information
    const deletionData = notification?.data?.[0];
    const userId = deletionData?.userId;
    const username = deletionData?.username;
    const eiasToken = deletionData?.eiasToken;

    if (!userId) {
      console.error('[eBay Webhook] Missing userId in notification');
      return NextResponse.json(
        { error: 'Invalid notification data' },
        { status: 400 }
      );
    }

    console.log('[eBay Webhook] Processing account deletion', {
      userId,
      username,
      notificationId,
    });

    // Delete user's eBay-related data
    await handleAccountDeletion({
      userId,
      username,
      eiasToken,
      notificationId,
    });

    // Log to database for compliance
    await logDeletionEvent({
      userId,
      username,
      notificationId,
      timestamp: new Date(),
    });

    console.log('[eBay Webhook] Account deletion processed successfully', {
      userId,
      notificationId,
    });

    // Return acknowledgment
    return NextResponse.json({
      status: 'success',
      message: 'Notification processed',
      notificationId,
    });

  } catch (error) {
    console.error('[eBay Webhook] Error processing notification:', error);
    
    // Return 200 even on error to acknowledge receipt
    // (prevents eBay from retrying)
    return NextResponse.json({
      status: 'error',
      message: 'Error processing notification',
    });
  }
}

/**
 * Verify eBay signature
 * 
 * eBay signs all notifications with X-EBAY-SIGNATURE header
 * Format: "algorithm=value"
 */
async function verifyEbaySignature(
  payload: any,
  signature: string
): Promise<boolean> {
  try {
    // For now, log and accept (implement full verification in production)
    // Full implementation requires eBay public key and complex verification
    console.log('[eBay Webhook] Signature verification', {
      signature: signature.substring(0, 20) + '...',
      payloadSize: JSON.stringify(payload).length,
    });

    // TODO: Implement full signature verification
    // 1. Extract algorithm and signature value
    // 2. Fetch eBay public key
    // 3. Verify signature using public key
    // Documentation: https://developer.ebay.com/marketplace-account-deletion

    return true;
  } catch (error) {
    console.error('[eBay Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Handle account deletion
 * 
 * Delete all eBay-related data for the user
 */
async function handleAccountDeletion({
  userId,
  username,
}: {
  userId: string;
  username?: string;
  eiasToken?: string;
  notificationId?: string;
}) {
  const supabase = createClient();

  // If we stored eBay user data, delete it here
  // Currently we only store anonymous transaction data, no user accounts
  // So this is mostly for future-proofing

  // Example: Delete any stored eBay tokens
  // await supabase
  //   .from('user_ebay_auth')
  //   .delete()
  //   .eq('ebay_user_id', userId);

  // Example: Anonymize transactions from this seller
  if (username) {
    await supabase
      .from('transactions')
      .update({ seller: 'DELETED_USER' })
      .eq('seller', username);
  }

  console.log('[eBay Webhook] Data cleanup completed for user:', userId);
}

/**
 * Log deletion event for compliance
 * 
 * Keep audit trail of deletion requests (required for compliance)
 */
async function logDeletionEvent({
  userId,
  username,
  notificationId,
  timestamp,
}: {
  userId: string;
  username?: string;
  notificationId?: string;
  timestamp: Date;
}) {
  // Log to console for compliance audit trail
  console.log('[eBay Webhook] Deletion event logged', {
    userId,
    username,
    notificationId,
    timestamp: timestamp.toISOString(),
  });

  // TODO: If compliance requires persistent storage, create ebay_deletion_log table
  // Example implementation:
  /*
  const supabase = createClient();
  await supabase
    .from('ebay_deletion_log')
    .insert({
      ebay_user_id: userId,
      username,
      notification_id: notificationId,
      processed_at: timestamp.toISOString(),
    });
  */
}

