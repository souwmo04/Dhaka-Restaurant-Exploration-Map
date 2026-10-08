import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatsCard({ label, value, hint, icon, className }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-line bg-surface p-5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink-soft">{label}</p>
        {icon && (
          <span className="text-ink-muted" aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <p className="tabular mt-3 truncate font-display text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 truncate text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}
