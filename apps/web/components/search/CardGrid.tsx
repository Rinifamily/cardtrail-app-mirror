import { CardGridItem } from './CardGridItem';
import { Skeleton } from '@/components/ui/skeleton';

interface Card {
  id: number;
  card_name: string;
  card_index: string | null;
  rarity: string | null;
  set_name: string;
  set_slug: string;
  image_urls: string | null;
}

interface CardGridProps {
  cards: Card[];
  onCardClick: (card: Card) => void;
}

export function CardGrid({ cards, onCardClick }: CardGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <CardGridItem key={card.id} card={card} onClick={() => onCardClick(card)} />
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-xl overflow-hidden">
          <Skeleton className="aspect-[2.5/3.5] w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
