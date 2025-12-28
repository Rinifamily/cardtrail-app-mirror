export function CTIHeroSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border/60 bg-card/50 p-6">
      <div className="h-4 w-40 rounded bg-muted" />
      <div className="mt-4 flex items-center gap-4">
        <div className="h-12 w-32 rounded bg-muted" />
        <div className="h-6 w-20 rounded-full bg-muted/80" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={`cti-metric-${index}`} />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-[240px] w-full animate-pulse rounded-2xl border border-border/60 bg-card/40 md:h-[320px] lg:h-[360px]">
      <div className="h-full w-full rounded-2xl bg-muted/30" />
    </div>
  );
}

export function CarouselSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`carousel-skeleton-${index}`}
          className="h-32 w-40 animate-pulse rounded-2xl border border-border/50 bg-card/60"
        />
      ))}
    </div>
  );
}

export function MoversSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }).map((_, column) => (
        <div
          key={`movers-column-${column}`}
          className="space-y-3 rounded-2xl border border-border/70 bg-card/70 p-4"
        >
          {Array.from({ length: 4 }).map((__, row) => (
            <div
              key={`movers-row-${column}-${row}`}
              className="flex items-center gap-3"
            >
              <div className="h-12 w-12 rounded-xl bg-muted/70" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 rounded bg-muted/70" />
                <div className="h-3 w-1/2 rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function VolumeSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-2xl border border-border/60 bg-card/60" />
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/70 p-4">
      <div className="h-3 w-24 rounded bg-muted/70" />
      <div className="mt-3 h-6 w-20 rounded bg-muted" />
      <div className="mt-2 h-3 w-32 rounded bg-muted/60" />
    </div>
  );
}
