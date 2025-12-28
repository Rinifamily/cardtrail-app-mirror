/**
 * Unit Tests: API Route Handler
 * 
 * Tests the /api/internal/sync-prices endpoint.
 * Mocks the sync logic to test API behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/internal/sync-prices/route';
import { NextRequest } from 'next/server';
import * as syncPricesModule from '@/lib/internal/sync-prices';
import * as emailNotifierModule from '@/lib/internal/email-notifier';

// Mock sync logic
vi.mock('@/lib/internal/sync-prices', () => ({
  syncPrices: vi.fn(),
}));

// Mock email notifier
vi.mock('@/lib/internal/email-notifier', () => ({
  sendSyncSummaryEmail: vi.fn(),
}));

describe('POST /api/internal/sync-prices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset environment variable
    delete process.env.INTERNAL_API_KEY;
    
    // Default mock response
    vi.mocked(syncPricesModule.syncPrices).mockResolvedValue({
      totalCards: 100,
      processed: 100,
      successful: 95,
      failed: 5,
      skipped: 0,
      duration: '45s',
      errors: [
        { cardId: 10, error: 'No data' },
        { cardId: 25, error: 'API timeout' },
      ],
    });
  });

  it('should reject requests without API key', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest('http://localhost:3000/api/internal/sync-prices', {
      method: 'POST',
      headers: {}, // No x-internal-api-key header
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should reject requests with invalid API key', async () => {
    process.env.INTERNAL_API_KEY = 'correct_key';
    
    const req = new NextRequest('http://localhost:3000/api/internal/sync-prices', {
      method: 'POST',
      headers: { 'x-internal-api-key': 'wrong_key' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toContain('Unauthorized');
  });

  it('should return 500 when API key not configured', async () => {
    const req = new NextRequest('http://localhost:3000/api/internal/sync-prices', {
      method: 'POST',
      headers: { 'x-internal-api-key': 'any_key' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('API key not configured');
  });

  it('should process sync with valid API key', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest('http://localhost:3000/api/internal/sync-prices', {
      method: 'POST',
      headers: { 'x-internal-api-key': 'test_key' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('completed');
    expect(data.summary).toBeDefined();
    expect(data.summary.successful).toBe(95);
    expect(data.summary.failed).toBe(5);
  });

  it('should respect limit query parameter', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest(
      'http://localhost:3000/api/internal/sync-prices?limit=50',
      {
        method: 'POST',
        headers: { 'x-internal-api-key': 'test_key' },
      }
    );

    await POST(req);

    expect(syncPricesModule.syncPrices).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  it('should respect offset query parameter', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest(
      'http://localhost:3000/api/internal/sync-prices?offset=100',
      {
        method: 'POST',
        headers: { 'x-internal-api-key': 'test_key' },
      }
    );

    await POST(req);

    expect(syncPricesModule.syncPrices).toHaveBeenCalledWith(
      expect.objectContaining({ offset: 100 })
    );
  });

  it('should respect dryRun query parameter', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest(
      'http://localhost:3000/api/internal/sync-prices?dryRun=true',
      {
        method: 'POST',
        headers: { 'x-internal-api-key': 'test_key' },
      }
    );

    await POST(req);

    expect(syncPricesModule.syncPrices).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true })
    );
  });

  it('should parse multiple query parameters', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest(
      'http://localhost:3000/api/internal/sync-prices?limit=50&offset=100&dryRun=true',
      {
        method: 'POST',
        headers: { 'x-internal-api-key': 'test_key' },
      }
    );

    await POST(req);

    expect(syncPricesModule.syncPrices).toHaveBeenCalledWith({
      limit: 50,
      offset: 100,
      dryRun: true,
    });
  });

  it('should handle sync failures', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    vi.mocked(syncPricesModule.syncPrices).mockRejectedValueOnce(new Error('Database connection failed'));

    const req = new NextRequest('http://localhost:3000/api/internal/sync-prices', {
      method: 'POST',
      headers: { 'x-internal-api-key': 'test_key' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.status).toBe('failed');
    expect(data.error).toContain('Database connection failed');
  });

  it('should send email notification on success', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest('http://localhost:3000/api/internal/sync-prices', {
      method: 'POST',
      headers: { 'x-internal-api-key': 'test_key' },
    });

    await POST(req);

    expect(emailNotifierModule.sendSyncSummaryEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        successful: 95,
        failed: 5,
      })
    );
  });

  it('should not send email on dry run', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest(
      'http://localhost:3000/api/internal/sync-prices?dryRun=true',
      {
        method: 'POST',
        headers: { 'x-internal-api-key': 'test_key' },
      }
    );

    await POST(req);

    expect(emailNotifierModule.sendSyncSummaryEmail).not.toHaveBeenCalled();
  });

  it('should include totalDuration in response', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest('http://localhost:3000/api/internal/sync-prices', {
      method: 'POST',
      headers: { 'x-internal-api-key': 'test_key' },
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.summary.totalDuration).toBeDefined();
    expect(data.summary.totalDuration).toMatch(/^\d+s$/);
  });

  it('should use default query parameter values', async () => {
    process.env.INTERNAL_API_KEY = 'test_key';
    
    const req = new NextRequest('http://localhost:3000/api/internal/sync-prices', {
      method: 'POST',
      headers: { 'x-internal-api-key': 'test_key' },
    });

    await POST(req);

    expect(syncPricesModule.syncPrices).toHaveBeenCalledWith({
      limit: 1000,
      offset: 0,
      dryRun: false,
    });
  });
});
