import type { Tables } from "@/lib/database.types";

export type RangeKey = "24h" | "7d" | "30d" | "ytd";

export type MarketIndexRow = Tables<"market_indices">;

export type CandlestickDatum = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type SubIndexSummary = {
  id: string;
  label: string;
  current: number;
  change: number;
  sparkline: Array<{ date: string; value: number }>;
};

export type TopMover = {
  id: string;
  name: string;
  set: string;
  imageUrl: string;
  price: number;
  change: number;
};

export type VolumeDatum = {
  date: string;
  count: number;
  value: number;
};

export type MarketDashboard = {
  range: RangeKey;
  lastUpdated: string;
  cti: {
    current: number;
    change: number;
    history: CandlestickDatum[];
  };
  subIndices: SubIndexSummary[];
  gainers: TopMover[];
  losers: TopMover[];
  volume: VolumeDatum[];
};

export type MarketDashboardMode = "live" | "placeholder";

export type MarketDashboardResult = {
  mode: MarketDashboardMode;
  data: MarketDashboard;
};

type MarketDataSources =
  | MarketIndexRow[]
  | {
      indices: MarketIndexRow[];
    };

const SUB_INDEX_LABELS: Record<string, string> = {
  vintage: "经典 Vintage",
  modern: "现代 Modern",
  japanese: "日本 Japanese",
  overall: "综合 Overall",
};

const CARD_POOL: Array<{
  id: string;
  name: string;
  set: string;
  imageUrl: string;
  basePrice: number;
  phaseOffset: number;
}> = [
  {
    id: "charizard-ssv",
    name: "Charizard VMAX HR",
    set: "Shiny Star V",
    imageUrl: "https://images.pokemontcg.io/swsh4/charizard_vmax.png",
    basePrice: 3580,
    phaseOffset: 0.12,
  },
  {
    id: "pikachu-25th",
    name: "Pikachu 25th Gold",
    set: "25th Anniversary",
    imageUrl: "https://images.pokemontcg.io/smp/145.png",
    basePrice: 2680,
    phaseOffset: 0.25,
  },
  {
    id: "mewtwo-ur",
    name: "Mewtwo V-Union UR",
    set: "VMAX Climax",
    imageUrl: "https://images.pokemontcg.io/swsh8/6_hires.png",
    basePrice: 1920,
    phaseOffset: 0.41,
  },
  {
    id: "eevee-heroes",
    name: "Sylveon VMAX SA",
    set: "Eevee Heroes",
    imageUrl: "https://images.pokemontcg.io/swsh7/75_hires.png",
    basePrice: 2240,
    phaseOffset: 0.58,
  },
  {
    id: "gengar-alt",
    name: "Gengar VMAX Alt",
    set: "Fusion Arts",
    imageUrl: "https://images.pokemontcg.io/swsh8/157_hires.png",
    basePrice: 2150,
    phaseOffset: 0.73,
  },
  {
    id: "gardevoir-ex",
    name: "Gardevoir ex SAR",
    set: "Scarlet ex",
    imageUrl: "https://images.pokemontcg.io/sv1/245_hires.png",
    basePrice: 1430,
    phaseOffset: 0.89,
  },
  {
    id: "snorlax-alt",
    name: "Snorlax CSR",
    set: "VMAX Climax",
    imageUrl: "https://images.pokemontcg.io/swsh8/131_hires.png",
    basePrice: 980,
    phaseOffset: 1.07,
  },
  {
    id: "lugia-v",
    name: "Lugia V Alt Art",
    set: "Paradigm Trigger",
    imageUrl: "https://images.pokemontcg.io/swsh12/186_hires.png",
    basePrice: 3120,
    phaseOffset: 1.21,
  },
  {
    id: "rayquaza-vmax",
    name: "Rayquaza VMAX HR",
    set: "Blue Sky Stream",
    imageUrl: "https://images.pokemontcg.io/swsh7/217_hires.png",
    basePrice: 2890,
    phaseOffset: 1.38,
  },
  {
    id: "umbreon-vmax",
    name: "Umbreon VMAX SA",
    set: "Evolving Skies",
    imageUrl: "https://images.pokemontcg.io/swsh7/215_hires.png",
    basePrice: 4780,
    phaseOffset: 1.52,
  },
];

