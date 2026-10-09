/**
 * Unit tests for the pure logic: progress math, filters/search, building
 * grouping, import normalisation and visit rules.
 *
 *   npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvRowToRecord, parseCsv, slugify, validateRestaurants } from "../src/lib/catalog/import-format";
import { normalizeCatalog } from "../src/lib/catalog/normalize";
import { applyFilters, DEFAULT_FILTERS, rankSearch } from "../src/lib/restaurants/filters";
import { floorLabel } from "../src/lib/restaurants/format";
import { pointInArea, pointInGeometry } from "../src/lib/geo";
import { areaFrame } from "../src/lib/map/frame";
import { buildPlaces } from "../src/lib/restaurants/places";
import { formatPercent, overallProgress, progressByArea, progressOf } from "../src/lib/restaurants/progress";
import { applyVisitPatch, isEmptyVisit, mergeVisits } from "../src/lib/visits/model";
import type { Area, Building, Restaurant, Visit, VisitMap } from "../src/types/domain";

const area = (id: string, active = true): Area => ({
  id,
  slug: id,
  name: id,
  city: "Dhaka",
  description: null,
  center: [90.4, 23.87],
  zoom: 14,
  bbox: null,
  boundary: null,
  active,
  sortOrder: 0,
  group: null,
});

const restaurant = (id: string, over: Partial<Restaurant> = {}): Restaurant => ({
  id,
  slug: id,
  name: id,
  nameBn: null,
  areaId: "uttara",
  buildingId: null,
  position: [90.4, 23.87],
  floor: null,
  address: null,
  phone: null,
  website: null,
  rating: null,
  ratingCount: null,
  photoUrl: null,
  categoryIds: ["burger"],
  googlePlaceId: null,
  osmId: null,
  overtureId: null,
  source: "manual",
  ...over,
});

const visit = (restaurantId: string, over: Partial<Visit> = {}): Visit => ({
  restaurantId,
  visited: true,
  visitedAt: "2026-10-08",
  favorite: false,
  notes: null,
  updatedAt: "2026-10-08T00:00:00Z",
  ...over,
});

describe("progress", () => {
  it("computes visited / total with precise percent", () => {
    const rs = Array.from({ length: 217 }, (_, i) => restaurant(`r${i}`));
    const visits: VisitMap = {};
    for (let i = 0; i < 43; i++) visits[`r${i}`] = visit(`r${i}`);
    const p = progressOf(rs, visits);
    assert.equal(p.visited, 43);
    assert.equal(p.total, 217);
    assert.ok(Math.abs(p.percent - 19.8156682) < 1e-6);
    assert.equal(formatPercent(p.percent), "19.8%");
  });

  it("ignores favorites that aren't visits", () => {
    const p = progressOf([restaurant("a")], { a: visit("a", { visited: false, visitedAt: null, favorite: true }) });
    assert.equal(p.visited, 0);
  });

  it("overall = Σ visited / Σ restaurants across active areas only", () => {
    const areas = [area("uttara"), area("dhanmondi"), area("gulshan", false)];
    const rs = [
      ...Array.from({ length: 10 }, (_, i) => restaurant(`u${i}`, { areaId: "uttara" })),
      ...Array.from({ length: 30 }, (_, i) => restaurant(`d${i}`, { areaId: "dhanmondi" })),
      restaurant("g0", { areaId: "gulshan" }),
    ];
    const visits: VisitMap = { u0: visit("u0"), u1: visit("u1"), d0: visit("d0"), g0: visit("g0") };
    const overall = overallProgress(areas, rs, visits);
    assert.deepEqual([overall.visited, overall.total], [3, 40]);
    const byArea = progressByArea(areas, rs, visits);
    assert.deepEqual(
      byArea.map((a) => [a.area.id, a.visited, a.total]),
      [
        ["uttara", 2, 10],
        ["dhanmondi", 1, 30],
        ["gulshan", 0, 0],
      ],
    );
  });

  it("formats edge cases", () => {
    assert.equal(formatPercent(0), "0.0%");
    assert.equal(formatPercent(100), "100.0%");
    assert.equal(formatPercent(0.01), "<0.1%");
  });
});

describe("places (buildings + markers)", () => {
  const building: Building = { id: "b1", slug: "b1", name: "Union Nahar Square", address: null, areaId: "uttara", position: [90.41, 23.86] };
  const buildings = new Map([[building.id, building]]);

  it("groups restaurants in one building into a single marker", () => {
    const rs = [restaurant("chillox", { buildingId: "b1" }), restaurant("cafe-a", { buildingId: "b1" }), restaurant("solo")];
    const fc = buildPlaces(rs, buildings, { chillox: visit("chillox") });
    assert.equal(fc.features.length, 2);
    const group = fc.features.find((f) => f.properties.kind === "building")!;
    assert.equal(group.properties.count, 2);
    assert.equal(group.properties.visitedCount, 1);
    assert.equal(group.properties.icon, "group-some");
    assert.deepEqual(group.geometry.coordinates, building.position);
  });

  it("keeps restaurants with identical coordinates as distinct records", () => {
    const rs = [restaurant("a", { position: [90.4, 23.87] }), restaurant("b", { position: [90.4, 23.87] })];
    const fc = buildPlaces(rs, new Map(), {});
    assert.deepEqual(
      fc.features.map((f) => f.properties.restaurantId),
      ["a", "b"],
    );
  });

  it("draws a building with one visible member as a normal pin", () => {
    const fc = buildPlaces([restaurant("chillox", { buildingId: "b1" })], buildings, { chillox: visit("chillox", { favorite: true }) });
    assert.equal(fc.features[0].properties.kind, "restaurant");
    assert.equal(fc.features[0].properties.placeId, "b:b1");
    assert.equal(fc.features[0].properties.icon, "pin-visited-favorite");
  });
});

describe("filters and search", () => {
  const rs = [
    restaurant("chillox-uttara", { name: "Chillox Uttara", categoryIds: ["burger", "fast-food"] }),
    restaurant("cafe-x", { name: "Café X", categoryIds: ["cafe"] }),
    restaurant("kacchi-bhai", { name: "Kacchi Bhai", categoryIds: ["kacchi"], buildingId: "b1" }),
  ];
  const visits: VisitMap = { "chillox-uttara": visit("chillox-uttara"), "cafe-x": visit("cafe-x", { visited: false, visitedAt: null, favorite: true }) };
  const names = new Map([["b1", "Rajlaxmi Complex"]]);
  const ids = (list: Restaurant[]) => list.map((r) => r.id);

  it("filters by status", () => {
    assert.deepEqual(ids(applyFilters(rs, { ...DEFAULT_FILTERS, status: "visited" }, visits, names)), ["chillox-uttara"]);
    assert.deepEqual(ids(applyFilters(rs, { ...DEFAULT_FILTERS, status: "unvisited" }, visits, names)), ["cafe-x", "kacchi-bhai"]);
    assert.deepEqual(ids(applyFilters(rs, { ...DEFAULT_FILTERS, status: "favorites" }, visits, names)), ["cafe-x"]);
  });

  it("filters by any category, not just the primary one", () => {
    assert.deepEqual(ids(applyFilters(rs, { ...DEFAULT_FILTERS, categoryId: "fast-food" }, visits, names)), ["chillox-uttara"]);
  });

  it("search is accent- and case-insensitive and matches building names", () => {
    assert.deepEqual(ids(rankSearch(rs, "chillox", names)), ["chillox-uttara"]);
    assert.deepEqual(ids(rankSearch(rs, "CAFE", names)), ["cafe-x"]);
    assert.deepEqual(ids(rankSearch(rs, "rajlaxmi", names)), ["kacchi-bhai"]);
  });
});

describe("visit rules", () => {
  it("visiting defaults the date; un-visiting clears it", () => {
    const v = applyVisitPatch("a", undefined, { visited: true });
    assert.match(v.visitedAt!, /^\d{4}-\d{2}-\d{2}$/);
    const custom = applyVisitPatch("a", v, { visitedAt: "2026-01-02" });
    assert.equal(custom.visitedAt, "2026-01-02");
    const un = applyVisitPatch("a", custom, { visited: false });
    assert.equal(un.visitedAt, null);
    assert.ok(isEmptyVisit(un));
  });

  it("favoriting keeps visit state", () => {
    const v = applyVisitPatch("a", visit("a"), { favorite: true });
    assert.equal(v.visited, true);
    assert.equal(v.visitedAt, "2026-10-08");
  });

  it("merging guest progress keeps the earliest date and ORs flags", () => {
    const merged = mergeVisits(
      visit("a", { visitedAt: "2026-10-05", notes: "great kacchi" }),
      visit("a", { visitedAt: "2026-09-30", favorite: true, notes: "guest note" }),
    );
    assert.equal(merged.visitedAt, "2026-09-30");
    assert.equal(merged.favorite, true);
    assert.equal(merged.notes, "great kacchi");
  });
});

describe("import format", () => {
  const areas = [{ slug: "uttara", name: "Uttara", latitude: 23.87, longitude: 90.4 }];
  const categories = [
    { slug: "burger", name: "Burger" },
    { slug: "fast-food", name: "Fast Food" },
    { slug: "restaurant", name: "Restaurant" },
  ];

  it("groups by building name, keeps unique slugs, resolves names case-insensitively", () => {
    const plan = normalizeCatalog(areas, categories, [
      { name: "Chillox", area: "Uttara", latitude: 23.875, longitude: 90.4, building: "Union Nahar Square", floor: 2, categories: ["Burger", "fast food"] },
      { name: "Cafe A", area: "uttara", latitude: 23.8752, longitude: 90.4002, building: "Union Nahar Square", floor: "3" },
      { name: "Chillox", area: "Uttara", latitude: 23.86, longitude: 90.39 },
    ]);
    assert.equal(plan.buildings.length, 1);
    assert.equal(plan.buildings[0].slug, "uttara-union-nahar-square");
    assert.ok(Math.abs(plan.buildings[0].latitude - 23.8751) < 1e-9);
    assert.deepEqual(
      plan.restaurants.map((r) => [r.slug, r.buildingSlug, r.floor, r.categorySlugs.join(",")]),
      [
        ["chillox", "uttara-union-nahar-square", "2", "burger,fast-food"],
        ["cafe-a", "uttara-union-nahar-square", "3", "restaurant"],
        ["chillox-2", null, null, "restaurant"],
      ],
    );
  });

  it("skips unknown areas with a warning", () => {
    const plan = normalizeCatalog(areas, categories, [{ name: "X", area: "Atlantis", latitude: 1, longitude: 1 }]);
    assert.equal(plan.restaurants.length, 0);
    assert.match(plan.warnings[0], /unknown area/);
  });

  it("parses CSV with quotes and validates rows", () => {
    const rows = parseCsv('name,area,latitude,longitude,categories,building\n"Pizza ""Hut""",Uttara,23.87,90.40,"Pizza;Fast Food",\nBad,Uttara,abc,90.4,,\n');
    const records = rows.map(csvRowToRecord);
    assert.equal(records[0].name, 'Pizza "Hut"');
    assert.equal(records[0].building, null);
    const issues = validateRestaurants(records);
    assert.equal(issues.length, 1);
    assert.equal(issues[0].name, "Bad");
  });

  it("slugify handles accents and symbols", () => {
    assert.equal(slugify("Café & Grill — Sector 7!"), "cafe-and-grill-sector-7");
  });
});

describe("formatting", () => {
  it("labels floors", () => {
    assert.equal(floorLabel("1"), "1st floor");
    assert.equal(floorLabel("12"), "12th floor");
    assert.equal(floorLabel("Ground"), "Ground floor");
    assert.equal(floorLabel("2,3,4"), "Floors 2, 3 & 4");
    assert.equal(floorLabel(null), null);
  });
});

describe("area boundary", () => {
  const triangle: GeoJSON.Polygon = {
    type: "Polygon",
    coordinates: [
      [
        [90.38, 23.85],
        [90.41, 23.85],
        [90.395, 23.9],
        [90.38, 23.85],
      ],
    ],
  };

  it("point-in-polygon follows the outline, not its bbox", () => {
    assert.equal(pointInGeometry(90.395, 23.86, triangle), true);
    // inside the bbox but outside the triangle
    assert.equal(pointInGeometry(90.381, 23.895, triangle), false);
    assert.equal(pointInArea(90.381, 23.895, { bbox: [90.38, 23.85, 90.41, 23.9] }), true);
    assert.equal(pointInArea(90.381, 23.895, { bbox: [90.38, 23.85, 90.41, 23.9], boundary_geojson: triangle }), false);
  });

  it("frames the real outline", () => {
    const frame = areaFrame({ ...area("uttara"), bbox: [90.38, 23.85, 90.41, 23.9], boundary: triangle });
    assert.deepEqual(frame.extent, [90.38, 23.85, 90.41, 23.9]);
    assert.equal(frame.outline.geometry, triangle);
    // the mask is the world minus the outline (one hole)
    assert.equal(frame.mask.geometry.coordinates.length, 2);
  });
});

describe("slug stability", () => {
  const areas = [
    { slug: "uttara", name: "Uttara", latitude: 23.87, longitude: 90.4 },
    { slug: "gulshan", name: "Gulshan", latitude: 23.79, longitude: 90.41 },
  ];
  const categories = [{ slug: "restaurant", name: "Restaurant" }];
  const uttara = [{ name: "BFC", area: "uttara", latitude: 23.87, longitude: 90.4 }, { name: "Chillox", area: "uttara", latitude: 23.87, longitude: 90.4 }];
  const gulshan = [{ name: "BFC", area: "gulshan", latitude: 23.79, longitude: 90.41 }];

  it("names shared across areas get an area suffix, independent of file order", () => {
    const a = normalizeCatalog(areas, categories, [...uttara, ...gulshan]).restaurants.map((r) => r.slug);
    const b = normalizeCatalog(areas, categories, [...gulshan, ...uttara]).restaurants.map((r) => r.slug);
    assert.deepEqual(a, ["bfc-uttara", "chillox", "bfc-gulshan"]);
    assert.deepEqual([...b].sort(), [...a].sort());
  });
});
