import type { BBox } from "@/types/domain";

/**
 * Map provider settings. Everything provider-specific lives in src/lib/map —
 * swap the style URL (or the theme) here without touching components.
 */
export const mapConfig = {
  /** Any MapLibre-compatible vector style. Default: OpenFreeMap Positron (OSM data, no API key). */
  styleUrl: process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron",
  /** Applies the BiteAtlas palette to known OpenMapTiles layer ids. */
  applyTheme: true,
  /** Font stack available from the style's glyph server. */
  fonts: {
    regular: ["Noto Sans Regular"],
    bold: ["Noto Sans Bold"],
  },
  /** Keep the camera around Dhaka so the world never dominates the screen. */
  cityBounds: [90.18, 23.6, 90.62, 24.02] as BBox,
  minZoom: 10.5,
  maxZoom: 19,
  /** Zoom used when focusing a single restaurant. */
  focusZoom: 17,
} as const;
