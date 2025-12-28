'use client';

import { useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { GradeOption, useCardGradeStore } from '@/hooks/useCardGradeStore';

interface PriceHistoryPoint {
  date: string;
  price_raw: number | null;
  price_psa9: number | null;
  price_psa10: number | null;
}

interface PriceSnapshotProps {
  cardId: number;
  priceHistory: PriceHistoryPoint[];
  currency?: string;
}

const gradeLabels: Record<GradeOption, string> = {
  raw: 'Raw',
  psa9: 'PSA 9',
  psa10: 'PSA 10',
};

// Static exchange rate: USD to CNY
// TODO: Replace with real-time API when available
const USD_TO_CNY_RATE = 7.25;

export function PriceSnapshot({ cardId, priceHistory, currency = 'CNY' }: PriceSnapshotProps) {
  const { selectedGrade, setSelectedGrade } = useCardGradeStore(cardId);

  const { currentPrice, previousPrice, lastUpdated } = useMemo(() => {
    if (!priceHistory.length) {
      return { currentPrice: null, previousPrice: null, lastUpdated: null };
    }

    const latestPoint = priceHistory[priceHistory.length - 1];
    const previousPoint = priceHistory.length > 1 ? priceHistory[priceHistory.length - 2] : null;

    // Convert USD prices to CNY
    const currentPriceUSD = gradeValue(latestPoint, selectedGrade);
    const previousPriceUSD = previousPoint ? gradeValue(previousPoint, selectedGrade) : null;

    return {
      currentPrice: currentPriceUSD !== null ? currentPriceUSD * USD_TO_CNY_RATE : null,
      previousPrice: previousPriceUSD !== null ? previousPriceUSD * USD_TO_CNY_RATE : null,
      lastUpdated: latestPoint.date,
    };
  }, [priceHistory, selectedGrade]);

  const { changeValue, changePercent } = useMemo(() => {
    if (currentPrice === null || previousPrice === null || previousPrice === 0) {
      return { changeValue: null, changePercent: null };
    }
    const diff = currentPrice - previousPrice;
    const percent = (diff / previousPrice) * 100;
    return {
      changeValue: diff,
      changePercent: Number.isFinite(percent) ? percent : null,
    };
  }, [currentPrice, previousPrice]);

  const trendVariant = changeValue === null ? 'neutral' : changeValue >= 0 ? 'up' : 'down';

  return (
    <Card className="space-y-6 rounded-2xl border-0 bg-surface p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-text-secondary">CardTrail 指导价</p>
          <p className="text-sm text-text-secondary">基于过去 6 个月行情</p>
        </div>
        <div className="text-right text-xs text-text-secondary">
          <p>评级</p>
          <p className="font-semibold text-text-primary">{gradeLabels[selectedGrade]}</p>
        </div>
      </div>

      <div role="tablist" aria-label="选择评级" className="grid grid-cols-3 gap-2">
        {(Object.keys(gradeLabels) as GradeOption[]).map((grade) => {
          const isActive = selectedGrade === grade;
          return (
            <button
              key={grade}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelectedGrade(grade)}
              className={`rounded-full py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive ? 'bg-primary text-primary-foreground shadow-md' : 'bg-gray-100 text-text-primary hover:bg-gray-200'
              }`}
            >
              {gradeLabels[grade]}
            </button>
          );
        })}
      </div>

      <div>
        {currentPrice !== null ? (
          <>
            <p className="text-[32pt] font-bold leading-tight text-text-primary">
              {formatCurrency(currentPrice, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <div className="mt-3 flex items-center gap-2 text-sm font-medium">
              {trendVariant === 'neutral' ? (
                <span className="text-text-secondary">暂无涨跌数据</span>
              ) : (
                <>
                  {trendVariant === 'up' ? (
                    <ArrowUpRight aria-hidden className="h-4 w-4 text-positive" />
                  ) : (
                    <ArrowDownRight aria-hidden className="h-4 w-4 text-negative" />
                  )}
                  <span className={trendVariant === 'up' ? 'text-positive' : 'text-negative'}>
                    {changeValue !== null ? formatCurrency(Math.abs(changeValue), currency) : '--'}
                  </span>
                  {changePercent !== null ? (
                    <span className={trendVariant === 'up' ? 'text-positive' : 'text-negative'}>
                      ({changePercent > 0 ? '+' : ''}
                      {changePercent.toFixed(2)}%)
                    </span>
                  ) : null}
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              最后更新: {lastUpdated ? formatDate(lastUpdated) : '--'}
            </p>
          </>
        ) : (
          <div className="flex h-32 flex-col items-center justify-center text-text-secondary">
            <p className="text-sm">暂未收录该评级价格</p>
            <p className="text-xs">请选择其他评级或稍后再试</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function gradeValue(point: PriceHistoryPoint, grade: GradeOption) {
  if (grade === 'raw') return point.price_raw ?? null;
  if (grade === 'psa9') return point.price_psa9 ?? null;
  return point.price_psa10 ?? null;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
