import dynamic from "next/dynamic";
import Link from "next/link";
import { Suspense } from "react";

import {
  loadMarketDashboard,
  type MarketDashboard,
  type RangeKey,
} from "@/lib/data/market";
import { CTIHeroCard } from "@/components/market/CTIHeroCard";
import { TimeframePills } from "@/components/market/TimeframePills";
import { SubIndexCarousel } from "@/components/market/SubIndexCarousel";
import { TopMoversGrid } from "@/components/market/TopMoversGrid";
import { VolumeChart } from "@/components/market/VolumeChart";
import {
  CTIHeroSkeleton,
  ChartSkeleton,
  CarouselSkeleton,
  MoversSkeleton,
  VolumeSkeleton,
} from "@/components/market/Skeletons";

const VALID_RANGES: RangeKey[] = ["24h", "7d", "30d", "ytd"];

const CandlestickChart = dynamic(
  () =>
    import("@/components/market/CandlestickChart").then(
      (mod) => mod.CandlestickChart,
    ),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

type MarketPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function MarketPage({ searchParams }: MarketPageProps) {
  const rangeParam = searchParams?.range;
  const fallbackRange: RangeKey = "7d";
  const range = VALID_RANGES.includes(rangeParam as RangeKey)
    ? (rangeParam as RangeKey)
    : fallbackRange;

  const dashboard = await loadMarketDashboard(range);
  const hasMarketData = dashboard.data.cti.history.length > 0;

  return (
    <div className="container mx-auto space-y-8 px-4 py-8">
      <Suspense fallback={<CTIHeroSkeleton />}>
        <CTIHeroCard
          value={dashboard.data.cti.current}
          change={dashboard.data.cti.change}
          lastUpdated={dashboard.data.lastUpdated}
          mode={dashboard.mode}
        />
      </Suspense>

      <TimeframePills defaultRange={range} />

      {hasMarketData ? (
        <Suspense fallback={<ChartSkeleton />}>
          <CandlestickSection market={dashboard.data} />
        </Suspense>
      ) : (
        <EmptyStateCard />
      )}

      <Suspense fallback={<CarouselSkeleton />}>
        <SubIndexCarousel indices={dashboard.data.subIndices} />
      </Suspense>

      <Suspense fallback={<MoversSkeleton />}>
        <TopMoversGrid
          gainers={dashboard.data.gainers}
          losers={dashboard.data.losers}
        />
      </Suspense>

      <Suspense fallback={<VolumeSkeleton />}>
        <VolumeChart data={dashboard.data.volume} />
      </Suspense>
    </div>
  );
}

function CandlestickSection({ market }: { market: MarketDashboard }) {
  return (
    <section className="space-y-4" aria-labelledby="market-candles">
      <header>
        <p
          id="market-candles"
          className="text-sm font-semibold uppercase tracking-widest text-muted-foreground"
        >
          CTI K线
        </p>
        <p className="text-base text-muted-foreground">
          所选时间框架（{market.range.toUpperCase()}）的开高低收视图。
        </p>
      </header>
      <CandlestickChart data={market.cti.history} />
    </section>
  );
}

function EmptyStateCard() {
  return (
    <section className="rounded-2xl border border-dashed border-border/70 bg-card/60 p-6 text-center">
      <p className="text-lg font-semibold">
        市场数据准备中
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Phase 07 将提供实时 CTI 数据流。查看下方说明了解详情。
      </p>
      <Link
        href="https://github.com/cardtrail/cardtrail-app/blob/main/planning/feature-breakdown.md#phase-07-market-ingestion"
        className="mt-4 inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-blue-600 transition hover:border-blue-500 hover:bg-blue-50"
      >
        查看 Phase 07 说明
      </Link>
    </section>
  );
}
