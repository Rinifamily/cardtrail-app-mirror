"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type LiveIndicatorProps = {
  label?: string;
  intervalMs?: number;
};

export function LiveIndicator({
  label = "Live",
  intervalMs = 5000,
}: LiveIndicatorProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(media.matches);

    updateMotionPreference();
    media.addEventListener("change", updateMotionPreference);

    if (media.matches) {
      return () => {
        media.removeEventListener("change", updateMotionPreference);
      };
    }

    const interval = window.setInterval(() => {
      setPulseKey((key) => key + 1);
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
      media.removeEventListener("change", updateMotionPreference);
    };
  }, [intervalMs]);

  return (
    <span
      className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground"
      aria-label="Live data indicator"
    >
      <span className="relative inline-flex h-2.5 w-2.5">
        {!prefersReducedMotion ? (
          <span
            key={pulseKey}
            className={cn(
              "absolute inline-flex h-full w-full rounded-full bg-emerald-500/60",
              "opacity-75",
              "animate-[ping_1s_ease-out_1]",
            )}
            aria-hidden="true"
          />
        ) : null}
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-inner" />
      </span>
      <span className="tracking-wide text-[11px] uppercase">{label}</span>
    </span>
  );
}
