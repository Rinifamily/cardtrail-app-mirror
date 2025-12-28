'use client';

import { useState } from 'react';
import type { Timeframe, Rarity, Language } from '@/types/rankings';
import { Button } from '@/components/ui/button';
import { RANKINGS_COPY, TIMEFRAME_OPTIONS, GRADE_OPTIONS, RARITY_OPTIONS, LANGUAGE_OPTIONS } from '@/app/(rankings)/rankings/i18n';

interface FilterBarProps {
  activeTimeframe: Timeframe;
  activeRarity?: Rarity;
  activeGrade?: string;
  activeLanguage?: Language;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onRarityChange: (rarity?: Rarity) => void;
  onGradeChange: (grade?: string) => void;
  onLanguageChange: (language?: Language) => void;
}

export function FilterBar({
  activeTimeframe,
  activeRarity,
  activeGrade,
  activeLanguage,
  onTimeframeChange,
  onRarityChange,
  onGradeChange,
  onLanguageChange,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-4">
      {/* Timeframe Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground">{RANKINGS_COPY.filters.timeframe}:</span>
        <div className="flex gap-2">
          {TIMEFRAME_OPTIONS.map((tf) => (
            <Button
              key={tf.value}
              size="sm"
              variant={activeTimeframe === tf.value ? 'default' : 'outline'}
              onClick={() => onTimeframeChange(tf.value as Timeframe)}
              aria-pressed={activeTimeframe === tf.value}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Mobile: Collapsible Filters */}
      <div className="md:hidden">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full"
        >
          {showFilters ? RANKINGS_COPY.filters.hideFilters : RANKINGS_COPY.filters.showFilters}
        </Button>
      </div>

      {/* Desktop Inline Filters + Mobile Sheet */}
      <div className={`space-y-3 ${showFilters ? 'block' : 'hidden md:block'}`}>
        {/* Grade Filter */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground pt-1">{RANKINGS_COPY.filters.grade}:</span>
          <div className="flex gap-2 flex-wrap">
            {GRADE_OPTIONS.map((g) => (
              <Button
                key={g.value || 'all'}
                size="sm"
                variant={activeGrade === g.value ? 'default' : 'outline'}
                onClick={() => onGradeChange(g.value || undefined)}
                aria-pressed={activeGrade === g.value}
              >
                {g.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Rarity Filter */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground pt-1">{RANKINGS_COPY.filters.rarity}:</span>
          <div className="flex gap-2 flex-wrap">
            {RARITY_OPTIONS.map((r) => (
              <Button
                key={r.value || 'all'}
                size="sm"
                variant={activeRarity === r.value ? 'default' : 'outline'}
                onClick={() => onRarityChange((r.value as Rarity) || undefined)}
                aria-pressed={activeRarity === r.value}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Language Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">{RANKINGS_COPY.filters.language}:</span>
          <div className="flex gap-2 flex-wrap">
            {LANGUAGE_OPTIONS.map((lang) => (
              <Button
                key={lang.value || 'all'}
                size="sm"
                variant={activeLanguage === lang.value ? 'default' : 'outline'}
                onClick={() => onLanguageChange((lang.value as Language) || undefined)}
                aria-pressed={activeLanguage === lang.value}
              >
                {lang.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      {showFilters && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setShowFilters(false)}
        >
          <div 
            className="absolute inset-x-0 bottom-0 bg-background rounded-t-2xl p-6 shadow-xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">{RANKINGS_COPY.filters.showFilters}</h3>
            
            {/* Mobile filter content - same as above but in bottom sheet */}
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">{RANKINGS_COPY.filters.grade}</p>
                <div className="flex gap-2 flex-wrap">
                  {GRADE_OPTIONS.map((g) => (
                    <Button
                      key={g.value || 'all'}
                      size="sm"
                      variant={activeGrade === g.value ? 'default' : 'outline'}
                      onClick={() => onGradeChange(g.value || undefined)}
                    >
                      {g.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">{RANKINGS_COPY.filters.rarity}</p>
                <div className="flex gap-2 flex-wrap">
                  {RARITY_OPTIONS.map((r) => (
                    <Button
                      key={r.value || 'all'}
                      size="sm"
                      variant={activeRarity === r.value ? 'default' : 'outline'}
                      onClick={() => onRarityChange((r.value as Rarity) || undefined)}
                    >
                      {r.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">{RANKINGS_COPY.filters.language}</p>
                <div className="flex gap-2 flex-wrap">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <Button
                      key={lang.value || 'all'}
                      size="sm"
                      variant={activeLanguage === lang.value ? 'default' : 'outline'}
                      onClick={() => onLanguageChange((lang.value as Language) || undefined)}
                    >
                      {lang.label}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                className="w-full mt-4"
                onClick={() => setShowFilters(false)}
              >
                {RANKINGS_COPY.filters.apply}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
