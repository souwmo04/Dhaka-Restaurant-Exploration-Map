"use client";

import Link from "next/link";
import { useSession } from "@/components/providers/SessionProvider";
import { useVisits } from "@/components/providers/VisitsProvider";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { siteConfig } from "@/config/site";
import { formatPercent, type Progress } from "@/lib/restaurants/progress";
import { cn } from "@/lib/utils";
import type { Area } from "@/types/domain";

/** "How much of Dhaka have you tasted?" — the area's progress at a glance. */
export function ProgressHero({
  area,
  progress,
  compact = false,
  className,
}: {
  area: Area;
  progress: Progress;
  compact?: boolean;
  className?: string;
}) {
  const { mode, status } = useVisits();
  const session = useSession();
  const loading = status === "loading";

  return (
    <section aria-labelledby="progress-heading" className={cn("relative", !compact && "animate-rise", className)}>
      {!compact && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tomato-deep">{siteConfig.heroQuestion}</p>
      )}
      <div className={cn("flex items-end justify-between gap-4", !compact && "mt-2")}>
        <div className="min-w-0">
          <h1 id="progress-heading" className={cn("font-display font-semibold leading-none tracking-tight", compact ? "text-2xl" : area.name.length > 20 ? "text-[1.6rem] leading-tight" : area.name.length > 12 ? "text-[2rem]" : "text-[2.6rem]")}>
            {area.name}
          </h1>
          <p className={cn("tabular mt-2 text-ink-soft", compact ? "text-sm" : "text-[15px]")} aria-live="polite">
            <AnimatedNumber value={progress.visited} className="font-semibold text-ink" />
            <span> / {progress.total.toLocaleString("en-US")} restaurants visited</span>
          </p>
        </div>
        <p className={cn("tabular shrink-0 font-display font-semibold leading-none text-tomato-deep", compact ? "text-3xl" : "text-5xl", loading && "opacity-40")}>
          <AnimatedNumber value={progress.percent} format={formatPercent} />
          <span className="sr-only"> explored</span>
        </p>
      </div>
      <ProgressBar percent={progress.percent} label={`${area.name} exploration`} className={cn(compact ? "mt-3" : "mt-4", "h-2.5")} />

      {!compact && (
        <p className="mt-3 text-xs text-ink-muted">
          {progress.total.toLocaleString("en-US")} restaurants tracked so far — more are added over time.
          {mode === "guest" && session.status === "guest" && (
            <>
              {" "}
              Progress is saved in this browser.{" "}
              <Link href="/login" className="font-medium text-tomato-deep underline underline-offset-2">
                Sign in
              </Link>{" "}
              to keep it everywhere.
            </>
          )}
        </p>
      )}
    </section>
  );
}
