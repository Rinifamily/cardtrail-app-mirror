import { Suspense } from 'react';
import { Metadata } from 'next';
import { getRankings } from '@/lib/data/rankings';
import { 
  isValidCategory, 
  isValidTimeframe, 
  isValidRarity, 
  isValidLanguage,
  type RankingsFilters,
  type RankingsPageProps,
  type RankingCategory,
  type Timeframe,
  type Rarity,
  type Language
} from '@/types/rankings';
import { RankingsContent } from './RankingsContent';
import { RankingsSkeleton } from '@/components/rankings/RankingsSkeleton';

export const metadata: Metadata = {
  title: 'Rankings | CardTrail',
  description: 'Discover trending Pokémon TCG cards with price gainers, fallers, volume leaders, and popularity rankings.',
};

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  // Parse and validate search params
  const category: RankingCategory = isValidCategory(searchParams.category || '') 
    ? (searchParams.category as RankingCategory)
    : 'gainers';
  const timeframe: Timeframe = isValidTimeframe(searchParams.timeframe || '') 
    ? (searchParams.timeframe as Timeframe)
    : '24h';
  const rarity = searchParams.rarity && isValidRarity(searchParams.rarity)
    ? (searchParams.rarity as Rarity)
    : undefined;
  const language = searchParams.language && isValidLanguage(searchParams.language)
    ? (searchParams.language as Language)
    : undefined;
  const grade = searchParams.grade && typeof searchParams.grade === 'string'
    ? searchParams.grade
    : undefined;

  const filters: RankingsFilters = {
    category,
    timeframe,
    rarity,
    language,
    grade,
  };

  // Fetch rankings data server-side
  const rankings = await getRankings(filters);

  return (
    <Suspense fallback={<RankingsSkeleton />}>
      <RankingsContent initialData={rankings} initialFilters={filters} />
    </Suspense>
  );
}
