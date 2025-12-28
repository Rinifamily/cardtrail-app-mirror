import Image from "next/image";

import type { TopMover } from "@/lib/data/market";
import { cn } from "@/lib/utils";

type TopMoversGridProps = {
  gainers: TopMover[];
  losers: TopMover[];
};

export function TopMoversGrid({ gainers, losers }: TopMoversGridProps) {
  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          领涨 / 领跌
        </p>
        <p className="text-base text-muted-foreground">
          中国市场惯例：红涨 / 绿跌
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <MoversColumn
          title="今日领涨"
          items={gainers}
          trend="up"
          dataTestId="gainers-list"
        />
        <MoversColumn
          title="调整阵列"
          items={losers}
          trend="down"
          dataTestId="losers-list"
        />
      </div>
    </section>
  );
}

type MoversColumnProps = {
  title: string;
  items: TopMover[];
  trend: "up" | "down";
  dataTestId: string;
};

function MoversColumn({
  title,
  items,
  trend,
  dataTestId,
}: MoversColumnProps) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      {!items.length ? (
        <p className="mt-6 text-sm text-muted-foreground">
          暂无记录
        </p>
      ) : (
        <ul className="mt-4 space-y-3" data-testid={dataTestId}>
          {items.slice(0, 5).map((mover) => (
            <li
              key={mover.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-transparent px-2 py-1 transition hover:border-border/70"
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
                  <Image
                    src={mover.imageUrl}
                    alt={mover.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {mover.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {mover.set}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  ¥{mover.price.toFixed(2)}
                </p>
                <span
                  className={cn(
                    "inline-flex min-w-[64px] justify-end text-sm font-semibold",
                    trend === "up" ? "text-red-500" : "text-green-500",
                  )}
                >
                  {mover.change >= 0 ? "+" : ""}
                  {mover.change.toFixed(2)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
