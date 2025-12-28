"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { RangeKey } from "@/lib/data/market";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS: RangeKey[] = ["24h", "7d", "30d", "ytd"];

type TimeframePillsProps = {
  defaultRange?: RangeKey;
  onRangeChange?: (range: RangeKey) => void;
};

export function TimeframePills({
  defaultRange = "7d",
  onRangeChange,
}: TimeframePillsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [active, setActive] = useState<RangeKey>(defaultRange);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setActive(defaultRange);
  }, [defaultRange]);

  const currentParams = useMemo(() => {
    return new URLSearchParams(searchParams?.toString());
  }, [searchParams]);

  const handleSelect = useCallback(
    (range: RangeKey) => {
      setActive(range);
      currentParams.set("range", range);
      const qs = currentParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      onRangeChange?.(range);
    },
    [currentParams, onRangeChange, pathname, router],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + delta + RANGE_OPTIONS.length) % RANGE_OPTIONS.length;
      buttonsRef.current[nextIndex]?.focus();
    },
    [],
  );

  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Market timeframe selector"
    >
      {RANGE_OPTIONS.map((range, index) => {
        const isActive = active === range;
        return (
          <button
            key={range}
            ref={(node) => {
              buttonsRef.current[index] = node;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-testid={`timeframe-${range}`}
            data-range={range}
            onClick={() => handleSelect(range)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isActive
                ? "border-blue-500 bg-blue-50/80 text-blue-700"
                : "border-border bg-muted/40 text-muted-foreground hover:border-blue-200 hover:bg-blue-50",
            )}
            aria-label={`选择${range}时间框`}
          >
            {range.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
