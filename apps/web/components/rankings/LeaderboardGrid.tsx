'use client';

import Image from 'next/image';
import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { RankingCard, RankingCategory } from '@/types/rankings';
import { RankBadge } from './RankBadge';
import { ShareButton } from './ShareButton';
import { Badge } from '@/components/ui/badge';
import { RANKINGS_COPY } from '@/app/(rankings)/rankings/i18n';

interface LeaderboardGridProps {
  cards: RankingCard[];
  category: RankingCategory;
  selectedCards: RankingCard[];
  onCardSelect: (card: RankingCard, selected: boolean) => void;
  isCardSelected: (cardId: string) => boolean;
  maxSelections: number;
}

export function LeaderboardGrid({
  cards,
  category,
  selectedCards,
  onCardSelect,
  isCardSelected,
  maxSelections,
}: LeaderboardGridProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatPercent = (percent: number) => {
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{RANKINGS_COPY.grid.empty}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {RANKINGS_COPY.grid.emptyDescription}
        </p>
      </div>
    );
  }

  const isSelectionDisabled = selectedCards.length >= maxSelections;

  return (
    <div className="space-y-2">
      {/* Header (Desktop only) */}
      <div className="hidden md:grid md:grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
        <div className="w-10"></div>
        <div className="w-10">{RANKINGS_COPY.grid.rank}</div>
        <div>{RANKINGS_COPY.grid.card}</div>
        <div className="text-right">{RANKINGS_COPY.grid.price}</div>
        <div className="text-right">{RANKINGS_COPY.grid.change}</div>
        <div className="text-right">{RANKINGS_COPY.grid.volume}</div>
        <div className="text-right w-20">{RANKINGS_COPY.grid.actions}</div>
      </div>

      {/* Card Rows */}
      <div className="space-y-2">
        {cards.map((card) => {
          const selected = isCardSelected(card.cardId);
          const canSelect = selected || !isSelectionDisabled;

          return (
            <div
              key={card.cardId}
              className={`
                grid grid-cols-[auto_auto_1fr_auto] md:grid-cols-[auto_auto_1fr_auto_auto_auto_auto]
                gap-3 md:gap-4 p-3 md:p-4 rounded-lg border bg-card
                hover:shadow-md transition-shadow
                ${selected ? 'ring-2 ring-primary' : ''}
              `}
              role="row"
              tabIndex={0}
              data-testid="ranking-card"
            >
              {/* Checkbox */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => onCardSelect(card, e.target.checked)}
                  disabled={!canSelect}
                  aria-label={`${RANKINGS_COPY.grid.select} ${card.cardName}`}
                  data-testid="card-checkbox"
                  className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                />
              </div>

              {/* Rank Badge */}
              <div className="flex items-center">
                <RankBadge rank={card.rank} />
              </div>

              {/* Card Info */}
              <Link
                href={`/cards/${card.cardId}`}
                className="flex items-center gap-3 min-w-0 hover:opacity-80"
              >
                <Image
                  src={card.thumbnailUrl}
                  alt={card.cardName}
                  width={60}
                  height={84}
                  className="rounded-md object-cover flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{card.cardNameJa}</h3>
                  <p className="text-sm text-muted-foreground truncate">{card.cardName}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    {card.rarity}
                  </Badge>
                  
                  {/* Mobile: Show metrics inline */}
                  <div className="md:hidden flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span
                      className={`flex items-center gap-1 ${
                        card.priceChangePercent > 0
                          ? 'text-green-600'
                          : card.priceChangePercent < 0
                          ? 'text-red-600'
                          : ''
                      }`}
                    >
                      {card.priceChangePercent > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : card.priceChangePercent < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : null}
                      {formatPercent(card.priceChangePercent)}
                    </span>
                    <span>
                      Vol: {category === 'popularity'
                        ? card.transactionCount || 0
                        : card.volume || 0}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Price */}
              <div className="flex items-center justify-end">
                <div className="text-right">
                  <div className="font-semibold">{formatPrice(card.currentPrice)}</div>
                </div>
              </div>

              {/* Change (Desktop only) */}
              <div className="hidden md:flex items-center justify-end">
                <div className="text-right">
                  <div
                    className={`flex items-center gap-1 justify-end ${
                      card.priceChangePercent > 0
                        ? 'text-green-600'
                        : card.priceChangePercent < 0
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {card.priceChangePercent > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : card.priceChangePercent < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : null}
                    <span className="font-medium">
                      {formatPercent(card.priceChangePercent)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatPrice(Math.abs(card.priceChange))}
                  </div>
                </div>
              </div>

              {/* Volume (Desktop only) */}
              <div className="hidden md:flex items-center justify-end">
                <div className="text-sm">
                  {category === 'popularity'
                    ? card.transactionCount || 0
                    : card.volume || 0}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end">
                <ShareButton card={card} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
