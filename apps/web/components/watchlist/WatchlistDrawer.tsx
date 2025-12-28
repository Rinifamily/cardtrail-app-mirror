'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import type { LocalWatchlistItem } from '@cardtrail/shared-types';
import { getWatchlistStore } from '@/lib/storage/local-watchlist-store';
import { formatCurrency, getThumbnailImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { WatchlistTargetCard } from './WatchlistDrawerProvider';

const formSchema = z.object({
  targetPrice: z.number().min(0).optional(),
  targetCurrency: z.enum(['CNY', 'USD', 'JPY']),
  alertEnabled: z.boolean(),
  notes: z.string().max(500).optional(),
});

interface WatchlistDrawerProps {
  isOpen: boolean;
  isLoading: boolean;
  card?: WatchlistTargetCard;
  existingItem: LocalWatchlistItem | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function WatchlistDrawer({
  isOpen,
  isLoading,
  card,
  existingItem,
  onClose,
  onSaved,
}: WatchlistDrawerProps) {
  const [targetPrice, setTargetPrice] = useState('');
  const [targetCurrency, setTargetCurrency] = useState<'CNY' | 'USD' | 'JPY'>('CNY');
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!card) {
      return;
    }

    setTargetPrice(existingItem?.targetPrice?.toString() ?? '');
    setTargetCurrency(existingItem?.targetCurrency ?? 'CNY');
    setAlertEnabled(existingItem?.alertEnabled ?? true);
    setNotes(existingItem?.notes ?? '');
    setError(null);
    setStatus(null);
  }, [card?.cardId, existingItem]);

  const thumbnail = useMemo(() => {
    if (!card) return null;
    return getThumbnailImageUrl(card.imageUrl ?? null);
  }, [card]);

  if (!isOpen || !card) {
    return null;
  }

  const sliderValue = targetPrice ? Number(targetPrice) : 0;
  const sliderMax = Math.max(200, sliderValue * 2 || 500);

  const handleSubmit = async () => {
    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      const parsed = formSchema.parse({
        targetPrice: targetPrice ? Number(targetPrice) : undefined,
        targetCurrency,
        alertEnabled,
        notes: notes.trim() || undefined,
      });

      const store = getWatchlistStore();
      await store.upsert({
        cardId: card.cardId,
        ...parsed,
      });

      setStatus('已保存');
      onSaved?.();
      onClose();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message ?? '表单校验失败');
      } else {
        setError(err instanceof Error ? err.message : '保存关注项失败');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingItem?.id) {
      onClose();
      return;
    }

    const store = getWatchlistStore();
    await store.remove(existingItem.id);
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm" role="dialog" aria-modal>
      <button className="flex-1" aria-label="关闭关注抽屉" onClick={onClose} />
      <div className="max-h-[85vh] rounded-t-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gray-200" />
        <div className="flex items-center gap-3">
          {thumbnail ? (
            <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gray-50">
              <Image src={thumbnail} alt={card.cardName} fill sizes="56px" className="object-contain" />
            </div>
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-500">
              无图
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">关注</p>
            <h2 className="text-lg font-semibold">{card.cardName}</h2>
          </div>
        </div>

        {isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground">加载中...</p>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="targetPrice" className="text-sm font-medium text-gray-700">
                目标价格
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="targetPrice"
                  type="number"
                  min={0}
                  inputMode="decimal"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-base"
                  placeholder="输入或使用滑块调节"
                  value={targetPrice}
                  onChange={(event) => setTargetPrice(event.target.value)}
                />
                <select
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={targetCurrency}
                  onChange={(event) => setTargetCurrency(event.target.value as 'CNY' | 'USD' | 'JPY')}
                >
                  <option value="CNY">CNY</option>
                  <option value="USD">USD</option>
                  <option value="JPY">JPY</option>
                </select>
              </div>
              <input
                type="range"
                min={0}
                max={sliderMax}
                className="mt-3 h-2 w-full cursor-pointer rounded-full bg-gray-100 accent-primary"
                value={sliderValue}
                onChange={(event) => setTargetPrice(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                当前设置：{targetPrice ? formatCurrency(Number(targetPrice), targetCurrency) : '—'}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  提醒状态{' '}
                  <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                    {alertEnabled ? '已激活' : '已暂停'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  关闭后保留关注但不触发提醒
                </p>
              </div>
              <button
                type="button"
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${
                  alertEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
                onClick={() => setAlertEnabled((prev) => !prev)}
                aria-pressed={alertEnabled}
                aria-label="切换提醒开关"
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                    alertEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label htmlFor="watch-notes" className="text-sm font-medium text-gray-700">
                备注（可选）
              </label>
              <textarea
                id="watch-notes"
                rows={3}
                maxLength={500}
                className="mt-2 w-full rounded-2xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="记录心里价位、渠道或其他提醒信息"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">{notes.length}/500</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {status && <p className="text-sm text-emerald-600">{status}</p>}

            <div className="flex flex-wrap gap-3">
              <Button
                className="flex-1 rounded-2xl"
                onClick={handleSubmit}
                disabled={isSubmitting}
                aria-label="保存关注设置"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </Button>
              <Button variant="outline" className="flex-1 rounded-2xl" onClick={onClose} aria-label="关闭抽屉">
                取消
              </Button>
            </div>

            {existingItem && (
              <Button
                variant="destructive"
                className="w-full rounded-2xl"
                onClick={handleDelete}
                aria-label="移除关注"
              >
                移除关注
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              📦 数据暂存本地，Phase 09 将迁移至云端
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
