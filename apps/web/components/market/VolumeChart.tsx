"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { VolumeDatum } from "@/lib/data/market";
import { cn } from "@/lib/utils";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

type VolumeChartProps = {
  data: VolumeDatum[];
};

type Mode = "count" | "value";
const MODES: Mode[] = ["count", "value"];

export function VolumeChart({ data }: VolumeChartProps) {
  const [mode, setMode] = useState<Mode>("count");
  const chartData = useMemo(
    () =>
      data.map((entry) => ({
        ...entry,
        label: DATE_FORMAT.format(new Date(entry.date)),
      })),
    [data],
  );

  const displayKey = mode === "count" ? "count" : "value";

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          交易量
        </p>
        <p className="text-base text-muted-foreground">
          最近 3 日累计交易数量 / 金额
        </p>
      </header>

      <div className="inline-flex rounded-full bg-muted/50 p-1" role="tablist">
        {MODES.map((option) => (
          <button
            key={option}
            type="button"
            role="tab"
            aria-selected={mode === option}
            onClick={() => setMode(option)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              mode === option
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground",
            )}
          >
            {option === "count" ? "笔数" : "金额"}
          </button>
        ))}
      </div>

      {!chartData.length ? (
        <div className="rounded-2xl border border-dashed bg-card/50 p-6 text-sm text-muted-foreground">
          交易量数据有限，完整数据将在后续版本中提供。
        </div>
      ) : (
        <div className="h-64 w-full rounded-2xl border border-border/60 bg-card/70 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickFormatter={(value) =>
                  mode === "count"
                    ? value.toLocaleString()
                    : `¥${(value / 1000).toFixed(1)}k`
                }
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                formatter={(value: number) =>
                  mode === "count"
                    ? [`${value.toLocaleString()} 笔`, "交易数"]
                    : [`¥${value.toLocaleString()}`, "交易额"]
                }
              />
              <Bar
                dataKey={displayKey}
                radius={[8, 8, 0, 0]}
                fill={mode === "count" ? "#2563eb" : "#dc2626"}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
