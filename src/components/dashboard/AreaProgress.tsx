"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatPercent, type AreaProgress as AreaProgressData } from "@/lib/restaurants/progress";

export function AreaProgressList({ items }: { items: AreaProgressData[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map(({ area, visited, total, percent }) => (
        <li key={area.id}>
          {area.active ? (
            <Link href={`/explore/${area.slug}`} className="group flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-xl font-semibold">{area.name}</p>
                  <p className="tabular text-sm text-ink-soft">
                    <span className="font-semibold text-ink">{visited}</span> / {total}
                    <span className="ml-2 font-semibold text-tomato-deep">{formatPercent(percent)}</span>
                  </p>
                </div>
                <ProgressBar percent={percent} label={`${area.name} exploration`} className="mt-2.5" />
              </div>
              <ArrowRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ) : (
            <div className="flex items-center justify-between gap-4 py-4">
              <p className="font-display text-xl font-semibold text-ink-muted">{area.name}</p>
              <span className="rounded-full bg-paper-deep px-2.5 py-1 text-xs font-medium text-ink-soft">Coming soon</span>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
