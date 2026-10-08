import "server-only";

import areas from "../../../data/areas.json";
import categories from "../../../data/categories.json";
import uttara from "../../../data/restaurants/uttara.osm.json";
import type { AreaRecord, CategoryRecord, RestaurantFile } from "./import-format";

/**
 * Data files bundled for snapshot mode (no database configured).
 * When you add an area's data file, register it here too.
 */
export const snapshotSources = {
  areas: areas as AreaRecord[],
  categories: categories as CategoryRecord[],
  restaurantFiles: [uttara as RestaurantFile],
};
