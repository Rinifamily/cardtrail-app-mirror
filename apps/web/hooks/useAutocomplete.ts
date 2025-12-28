import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from './useDebouncedValue';

interface AutocompleteResult {
  id: number;
  card_name: string;
  set_name: string;
}

async function fetchAutocomplete(query: string): Promise<AutocompleteResult[]> {
  if (!query || query.length < 1) return [];

  const searchParams = new URLSearchParams({
    q: query,
    limit: '8',
  });

  const response = await fetch(`/api/search/autocomplete?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch autocomplete suggestions');
  }

  const result = await response.json();

  return result.data.map((card: any) => ({
    id: card.id,
    card_name: card.card_name,
    set_name: card.set_name,
  }));
}

export function useAutocomplete(query: string) {
  const debouncedQuery = useDebouncedValue(query, 300);

  return useQuery({
    queryKey: ['autocomplete', debouncedQuery],
    queryFn: () => fetchAutocomplete(debouncedQuery),
    enabled: debouncedQuery.length >= 1,
    staleTime: 5 * 60 * 1000,
  });
}