const RANGE_TO_DAYS: Record<Exclude<RangeKey, "ytd">, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
};

/**
 * Loads market dashboard data. Falls back to local fixtures when Supabase data
 * is unavailable so development can continue offline.
 */
export async function loadMarketDashboard(
  range: RangeKey = "7d",
): Promise<MarketDashboardResult> {
  try {
    const supabase = await getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("market_indices")
        .select("*")
        .order("date", { ascending: true })
        .limit(120);

      if (error || !data?.length) {
        const fixtures = (await import("../fixtures/market-week.json"))
          .default as MarketIndexRow[];

        return {
          mode: "placeholder",
          data: adaptIndicesToRange(fixtures, range),
        };
      }

      return {
        mode: "live",
        data: adaptIndicesToRange(data, range),
      };
    }
  } catch {
    // Swallow Supabase connectivity issues and fall back to fixtures.
  }

  const fixtures = (await import("../fixtures/market-week.json"))
    .default as MarketIndexRow[];
  return {
    mode: "placeholder",
    data: adaptIndicesToRange(fixtures, range),
  };
}

/**
 * Transforms raw indices into a shape that powers the Market Dashboard UI.
 */
export function adaptIndicesToRange(
  source: MarketDataSources,
  range: RangeKey,
): MarketDashboard {
  const records = Array.isArray(source) ? source : source.indices;
  if (!records.length) {
    return {
      range,
      lastUpdated: new Date().toISOString(),
      cti: { current: 1000, change: 0, history: [] },
      subIndices: [],
      gainers: [],
      losers: [],
      volume: [],
    };
  }

  const sorted = [...records].sort(
    (a, b) => Date.parse(a.date) - Date.parse(b.date),
  );
  const filtered = filterByRange(sorted, range);
  const ctiRows = filtered.filter((row) => row.index_type === "cti");
  const history = buildCandles(ctiRows);
  const currentValue =
    history.at(-1)?.close ?? ctiRows.at(-1)?.value ?? sorted.at(-1)?.value ?? 0;
  const change = calculatePercentageChange(history);
  const lastUpdated =
    ctiRows.at(-1)?.date ?? sorted.at(-1)?.date ?? new Date().toISOString();

  return {
    range,
    lastUpdated,
    cti: {
      current: Number(currentValue.toFixed(2)),
      change: Number(change.toFixed(2)),
      history,
    },
    subIndices: deriveSubIndices(filtered),
    gainers: rankTopGainers(history),
    losers: rankTopLosers(history),
    volume: aggregateVolume(filtered),
  };
}

export function filterByRange(records: MarketIndexRow[], range: RangeKey) {
  if (!records.length) {
    return records;
  }

  const start = getRangeStart(range);
  const subset = records.filter(
    (row) => Date.parse(row.date) >= start.getTime(),
  );
  return subset.length ? subset : records.slice(-30);
}

