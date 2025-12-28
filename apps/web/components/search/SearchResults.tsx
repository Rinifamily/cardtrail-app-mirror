import { CardGrid, CardGridSkeleton } from './CardGrid';
import { Button } from '@/components/ui/button';

interface Card {
  id: number;
  card_name: string;
  card_index: string | null;
  rarity: string | null;
  set_name: string;
  set_slug: string;
  image_urls: string | null;
}

interface SearchResultsProps {
  cards: Card[];
  totalItems: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onRetry: () => void;
  onCardClick: (card: Card) => void;
  onLoadMore: () => void;
  isFetchingNextPage: boolean;
  hasNextPage?: boolean;
}

export function SearchResults({
  cards,
  totalItems,
  isLoading,
  isError,
  error,
  onRetry,
  onCardClick,
  onLoadMore,
  isFetchingNextPage,
  hasNextPage,
}: SearchResultsProps) {
  if (isLoading) {
    return <CardGridSkeleton count={20} />;
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error: {error?.message}</p>
        <Button onClick={onRetry} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No cards found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 text-sm text-muted-foreground">
        Found {totalItems.toLocaleString()} cards
      </div>

      <CardGrid cards={cards} onCardClick={onCardClick} />

      <div className="mt-8 flex items-center justify-center">
        {hasNextPage ? (
          <Button
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            variant="outline"
            size="lg"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More'}
          </Button>
        ) : (
          cards.length > 0 && (
            <p className="text-sm text-muted-foreground">End of results</p>
          )
        )}
      </div>
    </div>
  );
}
