"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import type { GeoJSONSource, Map as MapLibreMap, MapGeoJSONFeature, PaddingOptions } from "maplibre-gl";
import { useEffect, useImperativeHandle, useRef, useState, type Ref, type RefObject } from "react";
import { mapConfig } from "@/lib/map/config";
import { loadMapLibre } from "@/lib/map/maplibre";
import { createMarkerImages } from "@/lib/map/markers";
import { loadMapStyle } from "@/lib/map/style";
import { mapPalette as p } from "@/lib/map/theme";
import type { PlaceCollection, PlaceProperties } from "@/lib/restaurants/places";
import type { Area, BBox, LngLat } from "@/types/domain";
import { MapFallback } from "./MapFallback";

const SOURCE = "places";
const L = {
  clusters: "place-clusters",
  clusterCount: "place-cluster-count",
  selectedHalo: "place-selected-halo",
  places: "places",
  labels: "place-labels",
  selected: "place-selected",
} as const;

export type RestaurantMapHandle = {
  /** Flies to a position. Pass `padding` when the layout is about to change (e.g. a panel opening). */
  focus: (position: LngLat, opts?: { zoom?: number; padding?: PaddingOptions }) => void;
  showArea: (area: Area) => void;
};

export type MapStatus = "loading" | "ready" | "error";

/** Latest props, read by long-lived map listeners. */
type Latest = Omit<Props, "ref">;

type Props = {
  area: Area;
  places: PlaceCollection;
  selectedPlaceId: string | null;
  /** Screen space covered by floating UI, so focused places stay visible. */
  padding: PaddingOptions;
  /** Where the area's restaurants actually are; used for the initial view and "return to area". */
  focusBounds: BBox | null;
  onPlaceClick: (place: PlaceProperties, overlapping: PlaceProperties[]) => void;
  onBackgroundClick: () => void;
  ref?: Ref<RestaurantMapHandle>;
};

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type AreaCamera =
  | { bounds: [LngLat, LngLat]; padding: PaddingOptions }
  | { center: LngLat; zoom: number };

/** Frames the area's restaurants when known, else its bbox, else its centre. */
function areaCamera(area: Area, padding: PaddingOptions, focusBounds: BBox | null): AreaCamera {
  const box = focusBounds ?? area.bbox;
  if (box) {
    const [w, s, e, n] = box;
    return {
      bounds: [
        [w, s],
        [e, n],
      ],
      padding,
    };
  }
  return { center: area.center, zoom: area.zoom };
}

