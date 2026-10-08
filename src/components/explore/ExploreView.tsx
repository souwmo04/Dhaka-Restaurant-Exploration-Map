"use client";

import { Clock3, List, Map as MapIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { StateMessage } from "@/components/feedback/States";
import { AppHeader } from "@/components/layout/AppHeader";
import { RestaurantMap, type RestaurantMapHandle } from "@/components/map/RestaurantMap";
import { AreaSwitcher, MapLegend, ReturnToAreaButton } from "@/components/map/MapControls";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useVisits } from "@/components/providers/VisitsProvider";
import { FilterBar } from "@/components/restaurants/FilterBar";
import { RestaurantList } from "@/components/restaurants/RestaurantList";
import { RestaurantSearch } from "@/components/restaurants/RestaurantSearch";
import { useToast } from "@/components/ui/Toaster";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { applyFilters, DEFAULT_FILTERS, type RestaurantFilters } from "@/lib/restaurants/filters";
import { buildPlaces, type PlaceProperties } from "@/lib/restaurants/places";
import { formatPercent, progressOf } from "@/lib/restaurants/progress";
import { cn } from "@/lib/utils";
import type { Area, Restaurant } from "@/types/domain";
import { DetailPanel } from "./DetailPanel";
import { MobileSheet, SHEET_PEEK, sheetHeight, type SheetSnap } from "./MobileSheet";
import { ProgressHero } from "./ProgressHero";
import { SelectionContent } from "./SelectionContent";
import { selectedPlaceId, type GroupSelection, type Selection } from "./selection";
import { useMilestones } from "./useMilestones";

