import { type LocalWatchlistItem } from '@cardtrail/shared-types';
import { getWatchlistStore } from '@/lib/storage/local-watchlist-store';
import { createClient } from '@/lib/supabase';

type CurrencyCode = 'CNY' | 'USD' | 'JPY';

const FX_FROM_CNY: Record<CurrencyCode, number> = {
  CNY: 1,
  USD: 0.14,
  JPY: 19.2,
};

const ALERT_THROTTLE_MS = 10 * 60 * 1000;
const PRICE_CACHE_TTL_MS = 5 * 60 * 1000;

type PriceFetcher = (cardId: number, currency: CurrencyCode) => Promise<number | null>;

export interface TriggeredAlert {
  cardId: number;
  latestPrice: number;
  targetPrice: number;
  currency: CurrencyCode;
  delta: number;
  deltaPercent: number;
}

interface EvaluateOptions {
  now?: Date;
  force?: boolean;
  listFn?: () => Promise<LocalWatchlistItem[]>;
  priceFetcher?: PriceFetcher;
}

const priceCache = new Map<number, { valueCny: number; timestamp: number }>();
let lastEvaluationTimestamp = 0;
let lastResult: TriggeredAlert[] = [];
let inflightEvaluation: Promise<TriggeredAlert[]> | null = null;

function convertFromCny(value: number, currency: CurrencyCode): number {
  const rate = FX_FROM_CNY[currency] ?? 1;
  return Number((value * rate).toFixed(2));
}

async function fetchLatestPriceFromSupabase(cardId: number): Promise<number | null> {
  const cacheHit = priceCache.get(cardId);
  const now = Date.now();

  if (cacheHit && now - cacheHit.timestamp < PRICE_CACHE_TTL_MS) {
    return cacheHit.valueCny;
  }

  try {
    const client = createClient();
    const { data, error } = await client
      .from('price_history')
      .select('price_raw')
      .eq('card_id', cardId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[alert-engine] price query failed', error);
      return null;
    }

    if (!data || data.price_raw == null) {
      return null;
    }

    const normalized = Number(data.price_raw);
    priceCache.set(cardId, { valueCny: normalized, timestamp: now });
    return normalized;
  } catch (error) {
    console.warn('[alert-engine] Supabase unavailable, skip alert evaluation', error);
    return null;
  }
}

async function defaultPriceFetcher(cardId: number, currency: CurrencyCode): Promise<number | null> {
  const latestCny = await fetchLatestPriceFromSupabase(cardId);
  if (latestCny == null) {
    return null;
  }
  return convertFromCny(latestCny, currency);
}

export function getNextAlertEvaluationTime(now = new Date()): number {
  const elapsed = now.getTime() - lastEvaluationTimestamp;
  if (elapsed >= ALERT_THROTTLE_MS) {
    return 0;
  }
  return ALERT_THROTTLE_MS - elapsed;
}

export function getLastAlertEvaluation(): { timestamp: number; results: TriggeredAlert[] } {
  return { timestamp: lastEvaluationTimestamp, results: lastResult };
}

export function resetAlertEvaluationState(): void {
  lastEvaluationTimestamp = 0;
  lastResult = [];
  inflightEvaluation = null;
}

export async function evaluateAlerts(options: EvaluateOptions = {}): Promise<TriggeredAlert[]> {
  const { now = new Date(), force = false, listFn, priceFetcher = defaultPriceFetcher } = options;

  if (!force) {
    if (inflightEvaluation) {
      return inflightEvaluation;
    }

    if (now.getTime() - lastEvaluationTimestamp < ALERT_THROTTLE_MS) {
      return lastResult;
    }
  }

  const executor = async () => {
    try {
      const store = getWatchlistStore();
      const items = await (listFn ? listFn() : store.list());

      const alerts = (
        await Promise.all(
          items
            .filter((item) => item.alertEnabled && typeof item.targetPrice === 'number')
            .map(async (item) => {
              const currency: CurrencyCode = item.targetCurrency ?? 'CNY';
              const latestPrice = await priceFetcher(item.cardId, currency);

              if (latestPrice == null || item.targetPrice == null) {
                return null;
              }

              if (latestPrice <= item.targetPrice) {
                const delta = Number((item.targetPrice - latestPrice).toFixed(2));
                const deltaPercent =
                  item.targetPrice === 0
                    ? 0
                    : Number((((item.targetPrice - latestPrice) / item.targetPrice) * 100).toFixed(2));

                return {
                  cardId: item.cardId,
                  latestPrice,
                  targetPrice: item.targetPrice,
                  currency,
                  delta,
                  deltaPercent,
                } satisfies TriggeredAlert;
              }

              return null;
            })
        )
      ).filter((alert): alert is TriggeredAlert => Boolean(alert));

      lastEvaluationTimestamp = now.getTime();
      lastResult = alerts;

      return alerts;
    } finally {
      inflightEvaluation = null;
    }
  };

  inflightEvaluation = executor();
  return inflightEvaluation;
}

export async function getLatestPrice(cardId: number, currency: CurrencyCode): Promise<number | null> {
  return defaultPriceFetcher(cardId, currency);
}
