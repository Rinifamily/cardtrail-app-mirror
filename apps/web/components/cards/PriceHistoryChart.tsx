'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { useCardGradeStore } from '@/hooks/useCardGradeStore';

type TimeRange = '24h' | '7d' | '30d' | '90d' | 'all';

interface PriceHistoryPoint {
  date: string;
  price_raw: number | null;
  price_psa9: number | null;
  price_psa10: number | null;
  volume?: number | null;
}

interface PriceHistoryChartProps {
  cardId: number;
  data: PriceHistoryPoint[];
  currency?: string;
}

const rangeMap: Record<TimeRange, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  all: Number.POSITIVE_INFINITY,
};

// Static exchange rate: USD to CNY
// Database stores USD prices, UI displays CNY
const USD_TO_CNY_RATE = 7.25;

export function PriceHistoryChart({ data, currency = 'CNY', cardId }: PriceHistoryChartProps) {
  const [range, setRange] = useState<TimeRange>('30d');
  const { selectedGrade } = useCardGradeStore(cardId);

  const filteredData = useMemo(() => {
    if (!data.length || range === 'all' || !Number.isFinite(rangeMap[range])) {
      return data;
    }

    const msInDay = 24 * 60 * 60 * 1000;
    const lastDate = new Date(data[data.length - 1].date).getTime();
    const minDate = lastDate - rangeMap[range] * msInDay;

    return data.filter((point) => new Date(point.date).getTime() >= minDate);
  }, [data, range]);

  const series = useMemo(
    () =>
      filteredData.map((point) => {
        const priceUSD = gradeValue(point, selectedGrade);
        return {
          date: point.date,
          // Convert USD to CNY for display
          value: priceUSD !== null ? priceUSD * USD_TO_CNY_RATE : null,
        };
      }),
    [filteredData, selectedGrade]
  );

  if (!data.length) {
    return (
      <Card className="mt-8 rounded-2xl border-0 bg-surface p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="flex h-64 flex-col items-center justify-center text-text-secondary">
          <p className="text-sm font-medium">暂无历史数据</p>
          <p className="text-xs">收集到新的成交后将自动更新</p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      role="region"
      aria-label="价格走势折线图"
      className="mt-8 rounded-2xl border-0 bg-surface p-6 shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">价格走势</h2>
          <p className="text-sm text-text-secondary">历史成交价（含税）</p>
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="选择时间范围">
          {(Object.keys(rangeMap) as TimeRange[]).map((option) => {
            const isActive = range === option;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setRange(option)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  isActive ? 'bg-primary text-primary-foreground shadow' : 'bg-gray-100 text-text-primary hover:bg-gray-200'
                }`}
              >
                {option.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 h-[320px] w-full md:h-[400px]" aria-live="polite">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f1a208" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f1a208" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value) => formatDate(value)}
            />
            <YAxis
              dataKey="value"
              width={70}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatYAxis(value, currency)}
            />
            <Tooltip
              cursor={{ stroke: '#f1a208', strokeWidth: 1, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const datum = payload[0];
                return (
                  <div className="rounded-xl border border-gray-100 bg-white/95 p-4 text-sm shadow-lg">
                    <p className="text-text-secondary">{formatFullDate(datum.payload.date)}</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {datum.value === null ? '--' : formatCurrency(Number(datum.value), currency)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#f1a208"
              fill="url(#priceGradient)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive
              animationDuration={500}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function gradeValue(point: PriceHistoryPoint, grade: 'raw' | 'psa9' | 'psa10') {
  if (grade === 'raw') return point.price_raw;
  if (grade === 'psa9') return point.price_psa9;
  return point.price_psa10;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatFullDate(value: string) {
  try {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatYAxis(value: number, currency: string) {
  if (value === null || value === undefined) {
    return '--';
  }

  if (Math.abs(value) >= 10000) {
    return `${(value / 10000).toFixed(1)}万`;
  }

  return formatCurrency(value, currency, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
