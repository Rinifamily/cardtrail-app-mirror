import { describe, expect, it } from "vitest";

import type { MarketIndexRow, RangeKey } from "@/lib/data/market";
import {
  adaptIndicesToRange,
  calculatePercentageChange,
} from "@/lib/data/market";
import fixtures from "@/lib/fixtures/market-week.json";

const SAMPLE_ROWS = fixtures as MarketIndexRow[];

describe("adaptIndicesToRange", () => {
  it("filters data by range and returns CTI metrics", () => {
    const dashboard = adaptIndicesToRange(SAMPLE_ROWS, "7d");
    expect(dashboard.range).toBe("7d");
    expect(dashboard.cti.history.length).toBeGreaterThan(0);
    expect(dashboard.cti.current).toBeTypeOf("number");
    expect(dashboard.subIndices.length).toBeGreaterThan(0);
    expect(dashboard.gainers).toHaveLength(5);
    expect(dashboard.losers).toHaveLength(5);
  });

  it.each<RangeKey>(["24h", "7d", "30d", "ytd"])(
    "always returns volume data for %s",
    (range) => {
      const dashboard = adaptIndicesToRange(SAMPLE_ROWS, range);
      expect(dashboard.volume.length).toBeGreaterThanOrEqual(0);
      expect(dashboard.volume.every((bar) => typeof bar.count === "number")).toBe(
        true,
      );
    },
  );
});

describe("calculatePercentageChange", () => {
  it("returns zero when series is too short", () => {
    expect(calculatePercentageChange([{ value: 100 }])).toBe(0);
  });

  it("computes deltas between first and last point", () => {
    const series = [
      { value: 100 },
      { value: 110 },
      { value: 115 },
    ];
    expect(calculatePercentageChange(series)).toBeCloseTo(15);
  });
});
