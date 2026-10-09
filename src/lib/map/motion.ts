import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { LngLat } from "@/types/domain";

/**
 * Small map animations. Each one is skipped (or jumps to its end state)
 * when the visitor prefers reduced motion.
 */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Paint properties that start at 0 and fade to their value once the map has drawn. */
export type FadeIn = { layer: string; property: string; value: number };

/** Fades marker layers in after the first full render, instead of popping in. */
export function revealLayers(map: MapLibreMap, fades: FadeIn[], duration = 650) {
  // Property names are dynamic here, so go through an untyped view of the setter.
  const setPaint = map.setPaintProperty.bind(map) as (layer: string, name: string, value: unknown) => void;
  const show = () => {
    for (const [i, f] of fades.entries()) {
      if (!map.getLayer(f.layer)) continue;
      setPaint(f.layer, `${f.property}-transition`, { duration: prefersReducedMotion() ? 0 : duration, delay: i * 60 });
      setPaint(f.layer, f.property, f.value);
    }
  };
  if (map.loaded()) map.once("idle", show);
  else map.once("load", () => map.once("idle", show));
}

/** Pulses a circle layer outward a few times (the selected-marker halo), then settles. Returns a cancel function. */
export function pulseCircle(map: MapLibreMap, layer: string, rest: { radius: number; opacity: number }, pulses = 2): () => void {
  if (prefersReducedMotion() || !map.getLayer(layer)) return () => {};
  const period = 1100;
  const start = performance.now();
  let frame = 0;
  const settle = () => {
    if (!map.getLayer(layer)) return;
    map.setPaintProperty(layer, "circle-radius", rest.radius);
    map.setPaintProperty(layer, "circle-opacity", rest.opacity);
    map.setPaintProperty(layer, "circle-stroke-opacity", 0.6);
  };
  const tick = (now: number) => {
    if (!map.getLayer(layer)) return;
    const t = (now - start) / period;
    if (t >= pulses) return settle();
    const phase = t % 1;
    const eased = 1 - (1 - phase) ** 3;
    map.setPaintProperty(layer, "circle-radius", rest.radius + eased * 16);
    map.setPaintProperty(layer, "circle-opacity", rest.opacity * 1.6 * (1 - phase));
    map.setPaintProperty(layer, "circle-stroke-opacity", 0.8 * (1 - phase));
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    settle();
  };
}

const RIPPLE_SOURCE = "visit-ripple";
const RIPPLE_LAYER = "visit-ripple";

/** Adds the (initially empty) layer used by `ripple`, below `beforeLayer`. */
export function installRipple(map: MapLibreMap, color: string, beforeLayer?: string) {
  map.addSource(RIPPLE_SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer(
    {
      id: RIPPLE_LAYER,
      type: "circle",
      source: RIPPLE_SOURCE,
      paint: {
        "circle-radius": 0,
        "circle-color": color,
        "circle-opacity": 0,
        "circle-stroke-color": color,
        "circle-stroke-width": 3,
        "circle-stroke-opacity": 0,
        "circle-pitch-alignment": "map",
      },
    },
    beforeLayer,
  );
}

/** A ring that ripples out from each position — played when a restaurant is marked visited. */
export function ripple(map: MapLibreMap, positions: LngLat[]) {
  const source = map.getSource<GeoJSONSource>(RIPPLE_SOURCE);
  if (!source || positions.length === 0 || prefersReducedMotion()) return;
  source.setData({
    type: "FeatureCollection",
    features: positions.map((coordinates) => ({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates } })),
  });
  const duration = 1000;
  const start = performance.now();
  const tick = (now: number) => {
    if (!map.getLayer(RIPPLE_LAYER)) return;
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    map.setPaintProperty(RIPPLE_LAYER, "circle-radius", 8 + eased * 46);
    map.setPaintProperty(RIPPLE_LAYER, "circle-opacity", 0.25 * (1 - t));
    map.setPaintProperty(RIPPLE_LAYER, "circle-stroke-opacity", 0.9 * (1 - t));
    if (t < 1) requestAnimationFrame(tick);
    else source.setData({ type: "FeatureCollection", features: [] });
  };
  requestAnimationFrame(tick);
}
