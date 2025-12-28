'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface FilterPanelProps {
  rarity: string;
  onRarityChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  setSlug: string;
  onSetChange: (value: string) => void;
  sets: { slug: string; name: string }[];
  isLoading?: boolean;
}

function truncateSetName(name: string, maxLength: number = 25): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '...';
}

export function FilterPanel({
  rarity,
  onRarityChange,
  sort,
  onSortChange,
  setSlug,
  onSetChange,
  sets,
  isLoading,
}: FilterPanelProps) {
  const [setSearchQuery, setSetSearchQuery] = useState('');
  const [isSetDropdownOpen, setIsSetDropdownOpen] = useState(false);
  const setDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (setDropdownRef.current && !setDropdownRef.current.contains(event.target as Node)) {
        setIsSetDropdownOpen(false);
        setSetSearchQuery('');
      }
    };

    if (isSetDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isSetDropdownOpen]);

  const rarities = [
    { value: '', label: '全部稀有度' },
    { value: 'Common', label: 'Common' },
    { value: 'Uncommon', label: 'Uncommon' },
    { value: 'Rare', label: 'Rare' },
    { value: 'Holo Rare', label: 'Holo Rare' },
    { value: 'Ultra Rare', label: 'Ultra Rare' },
    { value: 'Super Rare', label: 'Super Rare' },
    { value: 'Super Rare Holo', label: 'Super Rare Holo' },
    { value: 'Hyper Rare', label: 'Hyper Rare' },
    { value: 'Art Rare', label: 'Art Rare' },
    { value: 'Special Art Rare', label: 'Special Art Rare' },
    { value: 'Double Rare', label: 'Double Rare' },
    { value: 'Triple Rare', label: 'Triple Rare' },
    { value: 'ACE Rare', label: 'ACE Rare' },
    { value: 'Amazing Rare', label: 'Amazing Rare' },
    { value: 'Shiny Rare', label: 'Shiny Rare' },
    { value: 'Shiny Secret Rare', label: 'Shiny Secret Rare' },
    { value: 'Prism Rare', label: 'Prism Rare' },
    { value: 'Trainer Rare', label: 'Trainer Rare' },
    { value: 'Mega Attack Rare', label: 'Mega Attack Rare' },
    { value: 'Rare Holo LV.X', label: 'Rare Holo LV.X' },
    { value: 'Ultra-Rare Common', label: 'Ultra-Rare Common' },
    { value: 'Ultra-Rare Uncommon', label: 'Ultra-Rare Uncommon' },
    { value: 'Shining', label: 'Shining' },
    { value: 'Kagayaku', label: 'Kagayaku' },
    { value: 'Promo', label: 'Promo' },
  ];

  const sortOptions = [
    { value: 'relevance', label: '相关度' },
    { value: 'name_asc', label: '名称 (A-Z)' },
    { value: 'name_desc', label: '名称 (Z-A)' },
    { value: 'year_desc', label: '最新优先' },
  ];

  const selectClass =
    'px-3 py-1.5 border rounded-full text-sm bg-white disabled:cursor-not-allowed disabled:opacity-60';

  // Filter sets based on search query
  const filteredSets = useMemo(() => {
    if (!setSearchQuery.trim()) return sets;
    const query = setSearchQuery.toLowerCase();
    return sets.filter(set => 
      set.name.toLowerCase().includes(query) ||
      set.slug.toLowerCase().includes(query)
    );
  }, [sets, setSearchQuery]);

  // Get current set name
  const currentSetName = sets.find(s => s.slug === setSlug)?.name || '所有系列';

  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap mb-6">
      <div className="flex gap-2 items-center min-w-0">
        <label className="text-sm font-medium shrink-0" htmlFor="rarity-filter">
          稀有度：
        </label>
        <select
          id="rarity-filter"
          value={rarity}
          onChange={(event) => onRarityChange(event.target.value)}
          className={`${selectClass} w-full sm:w-auto max-w-[200px]`}
        >
          {rarities.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 items-center min-w-0">
        <label className="text-sm font-medium shrink-0" htmlFor="sort-filter">
          排序：
        </label>
        <select
          id="sort-filter"
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          className={`${selectClass} w-full sm:w-auto`}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2 items-center min-w-0 relative">
        <label className="text-sm font-medium shrink-0">
          系列：
        </label>
        <div className="relative w-full sm:w-auto min-w-[200px]" ref={setDropdownRef}>
          <button
            type="button"
            onClick={() => setIsSetDropdownOpen(!isSetDropdownOpen)}
            className={`${selectClass} w-full text-left flex items-center justify-between`}
            disabled={isLoading}
          >
            <span className="truncate">{truncateSetName(currentSetName, 20)}</span>
            <svg className="w-4 h-4 ml-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isSetDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
              {/* Search input */}
              <div className="p-2 border-b sticky top-0 bg-white">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={setSearchQuery}
                    onChange={(e) => setSetSearchQuery(e.target.value)}
                    placeholder="搜索系列..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              
              {/* Options list */}
              <div className="overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    onSetChange('');
                    setIsSetDropdownOpen(false);
                    setSetSearchQuery('');
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-b"
                >
                  所有系列
                </button>
                {filteredSets.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    未找到匹配的系列
                  </div>
                ) : (
                  filteredSets.map((set) => (
                    <button
                      key={set.slug}
                      type="button"
                      onClick={() => {
                        onSetChange(set.slug);
                        setIsSetDropdownOpen(false);
                        setSetSearchQuery('');
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                        setSlug === set.slug ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                      title={set.name}
                    >
                      {set.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
