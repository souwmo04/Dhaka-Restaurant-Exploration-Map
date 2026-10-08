"use client";

/**
 * Lazily loads MapLibre (it's large and browser-only) and points it at the
 * worker copied into /public by scripts/copy-maplibre-worker.mjs.
 */
let loader: Promise<typeof import("maplibre-gl")> | null = null;

export function loadMapLibre() {
  loader ??= import("maplibre-gl").then((mod) => {
    const maplibre = (mod as { default?: typeof import("maplibre-gl") }).default ?? mod;
    maplibre.setWorkerUrl(`/maplibre/maplibre-gl-worker-${maplibre.getVersion()}.mjs`);
    return maplibre;
  });
  return loader;
}
