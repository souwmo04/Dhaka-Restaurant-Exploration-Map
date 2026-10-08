"use client";

import { ChevronDown, X } from "lucide-react";
import { useId } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { DEFAULT_FILTERS, isFiltered, STATUS_FILTERS, type RestaurantFilters } from "@/lib/restaurants/filters";
import { cn } from "@/lib/utils";

/** Status chips + cuisine select. Only categories present in `availableCategoryIds` are offered. */
export function FilterBar({
  filters,
  onChange,
  availableCategoryIds,
  resultCount,
  className,
}: {
  filters: RestaurantFilters;
  onChange: (next: RestaurantFilters) => void;
  availableCategoryIds: Set<string>;
  resultCount: number;
  className?: string;
}) {
  const { categories } = useCatalog();
  const selectId = useId();
  const options = categories.filter((c) => availableCategoryIds.has(c.id));

  return (
    <div className={cn("space-y-2.5", className)}>
      <div role="group" aria-label="Filter by status" className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
        {STATUS_FILTERS.map((f) => {
          const active = filters.status === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...filters, status: f.value })}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
                active
                  ? "border-ink bg-ink text-surface"
                  : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Cuisine
        </label>
        <div className="relative min-w-0 flex-1">
          <select
            id={selectId}
            value={filters.categoryId ?? ""}
            onChange={(e) => onChange({ ...filters, categoryId: e.target.value || null })}
            className="w-full appearance-none rounded-xl border border-line bg-surface py-2 pl-3 pr-9 text-sm text-ink hover:border-line-strong"
          >
            <option value="">All cuisines</option>
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji ? `${c.emoji}  ${c.name}` : c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        </div>
        {isFiltered(filters) && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-2 text-sm font-medium text-ink-soft hover:bg-paper-deep hover:text-ink"
          >
            <X className="size-3.5" aria-hidden /> Clear
          </button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {resultCount} restaurants match
      </p>
    </div>
  );
}