export function RestaurantMap({ area, places, selectedPlaceId, padding, focusBounds, onPlaceClick, onBackgroundClick, ref }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [attempt, setAttempt] = useState(0);

  // Latest values for use inside long-lived map listeners.
  const latest = useRef<Latest>({ places, selectedPlaceId, padding, focusBounds, onPlaceClick, onBackgroundClick, area });
  useEffect(() => {
    latest.current = { places, selectedPlaceId, padding, focusBounds, onPlaceClick, onBackgroundClick, area };
  });

  useImperativeHandle(
    ref,
    () => ({
      focus(position, opts) {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo({
          center: position,
          zoom: Math.max(map.getZoom(), opts?.zoom ?? mapConfig.focusZoom),
          padding: opts?.padding ?? latest.current.padding,
          duration: prefersReducedMotion() ? 0 : 1100,
          essential: true,
        });
      },
      showArea(target) {
        const map = mapRef.current;
        if (!map) return;
        const camera = areaCamera(target, latest.current.padding, target.id === latest.current.area.id ? latest.current.focusBounds : null);
        const duration = prefersReducedMotion() ? 0 : 1000;
        if ("bounds" in camera) map.fitBounds(camera.bounds, { padding: camera.padding, duration });
        else map.flyTo({ center: camera.center, zoom: camera.zoom, duration });
      },
    }),
    [],
  );

  // ── Create the map (once per mount / retry) ─────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const abort = new AbortController();
    let map: MapLibreMap | null = null;

    (async () => {
      try {
        const [maplibre, style] = await Promise.all([loadMapLibre(), loadMapStyle(abort.signal)]);
        if (abort.signal.aborted) return;

        const { area: initialArea, padding: initialPadding, focusBounds: initialFocus } = latest.current;
        const [bw, bs, be, bn] = mapConfig.cityBounds;
        const camera = areaCamera(initialArea, initialPadding, initialFocus);

        map = new maplibre.Map({
          container,
          style,
          ...("bounds" in camera
            ? { bounds: camera.bounds, fitBoundsOptions: { padding: camera.padding } }
            : { center: camera.center, zoom: camera.zoom }),
          minZoom: mapConfig.minZoom,
          maxZoom: mapConfig.maxZoom,
          maxBounds: [
            [bw, bs],
            [be, bn],
          ],
          attributionControl: {
            compact: true,
            customAttribution: "Restaurant data © OpenStreetMap contributors",
          },
          dragRotate: false,
          pitchWithRotate: false,
          cooperativeGestures: false,
        });
        mapRef.current = map;
        if (process.env.NODE_ENV !== "production") {
          (window as unknown as { __biteAtlasMap?: MapLibreMap }).__biteAtlasMap = map;
        }
        map.touchZoomRotate.disableRotation();
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "bottom-right");

        map.on("error", (e) => {
          // Tile hiccups are recoverable; only a failure before first load is fatal.
          if (!map?.loaded()) console.warn("map error", e.error);
        });

        map.on("load", () => {
          if (!map) return;
          installLayers(map, latest);
          setStatus("ready");
        });
      } catch (error) {
        if (abort.signal.aborted) return;
        console.error("Map failed to initialise", error);
        setStatus("error");
      }
    })();

    return () => {
      abort.abort();
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt]);


  // ── Data + selection updates ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    map.getSource<GeoJSONSource>(SOURCE)?.setData(places);
  }, [places, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map) return;
    applySelection(map, selectedPlaceId);
  }, [selectedPlaceId, status]);

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        // MapLibre forces `position: relative` on its container, so size it explicitly.
        className="h-full w-full"
        role="region"
        aria-label={`Map of ${area.name} restaurants. Use the restaurant list for a non-visual alternative.`}
      />
      {status !== "ready" && (
        <MapFallback
          status={status}
          onRetry={() => {
            setStatus("loading");
            setAttempt((a) => a + 1);
          }}
        />
      )}
    </div>
  );
}

function applySelection(map: MapLibreMap, placeId: string | null) {
  const filter = ["all", ["!", ["has", "point_count"]], ["==", ["get", "placeId"], placeId ?? "__none__"]];
  map.setFilter(L.selected, filter as never);
  map.setFilter(L.selectedHalo, filter as never);
}

