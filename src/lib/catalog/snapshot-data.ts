import "server-only";

import areas from "../../../data/areas.json";
import categories from "../../../data/categories.json";
import uttaraOsm from "../../../data/restaurants/uttara.osm.json";
import uttaraOverture from "../../../data/restaurants/uttara.overture.json";
import bashundharaOsm from "../../../data/restaurants/bashundhara.osm.json";
import bashundharaOverture from "../../../data/restaurants/bashundhara.overture.json";
import dhanmondiOsm from "../../../data/restaurants/dhanmondi.osm.json";
import dhanmondiOverture from "../../../data/restaurants/dhanmondi.overture.json";
import bananiOsm from "../../../data/restaurants/banani.osm.json";
import bananiOverture from "../../../data/restaurants/banani.overture.json";
import gulshanOsm from "../../../data/restaurants/gulshan.osm.json";
import gulshanOverture from "../../../data/restaurants/gulshan.overture.json";
import mirpur123Osm from "../../../data/restaurants/mirpur-1-2-3.osm.json";
import mirpur123Overture from "../../../data/restaurants/mirpur-1-2-3.overture.json";
import mirpur612PallabiOsm from "../../../data/restaurants/mirpur-6-12-pallabi.osm.json";
import mirpur612PallabiOverture from "../../../data/restaurants/mirpur-6-12-pallabi.overture.json";
import mirpur101315Osm from "../../../data/restaurants/mirpur-10-13-15.osm.json";
import mirpur101315Overture from "../../../data/restaurants/mirpur-10-13-15.overture.json";
import mirpurMonipurKaziparaOsm from "../../../data/restaurants/mirpur-monipur-kazipara.osm.json";
import mirpurMonipurKaziparaOverture from "../../../data/restaurants/mirpur-monipur-kazipara.overture.json";
import type { AreaRecord, CategoryRecord, RestaurantFile } from "./import-format";

/**
 * Data files bundled for snapshot mode (no database configured).
 * When you add an area's data file, register it here too.
 */
export const snapshotSources = {
  areas: areas as AreaRecord[],
  categories: categories as CategoryRecord[],
  restaurantFiles: [
    uttaraOsm as RestaurantFile,
    uttaraOverture as RestaurantFile,
    bashundharaOsm as RestaurantFile,
    bashundharaOverture as RestaurantFile,
    dhanmondiOsm as RestaurantFile,
    dhanmondiOverture as RestaurantFile,
    bananiOsm as RestaurantFile,
    bananiOverture as RestaurantFile,
    gulshanOsm as RestaurantFile,
    gulshanOverture as RestaurantFile,
    mirpur123Osm as RestaurantFile,
    mirpur123Overture as RestaurantFile,
    mirpur612PallabiOsm as RestaurantFile,
    mirpur612PallabiOverture as RestaurantFile,
    mirpur101315Osm as RestaurantFile,
    mirpur101315Overture as RestaurantFile,
    mirpurMonipurKaziparaOsm as RestaurantFile,
    mirpurMonipurKaziparaOverture as RestaurantFile,
  ],
};
