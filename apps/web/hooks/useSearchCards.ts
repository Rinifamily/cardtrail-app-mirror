import { useInfiniteQuery } from '@tanstack/react-query';
import { SearchCardsParams } from '@/lib/validations/search';

interface Card {
  id: number;
  card_name: string;
  card_index: string | null;
  rarity: string | null;
  set_name: string;
  set_slug: string;
  image_urls: string | null;
}

interface PaginationMeta {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface SearchResponse {
  data: Card[];
  pagination: PaginationMeta;
}

type SearchCardsInput = Partial<Omit<SearchCardsParams, 'page'>>;

async function fetchSearchCards(
  params: SearchCardsInput,
  pageParam: number = 1
): Promise<SearchResponse> {
  const filteredParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== undefined && value !== null) {
      acc[key] = String(value);
    }
    return acc;
  }, {} as Record<string, string>);

  const searchParams = new URLSearchParams({
    ...filteredParams,
    page: pageParam.toString(),
  });

  const response = await fetch(`/api/search/cards?${searchParams.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch cards');
  }

  return response.json();
}

export function useSearchCards(params: SearchCardsInput) {
  return useInfiniteQuery({
    queryKey: ['searchCards', params],
    queryFn: ({ pageParam = 1 }) => fetchSearchCards(params, pageParam),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_next ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
    staleTime: 60 * 1000,
  });
}
