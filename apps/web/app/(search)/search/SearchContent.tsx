'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SearchBar } from '@/components/search/SearchBar';
import { FilterPanel } from '@/components/search/FilterPanel';
import { SearchResults } from '@/components/search/SearchResults';
import { useSearchCards } from '@/hooks/useSearchCards';

const FILTER_OPTIONS_ENDPOINT = '/api/search/filter-options';

type SortOption = 'relevance' | 'name_asc' | 'name_desc' | 'year_desc';

interface FilterOptionsResponse {
  sets: { slug: string; name: string }[];
}

export function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [rarity, setRarity] = useState(searchParams.get('rarity') || '');
  const [setSlug, setSetSlug] = useState(searchParams.get('set') || '');
  const [sort, setSort] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'relevance'
  );

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
    setRarity(searchParams.get('rarity') || '');
    setSetSlug(searchParams.get('set') || '');
    setSort((searchParams.get('sort') as SortOption) || 'relevance');
  }, [searchParams]);

  const { data: filterOptions, isLoading: isLoadingFilters } = useQuery<FilterOptionsResponse>({
    queryKey: ['search-filter-options'],
    queryFn: async () => {
      const response = await fetch(FILTER_OPTIONS_ENDPOINT);
      if (!response.ok) {
        throw new Error('Failed to load filter options');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000,
  });

  const computedParams = useMemo(
    () => ({
      q: query || undefined,
      rarity: rarity || undefined,
      set: setSlug || undefined,
      sort,
      limit: 20,
    }),
    [query, rarity, setSlug, sort]
  );

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useSearchCards(computedParams);

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  useEffect(() => {
    if (query || rarity || setSlug) {
      console.info('[search-metric]', { q: query, rarity, set: setSlug, sort });
    }
  }, [query, rarity, setSlug, sort]);

  const pushSearchParams = (
    nextQuery: string,
    nextRarity: string,
    nextSort: SortOption,
    nextSet: string
  ) => {
    const params = new URLSearchParams();
    if (nextQuery) params.set('q', nextQuery);
    if (nextRarity) params.set('rarity', nextRarity);
    if (nextSet) params.set('set', nextSet);
    if (nextSort !== 'relevance') params.set('sort', nextSort);

    const queryString = params.toString();
    router.push(queryString ? `/search?${queryString}` : '/search');
  };

  const handleSearch = () => {
    pushSearchParams(query, rarity, sort, setSlug);
  };

  const handleRarityChange = (value: string) => {
    setRarity(value);
    pushSearchParams(query, value, sort, setSlug);
  };

  const handleSortChange = (value: string) => {
    const nextSort = (value as SortOption) || 'relevance';
    setSort(nextSort);
    pushSearchParams(query, rarity, nextSort, setSlug);
  };

  const handleSetChange = (value: string) => {
    setSetSlug(value);
    pushSearchParams(query, rarity, sort, value);
  };

  const handleCardClick = (card: { id: number }) => {
    router.push(`/cards/${card.id}`);
  };

  const allCards = data?.pages.flatMap((page) => page.data) ?? [];
  const totalItems = data?.pages[0]?.pagination.total_items ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto mb-8">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSearch}
          placeholder="Search for Pokemon cards..."
        />
      </div>

      <div className="mb-6">
        <FilterPanel
          rarity={rarity}
          onRarityChange={handleRarityChange}
          sort={sort}
          onSortChange={handleSortChange}
          setSlug={setSlug}
          onSetChange={handleSetChange}
          sets={filterOptions?.sets ?? []}
          isLoading={isLoadingFilters}
        />
      </div>

      <SearchResults
        cards={allCards}
        totalItems={totalItems}
        isLoading={isLoading}
        isError={isError}
        error={error as Error | null}
        onRetry={() => {
          refetch();
        }}
        onCardClick={handleCardClick}
        onLoadMore={handleLoadMore}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={hasNextPage}
      />
    </div>
  );
}

export default SearchContent;
