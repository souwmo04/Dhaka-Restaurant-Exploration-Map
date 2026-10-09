/** [longitude, latitude] — GeoJSON / MapLibre order. */
export type LngLat = [number, number];

/** [west, south, east, north] */
export type BBox = [number, number, number, number];

export type Area = {
  id: string;
  slug: string;
  name: string;
  city: string;
  description: string | null;
  center: LngLat;
  zoom: number;
  bbox: BBox | null;
  /** Only present when a verified boundary exists. Never invented. */
  boundary: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  active: boolean;
  sortOrder: number;
  /** Optional parent grouping, e.g. "Mirpur" for the Mirpur maps. */
  group: string | null;
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  emoji: string | null;
};

export type Building = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  areaId: string;
  position: LngLat;
};

export type RestaurantSource = "osm" | "overture" | "manual" | "google_places" | "import";

export type Restaurant = {
  id: string;
  slug: string;
  name: string;
  /** Name in Bangla, when known. */
  nameBn: string | null;
  areaId: string;
  buildingId: string | null;
  position: LngLat;
  floor: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  ratingCount: number | null;
  photoUrl: string | null;
  /** Primary category first. */
  categoryIds: string[];
  googlePlaceId: string | null;
  osmId: string | null;
  overtureId: string | null;
  source: RestaurantSource;
};

export type Catalog = {
  areas: Area[];
  categories: Category[];
  buildings: Building[];
  restaurants: Restaurant[];
  /** Where the catalog came from: the live database, or the bundled data snapshot. */
  origin: "database" | "snapshot";
};

/** A user's private relationship to one restaurant. */
export type Visit = {
  restaurantId: string;
  visited: boolean;
  /** ISO date, YYYY-MM-DD (a calendar date, not an instant). */
  visitedAt: string | null;
  favorite: boolean;
  notes: string | null;
  updatedAt: string;
};

export type VisitMap = Record<string, Visit>;

export type VisitPatch = Partial<Pick<Visit, "visited" | "visitedAt" | "favorite" | "notes">>;
