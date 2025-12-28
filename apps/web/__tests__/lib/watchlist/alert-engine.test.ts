import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  evaluateAlerts,
  getLastAlertEvaluation,
  getNextAlertEvaluationTime,
  resetAlertEvaluationState,
} from '@/lib/watchlist/alert-engine';

const baseItem = {
  id: 'watch-1',
  cardId: 1,
  alertEnabled: true,
  addedAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-02').toISOString(),
  migrationStatus: 'pending' as const,
};

describe('alert-engine', () => {
  beforeEach(() => {
    resetAlertEvaluationState();
  });

  it('triggers alert when latest price meets target', async () => {
    const alerts = await evaluateAlerts({
      now: new Date('2024-01-03T00:00:00.000Z'),
      listFn: async () => [
        {
          ...baseItem,
          targetPrice: 500,
          targetCurrency: 'CNY' as const,
        },
      ],
      priceFetcher: async () => 480,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]?.delta).toBeCloseTo(20);
  });

  it('respects throttle window', async () => {
    const fetcher = vi.fn(async () => 300);

    await evaluateAlerts({
      now: new Date('2024-05-01T00:00:00.000Z'),
      listFn: async () => [
        {
          ...baseItem,
          targetPrice: 400,
          targetCurrency: 'USD' as const,
        },
      ],
      priceFetcher: fetcher,
    });

    const secondRun = await evaluateAlerts({
      now: new Date('2024-05-01T00:05:00.000Z'),
      listFn: async () => [
        {
          ...baseItem,
          targetPrice: 400,
          targetCurrency: 'USD' as const,
        },
      ],
      priceFetcher: fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(secondRun).toHaveLength(1);
  });

  it('forces refresh when requested', async () => {
    const fetcher = vi.fn(async () => 200);

    await evaluateAlerts({
      now: new Date('2024-06-01T00:00:00.000Z'),
      listFn: async () => [
        {
          ...baseItem,
          targetPrice: 250,
          targetCurrency: 'JPY' as const,
        },
      ],
      priceFetcher: fetcher,
    });

    await evaluateAlerts({
      now: new Date('2024-06-01T00:01:00.000Z'),
      force: true,
      listFn: async () => [
        {
          ...baseItem,
          targetPrice: 260,
          targetCurrency: 'JPY' as const,
        },
      ],
      priceFetcher: fetcher,
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('computes next evaluation window', async () => {
    await evaluateAlerts({
      now: new Date('2024-07-01T00:00:00.000Z'),
      listFn: async () => [
        {
          ...baseItem,
          targetPrice: 100,
          targetCurrency: 'CNY' as const,
        },
      ],
      priceFetcher: async () => 90,
    });

    const meta = getLastAlertEvaluation();
    expect(meta.timestamp).toBeGreaterThan(0);

    const waitMs = getNextAlertEvaluationTime(new Date('2024-07-01T00:01:00.000Z'));
    expect(waitMs).toBeGreaterThan(0);
  });
});
