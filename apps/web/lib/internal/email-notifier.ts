/**
 * Email Notification Service
 * 
 * Sends summary emails after price sync completion.
 * Currently a placeholder implementation with console logging.
 * 
 * Future integration options:
 * - Resend (https://resend.com)
 * - SendGrid
 * - AWS SES
 * 
 * Configuration:
 * - ENABLE_PRICE_SYNC_EMAIL=true to enable
 * - ADMIN_EMAIL=your-email@example.com
 * - RESEND_API_KEY=re_xxxxx (when using Resend)
 */

import type { SyncSummary } from './sync-prices';

/**
 * Sends summary email after price sync
 * 
 * @param summary - Sync execution summary
 */
export async function sendSyncSummaryEmail(summary: SyncSummary): Promise<void> {
  const enabled = process.env.ENABLE_PRICE_SYNC_EMAIL === 'true';
  
  if (!enabled) {
    console.log('[sendSyncSummaryEmail] Email notifications disabled');
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.warn('[sendSyncSummaryEmail] ADMIN_EMAIL not configured');
    return;
  }

  const subject = `CardTrail Price Sync: ${summary.successful}/${summary.totalCards} success`;
  const body = formatEmailBody(summary);

  console.log('[sendSyncSummaryEmail] Email Summary:');
  console.log('Subject:', subject);
  console.log('To:', adminEmail);
  console.log('---');
  console.log(body);
  console.log('---');

  // TODO: Integrate with Resend or SendGrid
  // Example Resend integration (uncomment when ready):
  /*
  if (!resendApiKey) {
    console.warn('[sendSyncSummaryEmail] RESEND_API_KEY not configured');
    return;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CardTrail <noreply@cardtrail.app>',
        to: adminEmail,
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API error: ${response.status}`);
    }

    console.log('[sendSyncSummaryEmail] Email sent successfully');
  } catch (error) {
    console.error('[sendSyncSummaryEmail] Failed to send email:', error);
  }
  */
}

/**
 * Formats sync summary into readable email body
 * 
 * @param summary - Sync execution summary
 * @returns Formatted email text
 */
function formatEmailBody(summary: SyncSummary): string {
  const failureRate = summary.processed > 0
    ? ((summary.failed / summary.processed) * 100).toFixed(1)
    : '0.0';

  const lines = [
    'CardTrail Price Sync Summary',
    '============================',
    '',
    `Timestamp: ${new Date().toISOString()}`,
    `Duration: ${summary.duration}`,
    '',
    'Results:',
    `  Total Cards: ${summary.totalCards}`,
    `  Processed: ${summary.processed}`,
    `  Successful: ${summary.successful} ✓`,
    `  Failed: ${summary.failed} ✗`,
    `  Skipped: ${summary.skipped}`,
    `  Failure Rate: ${failureRate}%`,
    '',
  ];

  if (summary.errors.length > 0) {
    lines.push('Errors (showing first 10):');
    summary.errors.slice(0, 10).forEach(e => {
      lines.push(`  - Card ${e.cardId}: ${e.error}`);
    });
    
    if (summary.errors.length > 10) {
      lines.push(`  ... and ${summary.errors.length - 10} more errors`);
    }
  } else {
    lines.push('No errors! 🎉');
  }

  lines.push('');
  lines.push('---');
  lines.push('CardTrail Automated Price Pipeline');
  lines.push('https://cardtrail.app');

  return lines.join('\n');
}
