import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import type { MarketDashboardMode } from "@/lib/data/market";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { LiveIndicator } from "./LiveIndicator";

type CTIHeroCardProps = {
  value: number;
  change: number;
  lastUpdated: string;
  mode?: MarketDashboardMode;
};

export function CTIHeroCard({
  value,
  change,
  lastUpdated,
  mode = "live",
}: CTIHeroCardProps) {
  const isPositive = change >= 0;
  const deltaBadgeClass = isPositive
    ? "bg-red-500/10 text-red-500"
    : "bg-green-500/10 text-green-500";
  const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
  const formattedValue = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
  const formattedChange = `${isPositive ? "+" : ""}${change.toFixed(2)}%`;
  const relativeTime = buildRelativeCopy(lastUpdated);

  return (
    <section aria-label="CardTrail Market Index" className="w-full">
      <Card
        className="bg-gradient-to-br from-background to-card/80"
        data-testid="cti-hero"
      >
      <CardHeader className="gap-4 md:flex md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            市场指数
          </p>
          <CardTitle className="mt-1 flex items-baseline gap-3 text-4xl font-semibold sm:text-5xl">
            <span data-testid="cti-value">{formattedValue}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold",
                deltaBadgeClass,
              )}
              data-testid="cti-delta"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {formattedChange}
            </span>
          </CardTitle>
          <CardDescription className="mt-3 max-w-prose text-base text-muted-foreground">
            追踪 CardTrail Index（CTI）以洞察口袋妖怪卡市场温度。
          </CardDescription>
        </div>
        <div className="flex flex-col items-start gap-2 text-left text-sm text-muted-foreground md:items-end md:text-right">
          <LiveIndicator label="实时" />
          <div className="space-y-1">
            <p className="font-medium">更新时间</p>
            <p
              className="text-sm text-muted-foreground"
              data-testid="cti-updated"
            >
              {relativeTime}
            </p>
            {mode === "placeholder" ? (
              <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600">
                开发中数据
              </span>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <MetricBlock
          label="多头力量"
          value={isPositive ? "向上" : "回调"}
          helper={
            isPositive
              ? "买方流动性主导当前盘面。"
              : "防守性买盘正在吸收回调。"
          }
        />
        <MetricBlock
          label="7日情绪"
          value={
            Math.abs(change) < 1
              ? "横盘"
              : isPositive
                ? "偏强"
                : "偏弱"
          }
          helper="综合 CTI 波动率和区间扩展。"
        />
        <MetricBlock
          label="信心指数"
          value={`${Math.min(100, 65 + Math.abs(change) * 2).toFixed(0)}%`}
          helper="基于流动性和市场广度的代理指标。"
        />
      </CardContent>
      </Card>
    </section>
  );
}

type MetricBlockProps = {
  label: string;
  value: string;
  helper?: string;
};

function MetricBlock({ label, value, helper }: MetricBlockProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      {helper ? (
        <p className="mt-1 text-sm text-muted-foreground">{helper}</p>
      ) : null}
    </div>
  );
}

function buildRelativeCopy(dateString: string) {
  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) {
    return "刚刚";
  }

  const diffMs = Date.now() - timestamp;
  const minutes = Math.round(diffMs / (60 * 1000));
  const hours = Math.round(diffMs / (60 * 60 * 1000));
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (minutes < 1) {
    return "刚刚";
  }
  if (minutes < 60) {
    return `约 ${minutes} 分钟前`;
  }
  if (hours < 24) {
    return `约 ${hours} 小时前`;
  }
  return `约 ${days} 天前`;
}
