"use client";

import { Building2, MapPin, X } from "lucide-react";
import { useVisits } from "@/components/providers/VisitsProvider";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Restaurant } from "@/types/domain";
import { RestaurantCard } from "./RestaurantCard";

/**
 * Several restaurants at one spot — a building ("Paradise Tower") or markers
 * that overlap at the current zoom. The user picks one from the list.
 */
export function PlaceGroupPanel({
  title,
  subtitle,
  kind,
  restaurants,
  onSelect,
  onClose,
  headingId,
}: {
  title: string;
  subtitle?: string | null;
  kind: "building" | "overlap";
  restaurants: Restaurant[];
  onSelect: (r: Restaurant) => void;
  onClose: () => void;
  headingId: string;
}) {
  const { visits } = useVisits();
  const visited = restaurants.filter((r) => visits[r.id]?.visited).length;

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
            {kind === "building" ? <Building2 className="size-3.5" aria-hidden /> : <MapPin className="size-3.5" aria-hidden />}
            {kind === "building" ? `${restaurants.length} restaurants in this building` : `${restaurants.length} restaurants here`}
          </p>
          <h2 id={headingId} className="mt-1 font-display text-[1.6rem] font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-ink-soft">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink"
          aria-label="Close"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <ProgressBar percent={(visited / Math.max(restaurants.length, 1)) * 100} label={`${title} progress`} className="flex-1" />
        <span className="tabular shrink-0 font-medium">
          {visited} / {restaurants.length} visited
        </span>
      </div>

      <ul className="-mx-3 mt-4 space-y-0.5" aria-label={`Restaurants at ${title}`}>
        {restaurants.map((r) => (
          <li key={r.id}>
            <RestaurantCard restaurant={r} visit={visits[r.id]} onSelect={onSelect} hideBuilding={kind === "building"} />
          </li>
        ))}
      </ul>
    </section>
  );
}
