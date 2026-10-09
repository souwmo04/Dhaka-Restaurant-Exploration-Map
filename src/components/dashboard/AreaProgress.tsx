"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { groupAreas } from "@/lib/areas";
import { formatPercent, type AreaProgress as AreaProgressData } from "@/lib/restaurants/progress";
import { cn } from "@/lib/utils";

/** Per-area progress. Grouped areas (e.g. the Mirpur maps) get a combined heading row. */
export function AreaProgressList({ items }: { items: AreaProgressData[] }) {
  return (
    <ul className="divide-y divide-line">
      {groupAreas(items).map((section) => {
        if (!section.group) {
          const [item] = section.items;
          return (
            <li key={item.area.id}>
              <AreaRow item={item} />
            </li>
          );
        }
        const visited = section.items.reduce((n, i) => n + i.visited, 0);
        const total = section.items.reduce((n, i) => n + i.total, 0);
        const percent = total ? (visited / total) * 100 : 0;
        return (
          <li key={section.group} className="py-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-xl font-semibold">{section.group}</p>
              <ProgressNumbers visited={visited} total={total} percent={percent} />
            </div>
            <ProgressBar percent={percent} label={`${section.group} exploration`} className="mt-2.5" />
            <ul className="mt-2 space-y-0.5 border-l-2 border-line pl-4" aria-label={`${section.group} areas`}>
              {section.items.map((item) => (
                <li key={item.area.id}>
                  <AreaRow item={item} compact />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

function ProgressNumbers({ visited, total, percent }: { visited: number; total: number; percent: number }) {
  return (
    <p className="tabular shrink-0 text-sm text-ink-soft">
      <span className="font-semibold text-ink">{visited}</span> / {total}
      <span className="ml-2 font-semibold text-tomato-deep">{formatPercent(percent)}</span>
    </p>
  );
}

function AreaRow({ item: { area, visited, total, percent }, compact = false }: { item: AreaProgressData; compact?: boolean }) {
  if (!area.active) {
    return (
      <div className={cn("flex items-center justify-between gap-4", compact ? "py-2" : "py-4")}>
        <p className={cn("font-display font-semibold text-ink-muted", compact ? "text-base" : "text-xl")}>{area.name}</p>
        <span className="rounded-full bg-paper-deep px-2.5 py-1 text-xs font-medium text-ink-soft">Coming soon</span>
      </div>
    );
  }
  return (
    <Link href={`/explore/${area.slug}`} className={cn("group flex items-center gap-4", compact ? "py-2" : "py-4")}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className={cn("truncate font-display font-semibold", compact ? "text-base" : "text-xl")}>{area.name}</p>
          <ProgressNumbers visited={visited} total={total} percent={percent} />
        </div>
        <ProgressBar percent={percent} label={`${area.name} exploration`} className={cn(compact ? "mt-1.5 h-1.5" : "mt-2.5")} />
      </div>
      <ArrowRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}
