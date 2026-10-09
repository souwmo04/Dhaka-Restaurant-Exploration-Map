"use client";

import { CalendarDays, Check, Compass, MapPinned, RotateCw, Star, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useMemo, type CSSProperties } from "react";
import { StateMessage } from "@/components/feedback/States";
import { AppHeader } from "@/components/layout/AppHeader";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useVisits } from "@/components/providers/VisitsProvider";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { siteConfig } from "@/config/site";
import { formatPercent, overallProgress, progressByArea } from "@/lib/restaurants/progress";
import { progressByCategory, recentVisits, visitsThisMonth } from "@/lib/restaurants/stats";
import { useToday } from "@/lib/hooks/useToday";
import { formatIsoDate } from "@/lib/utils";
import type { LngLat } from "@/types/domain";
import { AreaProgressList } from "./AreaProgress";
import { DhakaMap } from "./DhakaMap";
import { StatsCard } from "./StatsCard";

export function DashboardView() {
  const catalog = useCatalog();
  const { visits, status, mode, retry } = useVisits();
  const session = useSession();
  const today = useToday();

  const data = useMemo(() => {
    const overall = overallProgress(catalog.areas, catalog.restaurants, visits);
    const areas = progressByArea(catalog.areas, catalog.restaurants, visits);
    const favorites = Object.values(visits).filter((v) => v.favorite && catalog.restaurantById.has(v.restaurantId)).length;
    const exploredAreas = areas.filter((a) => a.area.active && a.visited > 0).length;
    const recent = recentVisits(catalog.restaurantById, visits, 8);
    const cuisines = progressByCategory(catalog.categories, catalog.restaurants, visits).filter((c) => c.category.slug !== "restaurant").slice(0, 8);
    const visitedPoints = Object.values(visits)
      .filter((v) => v.visited)
      .map((v) => catalog.restaurantById.get(v.restaurantId)?.position)
      .filter((p): p is LngLat => p !== undefined);
    return { overall, areas, favorites, exploredAreas, recent, cuisines, visitedPoints, thisMonth: today ? visitsThisMonth(visits, today) : 0 };
  }, [catalog, visits, today]);

  const latest = data.recent[0];
  const firstArea = catalog.activeAreas[0];

  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:pt-12">
        {/* Overall */}
        <section aria-labelledby="overall-heading" className="animate-rise relative overflow-hidden rounded-[2rem] bg-ink p-6 text-surface sm:p-10">
          <div aria-hidden className="absolute -right-20 -top-24 size-80 rounded-full bg-tomato/35 blur-3xl" />
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(var(--paper)_1px,transparent_1px),linear-gradient(90deg,var(--paper)_1px,transparent_1px)] [background-size:44px_44px]"
          />
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tomato">My food map</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1 id="overall-heading" className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                  {siteConfig.city} exploration
                </h1>
                <p className="tabular mt-3 text-lg text-surface/75" aria-live="polite">
                  <AnimatedNumber value={data.overall.visited} className="font-semibold text-surface" /> /{" "}
                  {data.overall.total.toLocaleString("en-US")} restaurants visited
                </p>
              </div>
              <p className="tabular font-display text-7xl font-semibold leading-none tracking-tight sm:text-8xl">
                <AnimatedNumber value={data.overall.percent} format={formatPercent} />
              </p>
            </div>
            <ProgressBar percent={data.overall.percent} label={`${siteConfig.city} exploration`} className="mt-7 h-3 bg-surface/15" />
            <p className="mt-3 text-sm text-surface/60">
              Across {catalog.activeAreas.length === 1 ? `${catalog.activeAreas.length} area` : `${catalog.activeAreas.length} areas`} mapped so
              far. {data.overall.total.toLocaleString("en-US")} restaurants tracked — not every restaurant in the city yet.
            </p>
          </div>
          <div>
            <DhakaMap items={data.areas} visitedPoints={data.visitedPoints} className="mx-auto w-full max-w-[300px] lg:max-w-[340px]" />
            <p className="mt-3 text-center text-xs text-surface/55">Areas fill in as you explore · tap one to open its map</p>
          </div>
          </div>
        </section>

        {status === "error" && (
          <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tomato/30 bg-tomato-soft px-5 py-4 text-sm text-tomato-deep">
            We couldn&apos;t load your saved visits.
            <button type="button" onClick={retry} className="flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
              <RotateCw className="size-4" aria-hidden /> Try again
            </button>
          </div>
        )}
        {mode === "guest" && session.status === "guest" && (
          <p className="animate-rise mt-6 rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-ink-soft" style={{ "--i": 1 } as CSSProperties}>
            You&apos;re exploring as a guest — progress is saved in this browser.{" "}
            <Link href="/login?next=/dashboard" className="font-semibold text-tomato-deep underline underline-offset-2">
              Sign in
            </Link>{" "}
            to keep it on every device. Your guest progress comes with you.
          </p>
        )}

        {/* Stats */}
        <section aria-label="Statistics" className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 [&>*]:min-w-0">
          <StatsCard index={2} label="Restaurants visited" value={<AnimatedNumber value={data.overall.visited} />} icon={<Check className="size-5" />} hint={`${data.thisMonth} this month`} />
          <StatsCard index={3} label="Favorites" value={<AnimatedNumber value={data.favorites} />} icon={<Star className="size-5" />} hint={<Link href="/favorites" className="underline-offset-2 hover:underline">View favorites</Link>} />
          <StatsCard
            index={4}
            label="Areas explored"
            value={`${data.exploredAreas} / ${catalog.activeAreas.length}`}
            icon={<MapPinned className="size-5" />}
            hint={catalog.areas.length > catalog.activeAreas.length ? `${catalog.areas.length - catalog.activeAreas.length} more coming soon` : "Every mapped area"}
          />
          <StatsCard
            index={5}
            label="Latest visit"
            value={<span className="text-2xl">{latest ? latest.restaurant.name : "—"}</span>}
            icon={<CalendarDays className="size-5" />}
            hint={latest?.visit.visitedAt ? formatIsoDate(latest.visit.visitedAt) : "No visits yet"}
          />
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr] [&>*]:min-w-0">
          <section aria-labelledby="areas-heading" className="animate-rise rounded-3xl border border-line bg-surface p-6" style={{ "--i": 6 } as CSSProperties}>
            <h2 id="areas-heading" className="font-display text-2xl font-semibold">
              Areas
            </h2>
            <AreaProgressList items={data.areas} />
          </section>

          <section aria-labelledby="recent-heading" className="animate-rise rounded-3xl border border-line bg-surface p-6" style={{ "--i": 7 } as CSSProperties}>
            <h2 id="recent-heading" className="font-display text-2xl font-semibold">
              Recent visits
            </h2>
            {data.recent.length === 0 ? (
              <StateMessage
                icon={<UtensilsCrossed className="size-6" />}
                title="Your food journey starts here."
                action={
                  firstArea && (
                    <Link href={`/explore/${firstArea.slug}`} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink-soft">
                      Open the map
                    </Link>
                  )
                }
              >
                Visit a restaurant and mark it as visited.
              </StateMessage>
            ) : (
              <ol className="mt-4 space-y-1">
                {data.recent.map(({ restaurant, visit }, i) => {
                  const area = catalog.areaById.get(restaurant.areaId);
                  return (
                    <li key={restaurant.id} className="animate-rise" style={{ "--i": 8 + i } as CSSProperties}>
                      <Link
                        href={`/explore/${area?.slug ?? ""}?r=${restaurant.slug}`}
                        className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-paper"
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tomato text-white transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110" aria-hidden>
                          <Check className="size-5" strokeWidth={3} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{restaurant.name}</span>
                          <span className="block text-sm text-ink-muted">{area?.name}</span>
                        </span>
                        {visit.visitedAt && (
                          <time dateTime={visit.visitedAt} className="shrink-0 text-sm text-ink-soft">
                            {formatIsoDate(visit.visitedAt, { month: "short", day: "numeric" })}
                          </time>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        {data.cuisines.length > 0 && (
          <section aria-labelledby="cuisine-heading" className="animate-rise mt-6 rounded-3xl border border-line bg-surface p-6" style={{ "--i": 9 } as CSSProperties}>
            <div className="flex items-center gap-2">
              <Compass className="size-5 text-ink-muted" aria-hidden />
              <h2 id="cuisine-heading" className="font-display text-2xl font-semibold">
                Cuisine progress
              </h2>
            </div>
            <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {data.cuisines.map(({ category, visited, total }) => (
                <li key={category.id}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">
                      <span aria-hidden className="mr-1.5">
                        {category.emoji}
                      </span>
                      {category.name}
                    </span>
                    <span className="tabular text-ink-soft">
                      {visited} / {total}
                    </span>
                  </div>
                  <ProgressBar percent={(visited / total) * 100} label={`${category.name} progress`} tone="ink" className="mt-1.5 h-1.5" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
