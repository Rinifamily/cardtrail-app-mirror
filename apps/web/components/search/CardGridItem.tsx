'use client';

import Image from 'next/image';
import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn, getThumbnailImageUrl } from '@/lib/utils';
import { useWatchlistDrawer } from '@/components/watchlist/WatchlistDrawerProvider';

interface CardData {
  id: number;
  card_name: string;
  card_index: string | null;
  rarity: string | null;
  set_name: string;
  image_urls: string | null;
}

interface CardGridItemProps {
  card: CardData;
  onClick?: () => void;
}

export function CardGridItem({ card, onClick }: CardGridItemProps) {
  const imageUrl = getThumbnailImageUrl(card.image_urls);
  const { openDrawer } = useWatchlistDrawer();

  const handleWatchlist = (event: React.MouseEvent) => {
    event.stopPropagation();
    openDrawer({
      cardId: card.id,
      cardName: card.card_name,
      imageUrl: card.image_urls,
    });
  };

  return (
    <Card
      data-testid="card-grid-item"
      className={cn(
        'overflow-hidden hover:shadow-lg transition-shadow cursor-pointer',
        'rounded-xl'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="aspect-[2.5/3.5] relative bg-[#FAFAF9]">
        <button
          type="button"
          aria-label="加入关注"
          onClick={handleWatchlist}
          className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-2 text-gray-500 shadow transition hover:text-primary"
        >
          <Star className="h-4 w-4" aria-hidden />
        </button>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={card.card_name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            No Image
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <h3 className="font-medium text-sm line-clamp-1">{card.card_name}</h3>
        <p className="text-xs text-muted-foreground">{card.set_name}</p>
        {(card.rarity || card.card_index) && (
          <p className="text-xs text-muted-foreground">
            {card.rarity}
            {card.rarity && card.card_index && ', '}
            {card.card_index}
          </p>
        )}
      </div>
    </Card>
  );
}
