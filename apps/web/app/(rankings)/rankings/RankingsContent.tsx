'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { RankingCard, RankingsFilters } from '@/types/rankings';
import { RankingsTabs } from '@/components/rankings/RankingsTabs';
import { FilterBar } from '@/components/rankings/FilterBar';
import { LeaderboardGrid } from '@/components/rankings/LeaderboardGrid';
import { ComparisonDrawer } from '@/components/rankings/ComparisonDrawer';
import { RANKINGS_COPY } from './i18n';

interface RankingsContentProps {
  initialData: RankingCard[];
  initialFilters: RankingsFilters;
}

export function RankingsContent({ initialData, initialFilters }: RankingsContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedCards, setSelectedCards] = useState<RankingCard[]>([]);

  const handleFilterChange = (newFilters: Partial<RankingsFilters>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/rankings?${params.toString()}`);
  };

  const handleCardSelection = (card: RankingCard, selected: boolean) => {
    if (selected) {
      if (selectedCards.length < 3) {
        setSelectedCards([...selectedCards, card]);
      }
    } else {
      setSelectedCards(selectedCards.filter(c => c.cardId !== card.cardId));
    }
  };

  const handleClearSelection = () => {
    setSelectedCards([]);
  };

  const isCardSelected = (cardId: string) => {
    return selectedCards.some(c => c.cardId === cardId);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{RANKINGS_COPY.hero.title}</h1>
          <p className="text-muted-foreground">
            {RANKINGS_COPY.hero.subtitle}
          </p>
        </div>

        {/* Tabs */}
        <RankingsTabs 
          activeCategory={initialFilters.category}
          onCategoryChange={(category) => handleFilterChange({ category })}
        />

        {/* Filters */}
        <FilterBar
          activeTimeframe={initialFilters.timeframe}
          activeRarity={initialFilters.rarity}
          activeGrade={initialFilters.grade}
          activeLanguage={initialFilters.language}
          onTimeframeChange={(timeframe) => handleFilterChange({ timeframe })}
          onRarityChange={(rarity) => handleFilterChange({ rarity })}
          onGradeChange={(grade) => handleFilterChange({ grade })}
          onLanguageChange={(language) => handleFilterChange({ language })}
        />

        {/* Leaderboard */}
        <LeaderboardGrid
          cards={initialData}
          category={initialFilters.category}
          selectedCards={selectedCards}
          onCardSelect={handleCardSelection}
          isCardSelected={isCardSelected}
          maxSelections={3}
        />

        {/* Comparison Drawer */}
        {selectedCards.length >= 2 && (
          <ComparisonDrawer
            selectedCards={selectedCards}
            onClear={handleClearSelection}
            onRemoveCard={(cardId) => {
              setSelectedCards(selectedCards.filter(c => c.cardId !== cardId));
            }}
          />
        )}
      </div>
    </div>
  );
}
