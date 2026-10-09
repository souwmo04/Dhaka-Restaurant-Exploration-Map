"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, type CSSProperties } from "react";
import { StateMessage } from "@/components/feedback/States";
import { AppHeader } from "@/components/layout/AppHeader";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useVisits } from "@/components/providers/VisitsProvider";
import { RestaurantCard } from "@/components/restaurants/RestaurantCard";
import type { Restaurant } from "@/types/domain";

export function FavoritesView() {
  const catalog = useCatalog();
  const { visits, status, update } = useVisits();
  const router = useRouter();

  const byArea = useMemo(() => {
    const favs = Object.values(visits)
      .filter((v) => v.favorite)
      .map((v) => catalog.restaurantById.get(v.restaurantId))
      .filter((r): r is Restaurant => r !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
    const groups = new Map<string, Restaurant[]>();
    for (const r of favs) groups.set(r.areaId, [...(groups.get(r.areaId) ?? []), r]);
    return [...groups.entries()].map(([areaId, list]) => ({ area: catalog.areaById.get(areaId)!, list }));
  }, [visits, catalog]);

  const total = byArea.reduce((n, g) => n + g.list.length, 0);
  const firstArea = catalog.activeAreas[0];
  const open = (r: Restaurant) => router.push(`/explore/${catalog.areaById.get(r.areaId)?.slug}?r=${r.slug}`);

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tomato-deep">Saved for later</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">My favorites</h1>
        <p className="mt-2 text-ink-soft" aria-live="polite">
          {status === "loading" ? "Loading…" : total === 1 ? "1 restaurant" : `${total} restaurants`}
        </p>

        {status !== "loading" && total === 0 ? (
          <div className="mt-8 rounded-3xl border border-line bg-surface">
            <StateMessage
              icon={<Star className="size-6" />}
              title="You haven't saved any favorites yet."
              action={
                firstArea && (
                  <Link href={`/explore/${firstArea.slug}`} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink-soft">
                    Explore the map
                  </Link>
                )
              }
            >
              Explore the map and save restaurants you want to try.
            </StateMessage>
          </div>
        ) : (
          byArea.map(({ area, list }, i) => (
            <section key={area.id} aria-labelledby={`fav-${area.id}`} className="animate-rise mt-8" style={{ "--i": i + 1 } as CSSProperties}>
              <h2 id={`fav-${area.id}`} className="mb-2 px-1 font-display text-xl font-semibold">
                {area.name}
              </h2>
              <ul className="rounded-3xl border border-line bg-surface p-2">
                {list.map((r) => (
                  <li key={r.id} className="flex items-center gap-1">
                    <div className="min-w-0 flex-1">
                      <RestaurantCard restaurant={r} visit={visits[r.id]} onSelect={open} />
                    </div>
                    <button
                      type="button"
                      onClick={() => update(r.id, { favorite: false })}
                      className="mr-2 grid size-10 shrink-0 place-items-center rounded-full text-gold-deep transition-transform hover:scale-110 hover:bg-gold-soft active:scale-90"
                      aria-label={`Remove ${r.name} from favorites`}
                      title="Remove from favorites"
                    >
                      <Star className="size-5 fill-gold" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
