'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import type { RankingCard } from '@/types/rankings';
import { Button } from '@/components/ui/button';
import { RANKINGS_COPY } from '@/app/(rankings)/rankings/i18n';

interface ComparisonDrawerProps {
  selectedCards: RankingCard[];
  onClear: () => void;
  onRemoveCard: (cardId: string) => void;
}

export function ComparisonDrawer({
  selectedCards,
  onClear,
  onRemoveCard,
}: ComparisonDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const isOpen = selectedCards.length >= 2;

  // Handle ESC key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    // Focus first focusable element
    const focusable = drawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusable[0] as HTMLElement;
    const lastFocusable = focusable[focusable.length - 1] as HTMLElement;

    firstFocusable?.focus();

    // Handle keyboard events
    function handleKeyboard(e: KeyboardEvent) {
      // ESC to close
      if (e.key === 'Escape') {
        onClear();
        return;
      }

      // Tab trap
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    }

    drawer.addEventListener('keydown', handleKeyboard);
    return () => drawer.removeEventListener('keydown', handleKeyboard);
  }, [isOpen, onClear]);

  if (!isOpen) return null;

  const compareUrl = `/compare?ids=${selectedCards.map(c => c.cardId).join(',')}`;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClear}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 md:right-0 md:left-auto md:top-0 md:bottom-0 md:w-96
                   bg-card border-t md:border-l md:border-t-0 shadow-lg z-50
                   animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 id="drawer-title" className="text-lg font-semibold">
              {RANKINGS_COPY.comparison.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedCards.length} {RANKINGS_COPY.comparison.of} 3 {RANKINGS_COPY.comparison.selected}
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onClear} aria-label="Close drawer">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Selected Cards */}
        <div className="p-4 space-y-3 max-h-[60vh] md:max-h-[calc(100vh-200px)] overflow-y-auto">
          {selectedCards.map((card) => (
            <div
              key={card.cardId}
              className="flex items-center gap-3 p-3 rounded-lg border bg-background"
            >
              <Image
                src={card.thumbnailUrl}
                alt={card.cardName}
                width={48}
                height={67}
                className="rounded object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{card.cardNameJa}</h3>
                <p className="text-xs text-muted-foreground truncate">{card.cardName}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onRemoveCard(card.cardId)}
                aria-label={`Remove ${card.cardName}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-4 border-t space-y-2">
          <Link href={compareUrl}>
            <Button className="w-full" size="lg">
              {RANKINGS_COPY.comparison.compareButton} {selectedCards.length} {RANKINGS_COPY.grid.card}
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full"
            onClick={onClear}
          >
            {RANKINGS_COPY.comparison.clear}
          </Button>
        </div>
      </div>
    </>
  );
}
