'use client';

import { TrendingUp, TrendingDown, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface PortfolioSummaryProps {
  totalInvested: number;
  estimatedValue: number;
  holdingsCount: number;
  currency?: 'CNY' | 'USD' | 'JPY';
}

export function PortfolioSummary({
  totalInvested,
  estimatedValue,
  holdingsCount,
  currency = 'CNY',
}: PortfolioSummaryProps) {
  const profitLoss = estimatedValue - totalInvested;
  const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;
  const isProfit = profitLoss >= 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="p-6">
      <h2 className="mb-6 text-lg font-semibold">投资组合总览</h2>

      <div className="grid gap-6 sm:grid-cols-3">
        {/* Total Invested */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">总投入</p>
          <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
        </div>

        {/* Estimated Value */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">估值</p>
          <p className="text-2xl font-bold">{formatCurrency(estimatedValue)}</p>
        </div>

        {/* P&L */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">盈亏</p>
          <div className="flex items-baseline gap-2">
            <p
              className={`text-2xl font-bold ${
                isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatCurrency(Math.abs(profitLoss))}
            </p>
            {isProfit ? (
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <p
            className={`text-sm font-medium ${
              isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isProfit ? '+' : ''}
            {profitLossPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Holdings Count */}
      <div className="mt-6 flex items-center gap-2 border-t pt-4">
        <Package className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          持仓中共 {holdingsCount} 项
        </p>
      </div>
    </Card>
  );
}
