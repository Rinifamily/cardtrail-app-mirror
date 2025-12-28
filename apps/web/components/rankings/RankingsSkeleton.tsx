import { Skeleton } from '@/components/ui/skeleton';
import { RANKINGS_COPY } from '@/app/(rankings)/rankings/i18n';

export function RankingsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-4 border-b overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-32 flex-shrink-0 mb-[-1px]" />
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
        <div className="hidden md:block">
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Loading message */}
      <div className="text-center text-muted-foreground text-sm">
        {RANKINGS_COPY.grid.loading}
      </div>

      {/* Cards Skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_auto_1fr_auto] md:grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-3 md:gap-4 p-3 md:p-4 rounded-lg border bg-card animate-pulse"
          >
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-20 w-14 rounded-md flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-full max-w-[200px]" />
                <Skeleton className="h-3 w-full max-w-[150px]" />
                <Skeleton className="h-5 w-16 mt-1" />
              </div>
            </div>
            <Skeleton className="h-6 w-16" />
            <Skeleton className="hidden md:block h-6 w-16" />
            <Skeleton className="hidden md:block h-6 w-12" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}
