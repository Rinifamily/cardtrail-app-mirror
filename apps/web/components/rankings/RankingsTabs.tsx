'use client';

import { type KeyboardEvent } from 'react';
import type { RankingCategory } from '@/types/rankings';
import { RANKINGS_COPY } from '@/app/(rankings)/rankings/i18n';

interface RankingsTabsProps {
  activeCategory: RankingCategory;
  onCategoryChange: (category: RankingCategory) => void;
}

const tabs: RankingCategory[] = ['gainers', 'fallers', 'volume', 'popularity'];

export function RankingsTabs({ activeCategory, onCategoryChange }: RankingsTabsProps) {
  const handleKeyDown = (e: KeyboardEvent, currentIndex: number) => {
    let newIndex = currentIndex;
    
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = tabs.length - 1;
    }
    
    if (newIndex !== currentIndex) {
      onCategoryChange(tabs[newIndex]);
    }
  };

  return (
    <div 
      className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b"
      role="tablist"
      aria-label="Rankings categories"
    >
      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab, index) => {
          const isActive = activeCategory === tab;
          const tabInfo = RANKINGS_COPY.tabs[tab];
          
          return (
            <button
              key={tab}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab}-panel`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onCategoryChange(tab)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`
                flex-1 min-w-[140px] px-4 py-3 text-sm font-medium transition-colors
                border-b-2 whitespace-nowrap
                ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                }
              `}
            >
              <span className="block">{tabInfo.zh}</span>
              <span className="block text-xs opacity-70">{tabInfo.en}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
