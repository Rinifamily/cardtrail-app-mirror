"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  Cell,
  ComposedChart,
  ErrorBar,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CandlestickDatum } from "@/lib/data/market";

type CandlestickChartProps = {
  data: CandlestickDatum[];
};

type PreparedCandle = CandlestickDatum & {
  label: string;
  bodyBase: number;
  bodyRange: number;
  midpoint: number;
  wickError: [number, number];
  direction: "up" | "down" | "flat";
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function prepareCandles(data: CandlestickDatum[]): PreparedCandle[] {
  return data.map((point) => {
    const open = point.open ?? point.close;
    const close = point.close ?? point.open;
    const bodyBase = Math.min(open, close);
    const bodyRange = Math.max(Math.abs(open - close), 0.35);
    const midpoint = (point.high + point.low) / 2;
    const wickError: [number, number] = [
      midpoint - point.low,
      point.high - midpoint,
    ];
    const direction =
      close === open ? "flat" : close > open ? "up" : "down";

    return {
      ...point,
      label: DATE_FORMAT.format(new Date(point.date)),
      bodyBase,
      bodyRange,
      midpoint,
      wickError,
      direction,
    };
  });
}

function CandlestickTooltip({ active, payload }: any) {
  if (!active || !payload?.length) {
    return null;
  }
  const datum: PreparedCandle | undefined = payload[0]?.payload;
  if (!datum) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-background/95 px-3 py-2 text-sm shadow-xl">
      <p className="font-semibold text-foreground">
        {DATE_FORMAT.format(new Date(datum.date))}
      </p>
      <ul className="mt-1 space-y-0.5 text-muted-foreground">
        <li>开盘: {datum.open?.toFixed(2)}</li>
        <li>最高: {datum.high?.toFixed(2)}</li>
        <li>最低: {datum.low?.toFixed(2)}</li>
        <li>收盘: {datum.close?.toFixed(2)}</li>
      </ul>
    </div>
  );
}

export const CandlestickChart = memo(function CandlestickChart({
  data,
}: CandlestickChartProps) {
  const chartData = useMemo(() => prepareCandles(data), [data]);

  if (!chartData.length) {
    return (
      <div className="flex h-[240px] w-full items-center justify-center rounded-2xl border bg-card/40 text-sm text-muted-foreground">
        暂无价格数据
      </div>
    );
  }

  return (
    <div
      className="h-[240px] w-full rounded-2xl border border-border/60 bg-card/40 p-2 md:h-[320px] lg:h-[360px]"
      data-testid="candlestick-chart"
      data-points={chartData.length}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 12, left: 8, right: 12, bottom: 12 }}
        >
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
          />
          <YAxis
            domain={["dataMin - 10", "dataMax + 10"]}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(val) => val.toFixed(0)}
          />
          <Tooltip content={<CandlestickTooltip />} />
          <Line
            type="linear"
            dataKey="midpoint"
            stroke="transparent"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          >
            <ErrorBar
              dataKey="wickError"
              strokeWidth={1.5}
              width={4}
              stroke="#475569"
            />
          </Line>
          <Bar
            dataKey="bodyBase"
            stackId="candle"
            fill="transparent"
            isAnimationActive={false}
          />
          <Bar
            dataKey="bodyRange"
            stackId="candle"
            barSize={14}
            radius={[4, 4, 4, 4]}
            isAnimationActive={false}
          >
            {chartData.map((entry) => (
              <Cell
                key={`candle-${entry.date}`}
                fill={
                  entry.direction === "up"
                    ? "#dc2626"
                    : entry.direction === "down"
                      ? "#16a34a"
                      : "#94a3b8"
                }
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});

export default CandlestickChart;
