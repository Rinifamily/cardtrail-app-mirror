import { cn } from '@/lib/utils';

interface Suggestion {
  id: number;
  card_name: string;
  set_name: string;
}

interface AutocompleteDropdownProps {
  suggestions: Suggestion[];
  selectedIndex: number;
  onSelect: (suggestion: Suggestion) => void;
  isLoading?: boolean;
}

export function AutocompleteDropdown({
  suggestions,
  selectedIndex,
  onSelect,
  isLoading,
}: AutocompleteDropdownProps) {
  return (
    <div
      className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
      role="listbox"
      aria-label="Autocomplete suggestions"
    >
      {isLoading ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          Loading suggestions...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No suggestions found
        </div>
      ) : (
        <ul>
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.id}>
              <button
                type="button"
                role="option"
                aria-selected={selectedIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(suggestion)}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b last:border-b-0',
                  selectedIndex === index && 'bg-gray-100'
                )}
              >
                <div className="font-medium text-sm">{suggestion.card_name}</div>
                <div className="text-xs text-muted-foreground">{suggestion.set_name}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
