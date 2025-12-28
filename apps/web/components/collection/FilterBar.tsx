'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  gradeFilter: string;
  onGradeChange: (value: string) => void;
}

export function FilterBar({
  searchTerm,
  onSearchChange,
  gradeFilter,
  onGradeChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="按卡牌 ID 或备注搜索..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grade Filter */}
      <select
        value={gradeFilter}
        onChange={(e) => onGradeChange(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        <option value="">所有评级</option>
        <option value="raw">裸卡</option>
        <option value="psa8">PSA 8</option>
        <option value="psa9">PSA 9</option>
        <option value="psa10">PSA 10</option>
      </select>
    </div>
  );
}
