'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AutocompleteDropdown } from './AutocompleteDropdown';
import { useAutocomplete } from '@/hooks/useAutocomplete';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search for Pokemon cards...',
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: suggestions = [], isLoading } = useAutocomplete(value);

  const showDropdown = isFocused && value.length >= 1 && suggestions.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'Enter') {
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          onChange(suggestions[selectedIndex].card_name);
          setSelectedIndex(-1);
          setIsFocused(false);
        }
        onSubmit();
        break;
      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  const handleClear = () => {
    onChange('');
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: { card_name: string }) => {
    onChange(suggestion.card_name);
    setSelectedIndex(-1);
    setIsFocused(false);
    onSubmit();
  };

  useEffect(() => {
    if (!isFocused) {
      setSelectedIndex(-1);
    }
  }, [isFocused]);

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={placeholder}
          aria-label="Search cards"
          className="pl-10 pr-10 h-12 rounded-full"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {(showDropdown || isLoading) && (
        <AutocompleteDropdown
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={handleSuggestionClick}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
