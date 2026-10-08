// Database tests: runs supabase/migrations against real Postgres (PGlite +
// PostGIS, in-process — no Docker) with a minimal stand-in for Supabase's
// auth schema and API roles, then verifies the RLS rules.
//
//   npm run test:db
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = await PGlite.create({ extensions: { postgis } });

await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth; create schema extensions;
  grant usage on schema extensions to anon, authenticated;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
`);

const migDir = join(ROOT, "supabase/migrations");
for (const f of readdirSync(migDir).sort()) {
  await db.exec(readFileSync(join(migDir, f), "utf8"));
  console.log("ok migration", f);
}

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
await db.exec(`
  insert into auth.users (id, email, raw_user_meta_data) values ('${A}', 'a@test.local', '{"full_name":"Alice"}'), ('${B}', 'b@test.local', '{}');
  insert into public.areas (slug, name, latitude, longitude, active) values ('uttara', 'Uttara', 23.87, 90.39, true);
  insert into public.restaurants (slug, name, area_id, latitude, longitude) select 'r1', 'Resto One', id, 23.8686, 90.3987 from public.areas;
  insert into public.restaurants (slug, name, area_id, latitude, longitude, active) select 'r2', 'Hidden', id, 23.87, 90.40, false from public.areas;
`);

let pass = 0;
let fail = 0;
async function as(role, sub, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${sub ?? ""}', false); set role ${role};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}
async function expectOk(name, fn) {
  try {
    await fn();
    console.log("  PASS", name);
    pass++;
  } catch (e) {
    console.log("  FAIL", name, "->", e.message);
    fail++;
  }
}
async function expectFail(name, fn, re) {
  try {
    await fn();
    console.log("  FAIL", name, "-> succeeded but should fail");
    fail++;
  } catch (e) {
    if (re && !re.test(e.message)) {
      console.log("  FAIL", name, "-> wrong error:", e.message);
      fail++;
    } else {
      console.log("  PASS", name, `(${e.message.split("\n")[0]})`);
      pass++;
    }
  }
}
function check(name, cond, detail) {
  if (cond) {
    console.log("  PASS", name);
    pass++;
  } else {
    console.log("  FAIL", name, detail ?? "");
    fail++;
  }
}
const r1 = (await db.query("select id from public.restaurants where slug='r1'")).rows[0].id;
const insertRestaurant = "insert into public.restaurants (slug,name,area_id,latitude,longitude) select 'x','x',id,1,1 from public.areas";

console.log("\nProfiles trigger");
const profiles = (await db.query("select id, display_name, is_admin from public.profiles order by id")).rows;
check("profiles auto-created for new users", profiles.length === 2 && profiles[0].display_name === "Alice", JSON.stringify(profiles));

console.log("\nCatalog visibility");
await as("anon", null, async () => {
  const rows = (await db.query("select slug from public.restaurants")).rows.map((r) => r.slug);
  check("anon sees active restaurants only", rows.length === 1 && rows[0] === "r1", JSON.stringify(rows));
  await expectFail("anon cannot write restaurants", () => db.query(insertRestaurant), /row-level security|permission/);
  await expectFail("anon cannot read visits", () => db.query("select * from public.user_restaurants"), /permission denied/);
});

console.log("\nVisits are private");
await as("authenticated", A, async () => {
  await expectOk("A records a visit", () =>
    db.query(`insert into public.user_restaurants (user_id, restaurant_id, visited, visited_at) values ('${A}', '${r1}', true, '2026-10-08')`),
  );
  await expectOk("A upserts the same visit (on conflict)", () =>
    db.query(
      `insert into public.user_restaurants (user_id, restaurant_id, visited, visited_at, favorite) values ('${A}', '${r1}', true, '2026-10-08', true) on conflict (user_id, restaurant_id) do update set favorite = excluded.favorite`,
    ),
  );
  const mine = (await db.query("select favorite from public.user_restaurants")).rows;
  check("A sees exactly their one row", mine.length === 1 && mine[0].favorite === true, JSON.stringify(mine));
  await expectFail(
    "A cannot write a visit for B",
    () => db.query(`insert into public.user_restaurants (user_id, restaurant_id, visited) values ('${B}', '${r1}', true)`),
    /row-level security/,
  );
  await expectFail(
    "visited_at requires visited",
    () => db.query("update public.user_restaurants set visited = false, visited_at = '2026-10-08'"),
    /visited_at_requires_visit/,
  );
  await expectFail("A cannot make themselves admin", () => db.query(`update public.profiles set is_admin = true where id = '${A}'`), /permission denied/);
  await expectOk("A can rename themselves", () => db.query(`update public.profiles set display_name = 'Alice B' where id = '${A}'`));
  await expectFail("non-admin cannot add restaurants", () => db.query(insertRestaurant), /row-level security/);
});

await as("authenticated", B, async () => {
  const rows = (await db.query("select * from public.user_restaurants")).rows;
  check("B cannot see A's visits", rows.length === 0, JSON.stringify(rows));
  const upd = await db.query(`update public.user_restaurants set favorite = false where user_id = '${A}'`);
  check("B cannot modify A's visits", upd.affectedRows === 0, `affected ${upd.affectedRows}`);
  const del = await db.query("delete from public.user_restaurants");
  check("B cannot delete A's visits", del.affectedRows === 0, `affected ${del.affectedRows}`);
  const prof = (await db.query("select id from public.profiles")).rows;
  check("B only sees own profile", prof.length === 1 && prof[0].id === B, JSON.stringify(prof));
});

await as("authenticated", A, async () => {
  await expectFail("A cannot reassign a visit to B", () => db.query(`update public.user_restaurants set user_id = '${B}'`), /row-level security/);
});

console.log("\nAdmins");
await db.exec(`update public.profiles set is_admin = true where id = '${A}'`);
await as("authenticated", A, async () => {
  await expectOk("admin adds a building + restaurant", async () => {
    await db.query("insert into public.buildings (slug,name,area_id,latitude,longitude) select 'uttara-tower','Tower',id,23.87,90.4 from public.areas");
    await db.query(
      "insert into public.restaurants (slug,name,area_id,building_id,latitude,longitude,floor) select 'r3','Admin Added',a.id,b.id,23.87,90.4,'3' from public.areas a, public.buildings b",
    );
  });
  const all = (await db.query("select slug from public.restaurants order by slug")).rows.map((r) => r.slug);
  check("admin also sees inactive restaurants", all.includes("r2"), JSON.stringify(all));
});

console.log("\nPostGIS");
const near = (await db.query("select slug from public.restaurants_near(23.8686, 90.3987, 300)")).rows.map((r) => r.slug);
check("restaurants_near finds the nearby active restaurant", near[0] === "r1" && !near.includes("r2"), JSON.stringify(near));
const loc = (await db.query("select extensions.st_astext(location::extensions.geometry) as wkt from public.restaurants where slug='r1'")).rows[0].wkt;
check("generated geography column", loc === "POINT(90.3987 23.8686)", loc);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
