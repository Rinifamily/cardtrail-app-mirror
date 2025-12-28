'use client';

import { PlusCircle, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useWatchlistDrawer } from '@/components/watchlist/WatchlistDrawerProvider';

interface CardCTABarProps {
  cardId: number;
  cardName: string;
}

export function CardCTABar({ cardId, cardName }: CardCTABarProps) {
  const router = useRouter();
  const { openDrawer } = useWatchlistDrawer();

  const handleCollection = () => {
    router.push(`/collection`);
  };

  const handleWatchlist = () => {
    openDrawer({ cardId, cardName });
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 p-4 backdrop-blur md:hidden"
      role="contentinfo"
      aria-label="卡牌本地收藏提醒"
    >
      <div className="mx-auto flex max-w-md gap-3">
        <Button
          type="button"
          onClick={handleCollection}
          className="flex-1 rounded-xl bg-primary text-primary-foreground"
          aria-label="加入持仓"
        >
          <PlusCircle className="h-5 w-5" aria-hidden />
          <span>加入持仓</span>
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={handleWatchlist}
          className="flex-1 rounded-xl bg-gray-100 text-text-primary hover:bg-gray-200"
          aria-label="加入关注"
        >
          <Star className="h-5 w-5" aria-hidden />
          <span>加入关注</span>
        </Button>
      </div>
      <p className="mt-2 text-center text-xs text-text-secondary">
        📦 数据暂存本地，Phase 09 将自动同步云端.
      </p>
    </div>
  );
}
