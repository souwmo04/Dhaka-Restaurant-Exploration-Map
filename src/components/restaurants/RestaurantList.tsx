"use client";

import { SearchX } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { StateMessage } from "@/components/feedback/States";
import { useVisits } from "@/components/providers/VisitsProvider";
import type { Restaurant } from "@/types/domain";
import { RestaurantCard } from "./RestaurantCard";

const PAGE = 60;

/**
 * Accessible list of restaurants — the non-map alternative to every map
 * interaction. Renders incrementally so long lists stay cheap.
 */
export function RestaurantList({
  restaurants,
  selectedId,
  onSelect,
  empty,
  label = "Restaurants",
}: {
  restaurants: Restaurant[];
  selectedId: string | null;
  onSelect: (r: Restaurant) => void;
  empty?: ReactNode;
  label?: string;
}) {
  const { visits } = useVisits();
  const [limit, setLimit] = useState(PAGE);

  if (restaurants.length === 0) {
    return (
      <>
        {empty ?? (
          <StateMessage icon={<SearchX className="size-6" />} title="Nothing matches">
            Try a different search or clear the filters.
          </StateMessage>
        )}
      </>
    );
  }

  return (
    <div>
      <ul aria-label={label} className="space-y-0.5">
        {restaurants.slice(0, limit).map((r, i) => (
          // The first screenful rises in; rows further down appear as you scroll.
          <li key={r.id} className={i < 14 ? "animate-rise" : undefined} style={i < 14 ? ({ "--i": i * 0.6 } as CSSProperties) : undefined}>
            <RestaurantCard restaurant={r} visit={visits[r.id]} selected={r.id === selectedId} onSelect={onSelect} />
          </li>
        ))}
      </ul>
      {restaurants.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="mx-auto mt-3 block rounded-full border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-line-strong hover:text-ink"
        >
          Show {Math.min(PAGE, restaurants.length - limit)} more
        </button>
      )}
    </div>
  );
}
