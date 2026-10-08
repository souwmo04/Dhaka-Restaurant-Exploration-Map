import type { StyleSpecification } from "maplibre-gl";
import { mapConfig } from "./config";
import { mapPalette as p } from "./theme";

type Layer = StyleSpecification["layers"][number];
type Paint = Record<string, unknown>;

/** Latin-script names first: MapLibre cannot shape Bangla glyphs correctly. */
const LATIN_NAME = ["coalesce", ["get", "name:en"], ["get", "name_en"], ["get", "name:latin"], ["get", "name"]];

const fills: [RegExp, Paint][] = [
  [/^park$/, { "fill-color": p.park }],
  [/^water$/, { "fill-color": p.water }],
  [/^landuse_residential$/, { "fill-color": p.residential }],
  [/^landcover_wood$/, { "fill-color": p.wood }],
  [/^building$/, { "fill-color": p.building, "fill-outline-color": p.buildingOutline }],
  [/^aeroway-area$/, { "fill-color": "#f7f3ec" }],
  [/^road_area_pier$/, { "fill-color": p.land }],
];

const lines: [RegExp, Paint][] = [
  [/^waterway$/, { "line-color": p.water }],
  [/casing/, { "line-color": p.roadCasing }],
  [/^highway_motorway(_bridge)?_inner$/, { "line-color": p.motorway }],
  [/^highway_major_inner$/, { "line-color": p.roadMajor }],
  [/^highway_minor$/, { "line-color": p.roadMinor, "line-opacity": 1 }],
  [/^highway_path$/, { "line-color": "#ece4d6" }],
  [/^highway_(major|motorway)_subtle$/, { "line-color": p.roadCasing }],
  [/^railway/, { "line-color": p.rail }],
  [/^aeroway-(taxiway|runway-casing)$/, { "line-color": "#e6ddcf" }],
  [/^aeroway-runway$/, { "line-color": "#f7f3ec" }],
  [/^boundary/, { "line-color": "#c9bda9" }],
];

function themeLayer(layer: Layer): Layer {
  const id = layer.id;
  const paint = { ...(("paint" in layer && layer.paint) || {}) } as Paint;

  if (layer.type === "background") paint["background-color"] = p.land;
  if (layer.type === "fill") for (const [re, v] of fills) if (re.test(id)) Object.assign(paint, v);
  if (layer.type === "line") {
    for (const [re, v] of lines) {
      if (re.test(id)) {
        Object.assign(paint, v);
        break;
      }
    }
    if (/^highway_motorway(_bridge)?_casing$/.test(id)) paint["line-color"] = p.motorwayCasing;
  }

  if (layer.type === "symbol") {
    const layout = { ...(layer.layout ?? {}) } as Record<string, unknown>;
    if (Array.isArray(layout["text-field"]) && JSON.stringify(layout["text-field"]).includes("name")) {
      layout["text-field"] = LATIN_NAME;
    }
    paint["text-halo-color"] = p.halo;
    if (/^label_|airport/.test(id)) paint["text-color"] = p.placeLabel;
    else if (/water/.test(id)) paint["text-color"] = p.waterLabel;
    else paint["text-color"] = p.label;
    return { ...layer, layout, paint } as Layer;
  }

  return { ...layer, paint } as Layer;
}

/**
 * Fetches the configured basemap style and applies the BiteAtlas palette.
 * Layers we don't recognise are kept as-is, so other OpenMapTiles-based styles
 * still work (just without the custom palette).
 */
export async function loadMapStyle(signal?: AbortSignal): Promise<StyleSpecification> {
  const res = await fetch(mapConfig.styleUrl, { signal });
  if (!res.ok) throw new Error(`Map style request failed (${res.status})`);
  const style = (await res.json()) as StyleSpecification;
  if (!mapConfig.applyTheme) return style;

  return {
    ...style,
    layers: style.layers
      // Drop the low-zoom shaded-relief raster and US road shields; irrelevant for Dhaka.
      .filter((l) => !("source" in l && l.source === "ne2_shaded") && !/shield/.test(l.id))
      .map(themeLayer),
  };
}
