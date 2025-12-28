'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RankingCard } from '@/types/rankings';
import { RANKINGS_COPY } from '@/app/(rankings)/rankings/i18n';

interface ShareButtonProps {
  card: RankingCard;
}

export function ShareButton({ card }: ShareButtonProps) {
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const handleShare = async () => {
    const shareData = {
      title: `${card.cardName} - ${RANKINGS_COPY.share.title}`,
      text: `${RANKINGS_COPY.share.text} ${card.cardName} (${card.cardNameJa})`,
      url: `${window.location.origin}/cards/${card.cardId}`,
    };

    try {
      // Try Web Share API first
      if (navigator.share) {
        await navigator.share(shareData);
        console.log('[Share Action]', card.cardId, 'via Web Share API');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus(RANKINGS_COPY.share.success);
        setTimeout(() => setShareStatus(null), 2000);
        console.log('[Share Action]', card.cardId, 'copied to clipboard');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('[Share Error]', error);
        setShareStatus(RANKINGS_COPY.share.error);
        setTimeout(() => setShareStatus(null), 2000);
      }
    }
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        onClick={handleShare}
        aria-label={`${RANKINGS_COPY.share.button} ${card.cardName}`}
        data-testid="share-button"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      {shareStatus && (
        <div 
          className="absolute top-full mt-1 right-0 text-xs bg-black text-white px-2 py-1 rounded whitespace-nowrap z-10"
          role="status"
          aria-live="polite"
        >
          {shareStatus}
        </div>
      )}
    </div>
  );
}
