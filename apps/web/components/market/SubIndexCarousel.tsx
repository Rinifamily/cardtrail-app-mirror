import type { SubIndexSummary } from "@/lib/data/market";
import { cn } from "@/lib/utils";

type SubIndexCarouselProps = {
  indices: SubIndexSummary[];
};

const DISPLAY_NAMES: Record<string, string> = {
  vintage: "经典",
  modern: "现代",
  japanese: "日本",
  overall: "综合",
};

export function SubIndexCarousel({ indices }: SubIndexCarouselProps) {
  if (!indices?.length) {
    return (
      <section className="rounded-2xl border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
        子板块尚无数据
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          分项指数
        </p>
        <p className="text-base text-muted-foreground">
          经典、现代、日版等板块的 7 日走势
        </p>
      </header>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background via-background/60 to-transparent" />
        <div
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 pr-4"
          data-testid="subindex-carousel"
        >
          {indices.map((index) => (
            <article
              key={index.id}
              className="min-w-[160px] snap-start rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {DISPLAY_NAMES[index.id] ?? index.label}
              </p>
              <p className="mt-2 text-xl font-semibold">
                {index.current.toFixed(2)}
              </p>
              <p
                className={cn(
                  "mt-1 text-sm font-medium",
                  index.change >= 0 ? "text-red-500" : "text-green-500",
                )}
              >
                {index.change >= 0 ? "+" : ""}
                {index.change.toFixed(2)}%
              </p>
              <Sparkline
                data={index.sparkline}
                positive={index.change >= 0}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

type SparklineProps = {
  data: Array<{ date: string; value: number }>;
  positive: boolean;
};

function Sparkline({ data, positive }: SparklineProps) {
  if (!data.length) {
    return (
      <div className="mt-3 h-12 rounded-lg bg-muted/40" aria-hidden="true" />
    );
  }

  const values = data.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 136;
  const height = 48;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      className="mt-3 h-12 w-full"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="7-day sparkline"
    >
      <polyline
        fill="none"
        stroke={positive ? "#dc2626" : "#16a34a"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