function installLayers(map: MapLibreMap, latest: RefObject<Latest>) {
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  for (const [id, img] of Object.entries(createMarkerImages(ratio))) {
    if (!map.hasImage(id)) map.addImage(id, img, { pixelRatio: ratio });
  }

  map.addSource(SOURCE, {
    type: "geojson",
    data: latest.current.places,
    cluster: true,
    clusterRadius: 46,
    clusterMaxZoom: 15,
    clusterProperties: {
      restaurants: ["+", ["get", "count"]],
      visited: ["+", ["get", "visitedCount"]],
    },
  });

  const ratioExpr = ["/", ["get", "visited"], ["max", 1, ["get", "restaurants"]]] as const;

  map.addLayer({
    id: L.clusters,
    type: "circle",
    source: SOURCE,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": ["interpolate-lab", ["linear"], ratioExpr as never, 0, p.ink, 1, p.tomato],
      "circle-radius": ["interpolate", ["linear"], ["get", "restaurants"], 2, 17, 10, 22, 40, 30],
      "circle-stroke-width": 3,
      "circle-stroke-color": ["case", [">=", ratioExpr as never, 1], p.gold, p.white],
      "circle-opacity": 0.94,
    },
  });

  map.addLayer({
    id: L.clusterCount,
    type: "symbol",
    source: SOURCE,
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["to-string", ["get", "restaurants"]],
      "text-font": [...mapConfig.fonts.bold],
      "text-size": 13,
      "text-allow-overlap": true,
    },
    paint: { "text-color": p.white },
  });

  map.addLayer({
    id: L.selectedHalo,
    type: "circle",
    source: SOURCE,
    filter: ["==", ["get", "placeId"], ""],
    paint: {
      "circle-radius": 13,
      "circle-color": p.tomato,
      "circle-opacity": 0.22,
      "circle-stroke-color": p.tomato,
      "circle-stroke-width": 1.5,
      "circle-stroke-opacity": 0.6,
      "circle-pitch-alignment": "map",
    },
  });

  const isGroup = ["==", ["get", "kind"], "building"];
  const iconLayout = {
    "icon-image": ["get", "icon"],
    "icon-anchor": ["case", isGroup, "center", "bottom"],
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
    "text-field": ["case", isGroup, ["to-string", ["get", "count"]], ""],
    "text-font": [...mapConfig.fonts.bold],
    "text-size": 13,
    "text-offset": [-0.08, 0.16],
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  } as const;
  const iconPaint = {
    "text-color": ["case", [">=", ["get", "visitedCount"], ["get", "count"]], p.white, p.ink],
  } as const;

  map.addLayer({
    id: L.places,
    type: "symbol",
    source: SOURCE,
    filter: ["!", ["has", "point_count"]],
    layout: iconLayout as never,
    paint: iconPaint as never,
  });

  map.addLayer({
    id: L.labels,
    type: "symbol",
    source: SOURCE,
    minzoom: 15.5,
    filter: ["!", ["has", "point_count"]],
    layout: {
      "text-field": ["get", "label"],
      "text-font": [...mapConfig.fonts.bold],
      "text-size": 11.5,
      "text-anchor": "top",
      "text-offset": ["case", isGroup, ["literal", [0, 1.45]], ["literal", [0, 0.35]]],
      "text-max-width": 9,
      "text-optional": true,
      "text-padding": 4,
    } as never,
    paint: {
      "text-color": p.ink,
      "text-halo-color": p.halo,
      "text-halo-width": 1.6,
    },
  });

  map.addLayer({
    id: L.selected,
    type: "symbol",
    source: SOURCE,
    filter: ["==", ["get", "placeId"], ""],
    layout: { ...iconLayout, "icon-size": 1.28, "text-size": 15 } as never,
    paint: iconPaint as never,
  });

  applySelection(map, latest.current.selectedPlaceId);

  // ── interaction ──
  for (const layer of [L.clusters, L.places, L.selected]) {
    map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
  }

  map.on("click", async (e) => {
    const hits = map.queryRenderedFeatures(e.point, { layers: [L.selected, L.places, L.clusters] });
    const hit = hits[0];
    if (!hit) {
      latest.current.onBackgroundClick();
      return;
    }

    if (hit.layer.id === L.clusters) {
      const source = map.getSource<GeoJSONSource>(SOURCE);
      const clusterId = hit.properties.cluster_id as number;
      if (!source) return;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({
        center: (hit.geometry as GeoJSON.Point).coordinates as LngLat,
        zoom: Math.min(zoom + 0.3, mapConfig.maxZoom),
        duration: prefersReducedMotion() ? 0 : 600,
      });
      return;
    }

    // Markers whose icons overlap at this zoom: let the user choose.
    const pad = 14;
    const near = map.queryRenderedFeatures(
      [
        [e.point.x - pad, e.point.y - pad],
        [e.point.x + pad, e.point.y + pad],
      ],
      { layers: [L.places] },
    );
    const unique = new Map<string, PlaceProperties>();
    for (const f of [hit, ...near] as MapGeoJSONFeature[]) {
      const props = f.properties as PlaceProperties;
      if (!unique.has(props.placeId)) unique.set(props.placeId, props);
    }
    latest.current.onPlaceClick(hit.properties as PlaceProperties, [...unique.values()]);
  });
}