export function ExploreView({ areaSlug }: { areaSlug: string }) {
  const catalog = useCatalog();
  const { visits } = useVisits();
  const toast = useToast();
  const isDesktop = useMediaQuery(DESKTOP_QUERY, true);
  const mapRef = useRef<RestaurantMapHandle>(null);

  const area = catalog.areaBySlug.get(areaSlug)!;
  const areaRestaurants = useMemo(
    () => (area.active ? catalog.restaurants.filter((r) => r.areaId === area.id) : []),
    [catalog.restaurants, area],
  );

  const [filters, setFilters] = useState<RestaurantFilters>(DEFAULT_FILTERS);
  const deferredFilters = useDeferredValue(filters);
  const [selection, setSelection] = useState<Selection>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("peek");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
    // Re-fit the area once the map has taken the new width.
    window.setTimeout(() => mapRef.current?.showArea(area), 60);
  }, [area]);

  const filtered = useMemo(
    () => applyFilters(areaRestaurants, deferredFilters, visits, catalog.buildingNames),
    [areaRestaurants, deferredFilters, visits, catalog.buildingNames],
  );
  const places = useMemo(() => buildPlaces(filtered, catalog.buildingById, visits), [filtered, catalog.buildingById, visits]);
  const progress = useMemo(() => progressOf(areaRestaurants, visits), [areaRestaurants, visits]);
  const availableCategoryIds = useMemo(() => new Set(areaRestaurants.flatMap((r) => r.categoryIds)), [areaRestaurants]);

  useMilestones(progress.visited, area.name);

  // ── selection ──────────────────────────────────────────────────────────
  const selectRestaurant = useCallback(
    (r: Restaurant, parent: GroupSelection | null = null, opts: { fly?: boolean } = { fly: true }) => {
      setSelection({ kind: "restaurant", restaurantId: r.id, parent });
      setSheetSnap("half");
      if (opts.fly) {
        const position = r.buildingId ? (catalog.buildingById.get(r.buildingId)?.position ?? r.position) : r.position;
        // The panel opens in the same update, so fly with the padding it will need.
        // Read the media query now: this can run before hydration settles.
        const desktopNow = window.matchMedia(DESKTOP_QUERY).matches;
        mapRef.current?.focus(position, { padding: mapPadding(desktopNow, true) });
      }
    },
    [catalog.buildingById],
  );

  const closeSelection = useCallback(() => {
    setSelection(null);
    setSheetSnap("peek");
  }, []);

  const onPlaceClick = useCallback(
    (place: PlaceProperties, overlapping: PlaceProperties[]) => {
      const ids = (p: PlaceProperties) =>
        p.kind === "building" && p.buildingId
          ? (catalog.restaurantsByBuilding.get(p.buildingId) ?? []).map((r) => r.id)
          : p.restaurantId
            ? [p.restaurantId]
            : [];

      if (overlapping.length > 1) {
        const restaurantIds = [...new Set(overlapping.flatMap(ids))];
        setSelection({
          kind: "group",
          groupKind: "overlap",
          title: "Restaurants here",
          subtitle: "These places are very close together. Pick one.",
          restaurantIds,
          placeId: place.placeId,
        });
        setSheetSnap("half");
        return;
      }

      if (place.kind === "building" && place.buildingId) {
        const building = catalog.buildingById.get(place.buildingId);
        setSelection({
          kind: "group",
          groupKind: "building",
          title: building?.name ?? place.label,
          subtitle: building?.address ?? null,
          restaurantIds: ids(place),
          placeId: place.placeId,
        });
        setSheetSnap("half");
        return;
      }

      const r = place.restaurantId ? catalog.restaurantById.get(place.restaurantId) : undefined;
      if (r) selectRestaurant(r, null, { fly: false });
    },
    [catalog, selectRestaurant],
  );

  // ── deep link: ?r=<slug> ──────────────────────────────────────────────
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;
    const slug = new URLSearchParams(window.location.search).get("r");
    if (!slug) return;
    const r = catalog.restaurantBySlug.get(slug);
    if (r && r.areaId === area.id) {
      // Let the map mount before flying.
      window.setTimeout(() => selectRestaurant(r), 400);
    } else {
      toast({ tone: "error", title: "Restaurant not found", description: "It may have been removed or moved to another area." });
    }
  }, [catalog.restaurantBySlug, area.id, selectRestaurant, toast]);

  useEffect(() => {
    if (!deepLinkHandled.current) return;
    const url = new URL(window.location.href);
    const slug = selection?.kind === "restaurant" ? catalog.restaurantById.get(selection.restaurantId)?.slug : null;
    if (slug) url.searchParams.set("r", slug);
    else url.searchParams.delete("r");
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [selection, catalog.restaurantById]);

  // ── layout-dependent map padding ─────────────────────────────────────
  const padding = useMemo(() => mapPadding(isDesktop, !!selection), [isDesktop, selection]);

  const placeId = selectedPlaceId(selection, catalog.restaurantById);
  const selectedRestaurantId = selection?.kind === "restaurant" ? selection.restaurantId : null;
  const panelKey = selection ? (selection.kind === "restaurant" ? selection.restaurantId : `g:${selection.placeId}`) : "none";

  const search = (
    <RestaurantSearch
      restaurants={areaRestaurants}
      value={filters.query}
      onValueChange={(query) => setFilters((f) => ({ ...f, query }))}
      onSelect={(r) => selectRestaurant(r)}
      placeholder={`Search ${area.name} restaurants…`}
    />
  );

  const selectionContent = selection && (
    <SelectionContent
      selection={selection}
      onSelectRestaurant={(r, parent) => selectRestaurant(r, parent, { fly: false })}
      onBack={(parent) => setSelection(parent)}
      onClose={closeSelection}
    />
  );

  const listEmpty =
    filters.status === "favorites" ? (
      <StateMessage title="No favorites yet">Tap the star on a restaurant to save it here.</StateMessage>
    ) : filters.status === "visited" && progress.visited === 0 ? (
      <StateMessage title="Your food journey starts here.">Visit a restaurant and mark it as visited.</StateMessage>
    ) : undefined;

  const list = (
    <RestaurantList
      restaurants={filtered}
      selectedId={selectedRestaurantId}
      onSelect={(r) => selectRestaurant(r)}
      empty={listEmpty}
      label={`${area.name} restaurants`}
    />
  );

  const filterBar = (
    <FilterBar filters={filters} onChange={setFilters} availableCategoryIds={availableCategoryIds} resultCount={filtered.length} />
  );

  return (
    <div className="flex h-dvh flex-col">
      <AppHeader search={<div className="hidden w-full max-w-md lg:block">{search}</div>} />

      <div className="relative flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside
          id="explore-sidebar"
          className={cn(
            "hidden w-[380px] shrink-0 flex-col border-r border-line bg-surface xl:w-[410px]",
            sidebarOpen && "lg:flex",
          )}
          aria-label="Your progress and restaurant list"
        >
          <div className="relative border-b border-line px-6 pb-5 pt-6">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-controls="explore-sidebar"
              aria-expanded={sidebarOpen}
              title="Hide panel (full-width map)"
              className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink"
            >
              <PanelLeftClose className="size-5" aria-hidden />
              <span className="sr-only">Hide panel</span>
            </button>
            <ProgressHero area={area} progress={progress} className="[&>p:first-child]:pr-10" />
          </div>
          {area.active ? (
            <>
              <div className="border-b border-line px-6 py-4">{filterBar}</div>
              <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
                <p className="px-3 pb-2 text-xs font-medium text-ink-muted">
                  {filtered.length === areaRestaurants.length
                    ? `${areaRestaurants.length} restaurants`
                    : `${filtered.length} of ${areaRestaurants.length} restaurants`}
                </p>
                {list}
              </div>
            </>
          ) : (
            <ComingSoon area={area} />
          )}
        </aside>

        {/* Map */}
        <main className="relative min-w-0 flex-1" id="main" data-panel={isDesktop && selection ? "open" : undefined}>
          <RestaurantMap
            ref={mapRef}
            area={area}
            places={places}
            selectedPlaceId={placeId}
            padding={padding}
            onPlaceClick={onPlaceClick}
            onBackgroundClick={closeSelection}
          />

          {/* Top overlay controls */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col gap-2 p-3 lg:flex-row lg:items-start lg:p-4">
            <div className="pointer-events-auto lg:hidden">{search}</div>
            <div className="pointer-events-auto flex items-center gap-2">
              {!sidebarOpen && (
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-controls="explore-sidebar"
                  aria-expanded={false}
                  title="Show panel"
                  className="hidden h-10 items-center gap-2 rounded-full border border-line bg-surface pl-3 pr-4 text-sm shadow-float hover:border-line-strong lg:flex"
                >
                  <PanelLeftOpen className="size-5 text-ink-soft" aria-hidden />
                  <span className="sr-only">Show panel. </span>
                  <span className="tabular">
                    <span className="font-semibold">{progress.visited}</span>
                    <span className="text-ink-soft"> / {progress.total}</span>
                  </span>
                  <span className="tabular font-semibold text-tomato-deep">{formatPercent(progress.percent)}</span>
                </button>
              )}
              <AreaSwitcher current={area} />
              <ReturnToAreaButton area={area} onClick={() => mapRef.current?.showArea(area)} />
              <div className="ml-auto flex rounded-full border border-line bg-surface p-1 shadow-float lg:hidden" role="group" aria-label="View">
                <ViewToggle active={sheetSnap !== "full"} onClick={() => setSheetSnap("peek")} icon={<MapIcon className="size-4" />} label="Map" />
                <ViewToggle
                  active={sheetSnap === "full"}
                  onClick={() => {
                    setSelection(null);
                    setSheetSnap("full");
                  }}
                  icon={<List className="size-4" />}
                  label="List"
                />
              </div>
            </div>
          </div>

          {!area.active && (
            <div className="absolute inset-0 z-10 hidden place-items-center bg-paper/40 backdrop-blur-[1px] lg:grid">
              <div className="rounded-3xl border border-line bg-surface p-2 shadow-panel">
                <ComingSoon area={area} />
              </div>
            </div>
          )}

          {isDesktop && (
            <>
              <MapLegend areaName={area.name} className="absolute bottom-4 left-4 z-10" />
              <DetailPanel open={!!selection} panelKey={panelKey} onClose={closeSelection}>
                {selectionContent}
              </DetailPanel>
            </>
          )}

          {!isDesktop && (
            <MobileSheet
              snap={sheetSnap}
              onSnapChange={(s) => {
                setSheetSnap(s);
                if (s === "peek" && selection) setSelection(null);
              }}
              label={selection ? "Details" : `${area.name} progress and restaurants`}
              header={selection ? null : <ProgressHero area={area} progress={progress} compact />}
            >
              {selection ? (
                <div className="px-1 pb-4">{selectionContent}</div>
              ) : area.active ? (
                <div className="space-y-3 pt-1">
                  {filterBar}
                  <div className="-mx-1">{list}</div>
                </div>
              ) : (
                <ComingSoon area={area} />
              )}
            </MobileSheet>
          )}
        </main>
      </div>
    </div>
  );
}

/** Screen space taken by floating UI, so focused places land in the visible part of the map. */
function mapPadding(isDesktop: boolean, panelOpen: boolean) {
  if (isDesktop) return { top: 72, bottom: 40, left: 40, right: panelOpen ? 432 : 40 };
  const h = typeof window === "undefined" ? 800 : window.innerHeight - 64;
  return { top: 132, bottom: (panelOpen ? sheetHeight("half", h) : SHEET_PEEK) + 24, left: 24, right: 24 };
}

function ViewToggle({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium",
        active ? "bg-ink text-surface" : "text-ink-soft",
      )}
    >
      <span aria-hidden>{icon}</span>
      {label}
    </button>
  );
}

function ComingSoon({ area }: { area: Area }) {
  const { activeAreas } = useCatalog();
  const first = activeAreas[0];
  return (
    <StateMessage
      icon={<Clock3 className="size-6" />}
      title={`${area.name} is coming soon`}
      action={
        first && (
          <Link href={`/explore/${first.slug}`} className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink-soft">
            Explore {first.name}
          </Link>
        )
      }
    >
      We&apos;re mapping {area.name}&apos;s restaurants next. Start with {first?.name ?? "an active area"} in the meantime.
    </StateMessage>
  );
}