function getRangeStart(range: RangeKey) {
  const now = new Date();
  if (range === "ytd") {
    return new Date(now.getFullYear(), 0, 1);
  }

  const days = RANGE_TO_DAYS[range];
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function buildCandles(rows: MarketIndexRow[]): CandlestickDatum[] {
  if (!rows.length) {
    return [];
  }

  return rows.map((row, index) => {
    const previousClose = rows[index - 1]?.value ?? row.value;
    const delta = row.value - previousClose;
    const amplitude = Math.max(Math.abs(delta) * 0.6, row.value * 0.0025);
    const open = Number(previousClose.toFixed(2));
    const close = Number(row.value.toFixed(2));
    const high = Number(
      (Math.max(open, close) + amplitude + 0.75).toFixed(2),
    );
    const low = Number(
      (Math.max(0, Math.min(open, close) - amplitude - 0.45)).toFixed(2),
    );

    return {
      date: row.date,
      open,
      close,
      high,
      low,
    };
  });
}

/**
 * Calculates percentage delta between the first and last value in a series.
 */
export function calculatePercentageChange<T extends { value?: number; close?: number }>(
  series: T[],
): number {
  if (series.length < 2) {
    return 0;
  }

  const first = series[0];
  const last = series[series.length - 1];
  const start = typeof first.close === "number" ? first.close : first.value ?? 0;
  const end = typeof last.close === "number" ? last.close : last.value ?? 0;

  if (!start) {
    return 0;
  }

  return ((end - start) / start) * 100;
}

function deriveSubIndices(records: MarketIndexRow[]): SubIndexSummary[] {
  return Object.entries(SUB_INDEX_LABELS)
    .map(([id, label]) => {
      const rows = records.filter((row) => row.index_type === id);
      if (!rows.length) {
        return null;
      }

      const current = rows.at(-1)?.value ?? 0;
      const change = calculatePercentageChange(rows);
      const sparkline = rows.slice(-7).map((row) => ({
        date: row.date,
        value: Number(row.value.toFixed(2)),
      }));

      return {
        id,
        label,
        current: Number(current.toFixed(2)),
        change: Number(change.toFixed(2)),
        sparkline,
      };
    })
    .filter((entry): entry is SubIndexSummary => Boolean(entry));
}

function rankTopGainers(
  history: CandlestickDatum[],
  limit = 5,
): TopMover[] {
  return generateCardMovers(history)
    .sort((a, b) => b.change - a.change)
    .slice(0, limit);
}

function rankTopLosers(history: CandlestickDatum[], limit = 5): TopMover[] {
  return generateCardMovers(history)
    .sort((a, b) => a.change - b.change)
    .slice(0, limit)
    .map((entry) =>
      entry.change > 0
        ? { ...entry, change: Number((-entry.change).toFixed(2)) }
        : entry,
    );
}

function generateCardMovers(history: CandlestickDatum[]): TopMover[] {
  if (!history.length) {
    return CARD_POOL.map((card) => ({
      id: card.id,
      name: card.name,
      set: card.set,
      imageUrl: card.imageUrl,
      price: card.basePrice,
      change: 0,
    }));
  }

  const baseChange = calculatePercentageChange(history);
  const volatility = Math.max(1.4, Math.min(6.5, Math.abs(baseChange)));

  return CARD_POOL.map((card, index) => {
    const oscillation =
      Math.sin(index + card.phaseOffset + history.length * 0.12) *
      (volatility / 2);
    const change = Number((baseChange + oscillation).toFixed(2));
    const price = Number((card.basePrice * (1 + change / 100)).toFixed(2));
    return {
      id: card.id,
      name: card.name,
      set: card.set,
      imageUrl: card.imageUrl,
      price: Math.max(price, card.basePrice * 0.35),
      change,
    };
  });
}

function aggregateVolume(
  records: MarketIndexRow[],
  bars = 3,
): VolumeDatum[] {
  const ctiRows = records
    .filter((row) => row.index_type === "cti" && typeof row.volume === "number")
    .slice(-bars);

  return ctiRows.map((row) => {
    const count = row.volume ?? 0;
    const value = Math.round(count * 120);
    return {
      date: row.date,
      count,
      value,
    };
  });
}

let supabaseClientPromise:
  | Promise<ReturnType<typeof import("@/lib/supabase")["createClient"]> | null>
  | null = null;

async function getSupabaseClient() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = import("@/lib/supabase")
      .then((mod) => mod.createClient())
      .catch(() => null);
  }
  return supabaseClientPromise;
}
