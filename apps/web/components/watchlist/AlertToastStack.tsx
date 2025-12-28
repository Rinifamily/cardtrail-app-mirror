'use client';

import { X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { TriggeredAlert } from '@/lib/watchlist/alert-engine';

interface AlertToastStackProps {
  toasts: { id: string; alert: TriggeredAlert }[];
  onDismiss: (id: string) => void;
}

export function AlertToastStack({ toasts, onDismiss }: AlertToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-4 z-[60] space-y-3 md:bottom-6 md:right-6">
      {toasts.map(({ id, alert }) => (
        <div
          key={id}
          className="w-72 rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-xl shadow-emerald-100 backdrop-blur"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">价格提醒</p>
              <p className="text-xs text-emerald-600">卡牌 #{alert.cardId} 已达到目标价</p>
            </div>
            <button
              type="button"
              aria-label="关闭提醒"
              onClick={() => onDismiss(id)}
              className="rounded-full p-1 text-emerald-500 transition hover:bg-emerald-50 hover:text-emerald-700"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-emerald-800">
            <div>
              <span className="font-medium">当前价</span>
              <p>{formatCurrency(alert.latestPrice, alert.currency)}</p>
            </div>
            <div className="text-right">
              <span className="font-medium">目标价</span>
              <p>{formatCurrency(alert.targetPrice, alert.currency)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-700">
            Δ {formatCurrency(alert.delta, alert.currency)} ({alert.deltaPercent}%)
          </p>
          <p className="mt-1 text-[11px] text-emerald-600">查看关注列表以确认提醒</p>
        </div>
      ))}
    </div>
  );
}
