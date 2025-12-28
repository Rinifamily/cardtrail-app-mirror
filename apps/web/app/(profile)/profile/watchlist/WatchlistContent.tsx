'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BellOff,
  BellRing,
  Edit3,
  PlusCircle,
  RefreshCcw,
  Trash2,
} from 'lucide-react';
import type { LocalWatchlistItem } from '@cardtrail/shared-types';
import { getWatchlistStore } from '@/lib/storage/local-watchlist-store';
import {
  getLatestPrice,
  getLastAlertEvaluation,
  getNextAlertEvaluationTime,
} from '@/lib/watchlist/alert-engine';
import { createClient, getFallbackCardRows } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExportImport } from '@/components/collection/ExportImport';
import { formatCurrency, getThumbnailImageUrl } from '@/lib/utils';
import { useWatchlistDrawer } from '@/components/watchlist/WatchlistDrawerProvider';

type CurrencyCode = 'CNY' | 'USD' | 'JPY';

interface CardMeta {
  id: number;
  name: string;
  setName: string;
  imageUrl?: string | null;
}

type WatchlistViewModel = LocalWatchlistItem & {
  cardMeta: CardMeta;
  currentPrice: number | null;
};

async function fetchCardMetadata(cardIds: number[]): Promise<Record<number, CardMeta>> {
  if (!cardIds.length) {
    return {};
  }

  try {
    const client = createClient();
    const { data } = await client
      .from('card_jp')
      .select('id, card_name, set_name, image_urls')
      .in('id', cardIds);

    if (!data) {
      throw new Error('Missing card metadata');
    }

    return Object.fromEntries(
      data.map((card) => [
        card.id,
        {
          id: card.id,
          name: card.card_name,
          setName: card.set_name,
          imageUrl: card.image_urls,
        },
      ])
    );
  } catch {
    const fallback = getFallbackCardRows();
    const placeholder: Record<number, CardMeta> = {};

    for (const id of cardIds) {
      const sample = fallback.find((row) => row.id === id);
      placeholder[id] = {
        id,
        name: sample?.card_name ?? `Card #${id}`,
        setName: sample?.set_name ?? 'CardTrail',
        imageUrl: sample?.image_urls ?? null,
      };
    }

    return placeholder;
  }
}

export function WatchlistContent() {
  const store = useMemo(() => getWatchlistStore(), []);
  const { openDrawer, triggerAlertCheck } = useWatchlistDrawer();
  const router = useRouter();
  const [items, setItems] = useState<WatchlistViewModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [throttleMs, setThrottleMs] = useState(() => getNextAlertEvaluationTime());
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const list = await store.list();
      const metaMap = await fetchCardMetadata([...new Set(list.map((item) => item.cardId))]);

      const enriched = await Promise.all(
        list.map(async (item) => {
          const currentPrice = await getLatestPrice(item.cardId, (item.targetCurrency ?? 'CNY') as CurrencyCode);
          const cardMeta =
            metaMap[item.cardId] ?? ({
              id: item.cardId,
              name: `Card #${item.cardId}`,
              setName: 'CardTrail',
              imageUrl: null,
            } satisfies CardMeta);

          return {
            ...item,
            cardMeta,
            currentPrice,
          };
        })
      );

      setItems(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载关注列表失败');
    } finally {
      setIsLoading(false);
    }
  }, [store]);

  useEffect(() => {
    loadItems();

    const handler = () => loadItems();
    window.addEventListener('watchlist-changed', handler);
    return () => window.removeEventListener('watchlist-changed', handler);
  }, [loadItems]);

  useEffect(() => {
    const { timestamp } = getLastAlertEvaluation();
    if (timestamp) {
      setLastCheckedAt(timestamp);
    }
  }, []);

  const activeItems = useMemo(() => items.filter((item) => item.alertEnabled), [items]);
  const monitoringItems = useMemo(() => items.filter((item) => !item.alertEnabled), [items]);

  const handleToggleAlert = async (item: WatchlistViewModel) => {
    if (!item.id) return;
    await store.update(item.id, { alertEnabled: !item.alertEnabled });
    loadItems();
  };

  const handleDelete = async (item: WatchlistViewModel) => {
    if (!item.id) return;
    await store.remove(item.id);
    loadItems();
  };

  const handleManualRefresh = async () => {
    setIsEvaluating(true);
    try {
      await triggerAlertCheck(true);
      const now = Date.now();
      setLastCheckedAt(now);
      setThrottleMs(getNextAlertEvaluationTime(new Date(now)));
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleExport = async () => store.export();
  const handleImport = async (data: unknown) => {
    const result = await store.import(data);
    await loadItems();
    return result;
  };

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">关注列表</h1>
          <p className="text-sm text-muted-foreground">
            设置目标价并在本地追踪，Phase 09 将自动云端同步。
          </p>
          {lastCheckedAt && (
            <p className="text-xs text-muted-foreground">
              上次检测：{new Date(lastCheckedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-3 md:flex-row">
          <Button
            variant="outline"
            disabled={true}
            className="gap-2 rounded-2xl"
            title="Phase 10 will enable push"
          >
            <BellOff className="h-4 w-4" aria-hidden />
            开启推送通知 (Phase 10)
          </Button>
          <Button
            variant="secondary"
            className="gap-2 rounded-2xl"
            onClick={handleManualRefresh}
            disabled={isEvaluating || throttleMs > 0}
          >
            <RefreshCcw className="h-4 w-4 animate-spin" aria-hidden={isEvaluating} />
            {isEvaluating ? '检测中...' : '检测提醒'}
          </Button>
        </div>
      </div>

      <LocalWarningBanner />

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>加载关注列表失败：{error}</p>
        </div>
      )}

      {throttleMs > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {Math.ceil(throttleMs / 60000)} 分钟后可再次手动检测
        </p>
      )}

      {isLoading ? (
        <WatchlistSkeleton />
      ) : items.length === 0 ? (
        <EmptyState onAdd={() => router.push('/search')} />
      ) : (
        <div className="mt-6 space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-emerald-500" aria-hidden />
                  活动提醒
                </h2>
                <p className="text-xs text-muted-foreground">
                  正在监控的目标价 {activeItems.length} 条
                </p>
              </div>
            </div>
            {activeItems.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-muted-foreground">
                暂无激活的提醒
              </p>
            ) : (
              <div className="space-y-4">
                {activeItems.map((item) => (
                  <WatchlistCard
                    key={item.id ?? item.cardId}
                    item={item}
                    onEdit={() =>
                      openDrawer({
                        cardId: item.cardId,
                        cardName: item.cardMeta.name,
                        imageUrl: item.cardMeta.imageUrl,
                      })
                    }
                    onToggle={() => handleToggleAlert(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BellOff className="h-4 w-4 text-gray-400" aria-hidden />
                  关注（未提醒）
                </h2>
                <p className="text-xs text-muted-foreground">
                  未设提醒或已暂停的关注项 {monitoringItems.length} 条
                </p>
              </div>
            </div>
            {monitoringItems.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-muted-foreground">
                所有关注都已开启提醒
              </p>
            ) : (
              <div className="space-y-4">
                {monitoringItems.map((item) => (
                  <WatchlistCard
                    key={item.id ?? item.cardId}
                    item={item}
                    onEdit={() =>
                      openDrawer({
                        cardId: item.cardId,
                        cardName: item.cardMeta.name,
                        imageUrl: item.cardMeta.imageUrl,
                      })
                    }
                    onToggle={() => handleToggleAlert(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-8">
          <ExportImport
            entityName="关注列表"
            downloadPrefix="cardtrail-watchlist"
            dedupeHints={[
              '根据卡牌 ID 去重',
              '较新的更新时间会覆盖旧记录',
              'Phase 09 迁移前建议定期导出备份',
            ]}
            onExport={handleExport}
            onImport={handleImport}
          />
        </div>
      )}
    </section>
  );
}

function WatchlistCard({
  item,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: WatchlistViewModel;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const thumbnail = getThumbnailImageUrl(item.cardMeta.imageUrl ?? null);
  const currency = item.targetCurrency ?? 'CNY';

  return (
    <Card className="rounded-3xl border border-gray-100 p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-4">
          {thumbnail ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-gray-50">
              <Image src={thumbnail} alt={item.cardMeta.name} fill sizes="64px" className="object-contain" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-xs text-gray-500">
              无图
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{item.cardMeta.setName}</p>
            <h3 className="text-base font-semibold">{item.cardMeta.name}</h3>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-gray-100 px-2 py-0.5">
                {item.alertEnabled ? '已激活' : '已暂停'}
              </span>
              {item.migrationStatus && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                  {item.migrationStatus === 'pending' ? '待迁移' : '已同步'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-gray-50 p-3">
            <p className="text-xs text-muted-foreground">当前价格</p>
            <p className="text-base font-semibold">
              {item.currentPrice != null ? formatCurrency(item.currentPrice, currency) : '--'}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3">
            <p className="text-xs text-muted-foreground">目标价格</p>
            <p className="text-base font-semibold">
              {item.targetPrice != null ? formatCurrency(item.targetPrice, currency) : '未设置'}
            </p>
          </div>
        </div>
      </div>

      {item.notes && (
        <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-700">📝 {item.notes}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" className="gap-1 rounded-full px-4" onClick={onEdit}>
          <Edit3 className="h-4 w-4" aria-hidden />
          编辑
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1 rounded-full px-4"
          onClick={onToggle}
        >
          {item.alertEnabled ? (
            <>
              <BellOff className="h-4 w-4" aria-hidden />
              暂停
            </>
          ) : (
            <>
              <BellRing className="h-4 w-4" aria-hidden />
              激活
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 rounded-full px-4 text-red-500 hover:text-red-600"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          删除
        </Button>
      </div>
    </Card>
  );
}

function LocalWarningBanner() {
  return (
    <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">本地存储提醒</p>
          <p>
            关注列表数据仅保存在浏览器中。Phase 09 上线后会提供迁移向导同步至云端。请定期导出备份以免浏览器缓存被清理。
          </p>
        </div>
      </div>
    </div>
  );
}

function WatchlistSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-3xl bg-gray-100" />
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-dashed border-gray-200 p-10 text-center">
      <div className="rounded-full bg-primary/10 p-4 text-primary">
        <PlusCircle className="h-8 w-8" aria-hidden />
      </div>
      <div>
        <h3 className="text-lg font-semibold">尚未添加关注</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          在搜卡或详情页点击"加入关注"即可设置提醒
        </p>
      </div>
      <Button className="rounded-full" onClick={onAdd}>
        立即添加
      </Button>
    </Card>
  );
}
