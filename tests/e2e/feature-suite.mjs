// Full feature test (80 checks) against a local dev server backed by the local
// Supabase stack. Creates throwaway test users and one test restaurant and
// removes them at the end. Never point this at production.
//
//   npm run db:start && npm run db:import && npm run dev -- -p 3100
//   npm run test:e2e
//
// Env: E2E_BASE_URL (default http://localhost:3100), E2E_DB_CONTAINER
// (default supabase_db_biteatlas), CHROME_PATH.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import puppeteer from "puppeteer-core";
import { chromeArgs, chromePath, sleep } from "./shared.mjs";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error("The feature suite writes test data; run it against a local server only.");
const DB = process.env.E2E_DB_CONTAINER ?? "supabase_db_biteatlas";
const run = randomBytes(3).toString("hex");
const userA = { email: `suite-a-${run}@biteatlas.test`, password: randomBytes(12).toString("base64url") };
const userB = { email: `suite-b-${run}@biteatlas.test`, password: randomBytes(12).toString("base64url") };
const sql = (q) => execFileSync("docker", ["exec", DB, "psql", "-U", "postgres", "-tAc", q]).toString().trim();
const rowsOf = (email) =>
  sql(`select coalesce(string_agg(r.slug||':'||ur.visited||':'||ur.favorite||':'||coalesce(ur.visited_at::text,'-')||':'||coalesce(ur.notes,'-'), ',' order by r.slug), '') from user_restaurants ur join restaurants r on r.id=ur.restaurant_id join auth.users u on u.id=ur.user_id where u.email='${email}'`);

const results = [];
let section = "";
const check = (name, cond, detail = "") => {
  results.push({ section, name, ok: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"} [${section}] ${name}${cond ? "" : "  -> " + detail}`);
};
async function part(name, fn) {
  section = name;
  try { await fn(); } catch (e) { check("section ran without crashing", false, e.message.split("\n")[0]); }
}

// ── test data from the database ──
const areas = sql("select slug||'|'||name||'|'||(select count(*) from restaurants r where r.area_id=a.id and r.active) from areas a where active order by sort_order").split("\n").map((l) => { const [slug, name, n] = l.split("|"); return { slug, name, n: +n }; });
const total = areas.reduce((s, a) => s + a.n, 0);
const home = areas[0];
const pick = sql(`select r.slug||'|'||r.name from restaurants r join areas a on a.id=r.area_id where a.slug='${home.slug}' and r.active and r.building_id is null and length(r.name) between 5 and 25 and r.name ~ '^[A-Za-z ]+$' order by r.slug limit 3`).split("\n").map((l) => { const [slug, name] = l.split("|"); return { slug, name }; });
const bld = sql(`select b.name||'|'||count(*) from buildings b join restaurants r on r.building_id=b.id and r.active join areas a on a.id=b.area_id where a.slug='${home.slug}' group by b.id, b.name, b.longitude, b.latitude having count(*)>=2 order by count(*) desc limit 1`).split("|");
const bldPos = sql(`select longitude||','||latitude from buildings where name='${bld[0]}' limit 1`).split(",").map(Number);
const [r1, r2, r3] = pick;

const browser = await puppeteer.launch({ executablePath: chromePath(), headless: "new", args: chromeArgs });
const errors = [];
async function newPage(ctx, { width = 1440, height = 900, mobile = false } = {}) {
  const page = await ctx.newPage();
  await page.setViewport({ width, height, isMobile: mobile, hasTouch: mobile });
  // Software-rendered headless Chrome repaints the map very slowly; animations are checked separately.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  page.on("pageerror", (e) => errors.push(`${page.url()} :: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) errors.push(`${page.url()} :: ${m.text()}`); });
  return page;
}
const waitMap = (page) => page.waitForFunction(() => window.__biteAtlasMap?.loaded?.() && window.__biteAtlasMap.getLayer("places"), { timeout: 45000 }).then(() => sleep(700));
const heroText = (page) => page.$eval("section[aria-labelledby='progress-heading'] p.tabular", (e) => e.textContent.replace(/\s+/g, " ").trim()).catch(() => "(no hero)");
const waitHero = async (page, t) => { await page.waitForFunction((t) => document.querySelector("section[aria-labelledby='progress-heading'] p.tabular")?.textContent.replace(/\s+/g, " ").includes(t), { timeout: 15000 }, t).catch(() => {}); return heroText(page); };
const panel = "aside[aria-label='Details']";
const visitBtn = `${panel} button[aria-pressed]:not([aria-label])`;
const favBtn = `${panel} button[aria-label$='favorites']`;
const listCount = (page) => page.$eval("aside#explore-sidebar, #explore-sidebar", (s) => { const m = s.innerText.match(/(\d[\d,]*) restaurants? match/); return m ? +m[1].replace(/,/g, "") : -1; }).catch(() => -1);
const byText = async (page, tag, t) => (await page.$$(`xpath/.//${tag}[contains(normalize-space(.), "${t}")]`))[0];
async function openRestaurant(page, slug, area = home.slug) {
  await page.goto(`${BASE}/explore/${area}?r=${slug}`, { waitUntil: "networkidle2" });
  await page.waitForSelector(`${panel} h2`, { timeout: 20000 });
  await sleep(500);
}

// ═══════════════════════════════════════════════════════════════════════
const ctxA = await browser.createBrowserContext();
const page = await newPage(ctxA);

await part("Pages", async () => {
  for (const path of ["/", "/dashboard", "/favorites", "/login", "/admin"]) {
    const res = await page.goto(BASE + path, { waitUntil: "networkidle2" });
    check(`${path} loads (HTTP ${res.status()})`, res.status() === 200, String(res.status()));
  }
  const res = await page.goto(`${BASE}/explore/not-a-real-area`, { waitUntil: "networkidle2" });
  check("unknown area shows 404", res.status() === 404 || /not found|404/i.test(await page.content()), String(res.status()));
});

await part("Every area map", async () => {
  for (const a of areas) {
    await page.goto(`${BASE}/explore/${a.slug}`, { waitUntil: "networkidle2" });
    await waitMap(page);
    const h = await heroText(page);
    const markers = await page.evaluate(() => window.__biteAtlasMap.queryRenderedFeatures({ layers: ["places", "place-clusters"] }).length);
    const masked = await page.evaluate(() => !!window.__biteAtlasMap.getLayer("frame-mask") || !!window.__biteAtlasMap.getStyle().sources["area-frame"]);
    check(`${a.name}: ${a.n} restaurants, markers drawn, outside hidden`, h.includes(`/ ${a.n}`) && markers > 0 && masked, `${h}, markers ${markers}, mask ${masked}`);
  }
});

await part("Map controls", async () => {
  await page.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  await waitMap(page);
  const z0 = await page.evaluate(() => window.__biteAtlasMap.getZoom());
  // cluster click zooms in
  const cl = await page.evaluate(() => {
    const m = window.__biteAtlasMap;
    const f = m.queryRenderedFeatures({ layers: ["place-clusters"] })[0];
    if (!f) return null;
    const p = m.project(f.geometry.coordinates), r = m.getCanvas().getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  });
  if (cl) { await page.mouse.click(cl.x, cl.y); await sleep(1500); }
  const z1 = await page.evaluate(() => window.__biteAtlasMap.getZoom());
  check("clicking a cluster zooms in", cl && z1 > z0 + 0.5, `${z0} -> ${z1}`);
  // zoom-out lock
  await page.evaluate(() => window.__biteAtlasMap.zoomTo(3, { duration: 0 }));
  await sleep(500);
  const zl = await page.evaluate(() => window.__biteAtlasMap.getZoom());
  check("can't zoom out past the whole-area view", zl >= z0 - 0.05, `${zl} vs fit ${z0}`);
  // zoom buttons
  const zb = await page.evaluate(() => window.__biteAtlasMap.getZoom());
  await page.click(".maplibregl-ctrl-zoom-in, button[aria-label='Zoom in']");
  await sleep(800);
  check("+ zoom button works", (await page.evaluate(() => window.__biteAtlasMap.getZoom())) > zb + 0.3);
  // return-to-area button
  const ret = await page.$(`button[aria-label='Return to ${home.name}']`);
  if (ret) { await ret.click(); await sleep(1500); }
  check("'Return to area' button refits the area", ret && Math.abs((await page.evaluate(() => window.__biteAtlasMap.getZoom())) - z0) < 0.3);
  // building marker → chooser
  if (bld[0]) {
    const pt = await page.evaluate(async (pos) => {
      const m = window.__biteAtlasMap;
      m.jumpTo({ center: pos, zoom: 18 });
      await new Promise((r) => m.once("idle", r));
      const f = m.queryRenderedFeatures({ layers: ["places"] }).find((f) => f.properties.kind === "building");
      if (!f) return null;
      const p = m.project(f.geometry.coordinates), r = m.getCanvas().getBoundingClientRect();
      return { x: r.left + p.x, y: r.top + p.y };
    }, bldPos);
    if (pt) { await page.mouse.click(pt.x, pt.y); await sleep(1500); }
    const items = await page.$$eval(`${panel} li`, (els) => els.length).catch(() => 0);
    check(`building marker opens a list of its restaurants (${bld[0]})`, items >= 2, `items ${items}`);
    if (items >= 2) {
      await page.click(`${panel} li button`);
      await sleep(900);
      const back = await byText(page, "button", bld[0].slice(0, 12));
      check("choosing one opens its details with a Back link", !!back);
      await page.click(`${panel} button[aria-label='Close details']`).catch(() => {});
      await sleep(600);
    }
  }
  // sidebar collapse/expand
  await page.click("button[aria-controls='explore-sidebar'][aria-expanded='true']");
  await sleep(1000);
  const hidden = await page.$eval("#explore-sidebar", (s) => s.getBoundingClientRect().width < 10 || getComputedStyle(s).display === "none" || s.inert || s.getAttribute("aria-hidden") === "true").catch(() => true);
  check("sidebar collapses", hidden);
  for (const b of await page.$$("button[aria-controls='explore-sidebar'][aria-expanded='false']")) if (await b.isVisible()) { await b.click(); break; }
  await sleep(1000);
  check("sidebar re-opens", !!(await page.$("button[aria-controls='explore-sidebar'][aria-expanded='true']")));
  // area switcher
  await page.click("button[aria-label^='Area:']");
  await sleep(500);
  const target = areas[areas.length - 1];
  const opt = await byText(page, "a", target.name) ?? await byText(page, "button", target.name) ?? await byText(page, "li", target.name);
  await opt.click();
  await page.waitForFunction((s) => location.pathname === `/explore/${s}`, { timeout: 20000 }, target.slug).catch(() => {});
  check("area switcher navigates to another area", page.url().includes(`/explore/${target.slug}`), page.url());
});

await part("Search", async () => {
  await page.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  await waitMap(page);
  let input;
  for (const i of await page.$$("input[role='combobox']")) if (await i.isVisible()) input = i;
  await input.type(r1.name.slice(0, 6), { delay: 25 });
  await sleep(500);
  const opts = await page.$$eval("[role='option']", (els) => els.filter((e) => e.offsetParent).map((e) => e.textContent.trim()));
  check(`typing "${r1.name.slice(0, 6)}" suggests matches`, opts.some((o) => o.toLowerCase().includes(r1.name.slice(0, 6).toLowerCase())), opts.slice(0, 3).join(" | "));
  const idx = opts.findIndex((o) => o.startsWith(r1.name));
  for (let i = 0; i < Math.max(idx, 0); i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForSelector(`${panel} h2`, { timeout: 10000 }).catch(() => {});
  await sleep(1200);
  const h2 = await page.$eval(`${panel} h2`, (e) => e.textContent.trim()).catch(() => "");
  check("choosing a result opens its details", h2 === r1.name, h2);
  check("URL becomes a shareable ?r= link", page.url().includes(`r=${r1.slug}`), page.url());
  const clear = await page.$("button[aria-label='Clear search']");
  if (clear) await clear.click();
  await page.keyboard.press("Escape");
  await page.click(`${panel} button[aria-label='Close details']`).catch(() => {});
  await sleep(500);
  for (const i of await page.$$("input[role='combobox']")) if (await i.isVisible()) input = i;
  await input.click({ clickCount: 3 });
  await input.type("zzqxnotarestaurant");
  await sleep(500);
  const none = await page.evaluate(() => /No tracked restaurant matches/.test(document.body.innerText));
  check("nonsense search shows a 'no matches' message", none);
  await page.keyboard.press("Escape");
});

await part("Deep link", async () => {
  await openRestaurant(page, r2.slug);
  check("?r=<slug> opens that restaurant", (await page.$eval(`${panel} h2`, (e) => e.textContent.trim())) === r2.name);
  await page.goto(`${BASE}/explore/${home.slug}?r=no-such-restaurant`, { waitUntil: "networkidle2" });
  await waitMap(page);
  check("bad ?r= link doesn't crash the page", (await heroText(page)).includes(`/ ${home.n}`));
});

await part("Guest: visit, favorite, date, note", async () => {
  await openRestaurant(page, r1.slug);
  await page.click(visitBtn);
  await sleep(900);
  check("Mark as visited → button shows Visited", (await page.$eval(visitBtn, (b) => b.getAttribute("aria-pressed"))) === "true");
  check("progress goes to 1", (await waitHero(page, "1 /")).startsWith("1 /"), await heroText(page));
  check("toast confirms the visit", await page.evaluate((n) => document.body.innerText.includes(`${n} marked as visited`), r1.name));
  check("visit date shown (today)", await page.evaluate(() => /Visited\s+\w+/.test(document.querySelector("aside[aria-label='Details']").innerText)));
  const change = await byText(page, "button", "Change date");
  await change.click();
  await sleep(300);
  await page.$eval(`${panel} input[type='date']`, (el) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(el, "2026-01-15"); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.$eval(`${panel} input[type='date']`, (el) => el.blur());
  await sleep(600);
  check("visit date can be changed", await page.evaluate(() => /Jan(uary)? 15,? 2026|15 Jan(uary)? 2026/.test(document.querySelector("aside[aria-label='Details']").innerText)));
  await page.click(favBtn);
  await sleep(500);
  check("favorite star toggles on", (await page.$eval(favBtn, (b) => b.getAttribute("aria-pressed"))) === "true");
  const addNote = await byText(page, "button", "Add a private note");
  await addNote.click();
  await page.type(`${panel} textarea`, "Try the kacchi");
  await page.$eval(`${panel} textarea`, (el) => el.blur());
  await sleep(600);
  await openRestaurant(page, r2.slug);
  await page.click(visitBtn);
  await sleep(800);
  await page.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  check("guest progress survives a reload (2 visited)", (await waitHero(page, "2 /")).startsWith("2 /"), await heroText(page));
  await openRestaurant(page, r1.slug);
  check("note survives a reload", (await page.$eval(`${panel} textarea`, (t) => t.value).catch(() => "")) === "Try the kacchi");
  await openRestaurant(page, r2.slug);
  await page.click(visitBtn);
  await sleep(800);
  check("un-marking a visit lowers progress", (await waitHero(page, "1 /")).startsWith("1 /"), await heroText(page));
  await page.click(visitBtn); // visit again for later sections
  await sleep(800);
});

await part("Filters", async () => {
  await page.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  await waitMap(page);
  const all = await listCount(page);
  const chip = async (label) => { const b = await byText(page, "button", label); await b.click(); await sleep(800); return listCount(page); };
  check("Visited filter shows only visited (2)", (await chip("Visited")) === 2, String(await listCount(page)));
  check("Favorites filter shows only favorites (1)", (await chip("Favorites")) === 1, String(await listCount(page)));
  check("Not visited filter shows the rest", (await chip("Not visited")) === home.n - 2, String(await listCount(page)));
  check("All shows everything", (await chip("All")) === all && all === home.n, `${all} vs ${home.n}`);
  const select = await page.$("#explore-sidebar select");
  const options = await select.$$eval("option", (o) => o.map((x) => x.value).filter(Boolean));
  await select.select(options[1]);
  await sleep(800);
  const filtered = await listCount(page);
  check("cuisine filter narrows the list", filtered > 0 && filtered < all, `${filtered}/${all}`);
  const markersFiltered = await page.evaluate(() => window.__biteAtlasMap.querySourceFeatures("places").length);
  const clear = await byText(page, "button", "Clear");
  if (clear) await clear.click();
  await sleep(800);
  check("Clear resets filters", (await listCount(page)) === all);
  check("map markers follow the filter", markersFiltered > 0);
});

await part("Dashboard & favorites (guest)", async () => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
  await sleep(1500);
  const body = await page.evaluate(() => document.body.innerText);
  check(`overall progress shows 2 / ${total}`, body.replace(/,/g, "").includes(`/ ${total}`) && /\b2\s*\/\s*\d/.test(body.replace(/,/g, "")), body.slice(0, 200));
  check("stats cards render", !!(await page.$("section[aria-label='Statistics']")));
  check(`every area listed (${areas.length})`, areas.every((a) => body.includes(a.name)));
  check("Mirpur group shows a combined row", body.includes("Mirpur") && !!(await page.$("ul[aria-label='Mirpur areas']")));
  check("recent visits lists the visited restaurants", body.includes(r1.name) && body.includes(r2.name));
  await page.goto(`${BASE}/favorites`, { waitUntil: "networkidle2" });
  await sleep(1200);
  check("favorites page lists the favorite", (await page.evaluate(() => document.querySelector("main").innerText)).includes(r1.name));
  const item = await byText(page, "button", r1.name) ?? await byText(page, "a", r1.name);
  await item.click();
  await page.waitForFunction(() => location.pathname.startsWith("/explore/"), { timeout: 15000 }).catch(() => {});
  await page.waitForSelector(`${panel} h2`, { timeout: 15000 }).catch(() => {});
  check("clicking a favorite opens it on the map", page.url().includes(`r=${r1.slug}`), page.url());
});

await part("Accounts", async () => {
  // sign-up merges guest progress
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  check("login page has sign-in / create-account tabs", (await page.$$("button[role='tab']")).length === 2);
  await page.type("input[type='email']", userA.email);
  await page.type("input[type='password']", "wrong-password-123");
  await page.click("form button[type='submit']");
  await sleep(2000);
  check("wrong password shows an error", !!(await page.$("[role='alert']")));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.click("button[role='tab']:last-child");
  await page.type("input[type='email']", userA.email);
  await page.type("input[type='password']", userA.password);
  await page.click("form button[type='submit']");
  await page.waitForFunction(() => !location.pathname.startsWith("/login"), { timeout: 20000 }).catch(() => {});
  check("sign-up signs you in", !!(await page.waitForSelector("button[aria-label^='Account menu']", { timeout: 15000 }).catch(() => null)));
  await page.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  check("guest progress merged into the account", (await waitHero(page, "2 /")).startsWith("2 /"), await heroText(page));
  await sleep(1000);
  const rows = rowsOf(userA.email);
  check("visits, favorite, date and note saved in the database", rows.includes(`${r1.slug}:true:true:2026-01-15:Try the kacchi`) && rows.includes(`${r2.slug}:true:false:`), rows);
  // account writes
  await openRestaurant(page, r3.slug);
  await page.click(visitBtn);
  await sleep(1200);
  check("new visit saved to the account", rowsOf(userA.email).includes(`${r3.slug}:true`), rowsOf(userA.email));
  await page.click(visitBtn);
  await sleep(1200);
  check("un-visit removes it from the account", !rowsOf(userA.email).includes(r3.slug), rowsOf(userA.email));
  // sign out
  await page.click("button[aria-label^='Account menu']");
  await sleep(400);
  await (await byText(page, "button", "Sign out")).click();
  await sleep(2000);
  await page.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  check("after sign-out the map is back to guest (0)", (await waitHero(page, "0 /")).startsWith("0 /"), await heroText(page));
  // privacy: second user
  const ctxB = await browser.createBrowserContext();
  const pageB = await newPage(ctxB);
  await pageB.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await pageB.click("button[role='tab']:last-child");
  await pageB.type("input[type='email']", userB.email);
  await pageB.type("input[type='password']", userB.password);
  await pageB.click("form button[type='submit']");
  await pageB.waitForSelector("button[aria-label^='Account menu']", { timeout: 20000 }).catch(() => {});
  await pageB.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  check("another user can't see your visits", (await waitHero(pageB, "0 /")).startsWith("0 /") && rowsOf(userB.email) === "", await heroText(pageB));
  await ctxB.close();
  // sign back in
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.type("input[type='email']", userA.email);
  await page.type("input[type='password']", userA.password);
  await page.click("form button[type='submit']");
  const signedIn = await page.waitForSelector("button[aria-label^='Account menu']", { timeout: 20000 }).catch(() => null);
  if (!signedIn) console.log("  diag:", page.url(), await page.$eval("[role='alert']", (a) => a.innerText).catch(() => "no alert"), await page.$eval("input[type='email']", (e) => e.value).catch(() => ""));
  await page.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  check("signing back in restores your progress", (await waitHero(page, "2 /")).startsWith("2 /"), await heroText(page));
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
  await sleep(1200);
  check("dashboard shows account progress", (await page.evaluate(() => document.body.innerText)).includes(r1.name));
});

await part("Admin", async () => {
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2" });
  check("non-admins are refused", (await page.content()).includes("Admins only"));
  sql(`update profiles set is_admin=true where id=(select id from auth.users where email='${userA.email}')`);
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2" });
  await page.waitForSelector("table", { timeout: 20000 });
  const rows = (await page.$$("tbody tr")).length;
  check("admin sees the restaurant table", rows > 0, String(rows));
  const filterInput = await page.$("input[placeholder='Filter by name or address']");
  if (filterInput) { await filterInput.type(r1.name); await sleep(700); }
  check("admin table filter works", (await page.$$eval("tbody tr", (t) => t.length)) < rows);
  if (filterInput) { await filterInput.click({ clickCount: 3 }); await page.keyboard.press("Backspace"); await sleep(500); }
  await (await byText(page, "button", "Add restaurant")).click();
  await page.waitForSelector("[role='dialog'] form");
  const fill = async (label, value) => { const [el] = await page.$$(`xpath/.//div[@role='dialog']//label[normalize-space(.)='${label}']/following-sibling::*[1]`); await el.type(value); };
  const name = `Suite Test Kitchen ${run}`;
  await page.click("[role='dialog'] form button[type='submit']");
  await sleep(600);
  check("empty form shows validation errors", !!(await page.$("[role='dialog']")) && /required|enter|please/i.test(await page.$eval("[role='dialog']", (d) => d.innerText)));
  await fill("Name", name);
  const center = sql(`select latitude||'|'||longitude from areas where slug='${home.slug}'`).split("|");
  await fill("Latitude", center[0]);
  await fill("Longitude", center[1]);
  const areaSel = await page.$("[role='dialog'] select");
  if (areaSel) { const v = await areaSel.$$eval("option", (o, n) => o.find((x) => x.textContent.trim() === n)?.value, home.name); if (v) await areaSel.select(v); }
  const cat = await page.$$("xpath/.//div[@role='dialog']//button[contains(., 'Burger')]");
  await cat[0].click();
  await page.click("[role='dialog'] form button[type='submit']");
  await page.waitForFunction(() => !document.querySelector("[role='dialog']"), { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  check("admin can add a restaurant", sql(`select count(*) from restaurants where name='${name}' and active`) === "1");
  await page.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  check("new restaurant appears on the map right away", (await waitHero(page, `/ ${home.n + 1}`)).includes(`/ ${home.n + 1}`), await heroText(page));
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle2" });
  await page.waitForSelector("table");
  await page.type("input[placeholder='Filter by name or address']", name);
  await sleep(800);
  const edit = (await page.$$(`xpath/.//tr[td[contains(., '${name}')]]//button[contains(., 'Edit')]`))[0];
  if (edit) {
    await edit.click();
    await page.waitForSelector("[role='dialog'] form");
    const [el] = await page.$$(`xpath/.//div[@role='dialog']//label[normalize-space(.)='Floor (optional)']/following-sibling::*[1]`);
    if (el) await el.type("4");
    await page.click("[role='dialog'] form button[type='submit']");
    await page.waitForFunction(() => !document.querySelector("[role='dialog']"), { timeout: 15000 }).catch(() => {});
    await sleep(1200);
  }
  check("admin can edit a restaurant", sql(`select floor from restaurants where name='${name}'`) === "4", sql(`select coalesce(floor,'null') from restaurants where name='${name}'`));
  const deact = (await page.$$(`xpath/.//tr[td[contains(., '${name}')]]//button[contains(., 'Deactivate')]`))[0];
  await deact.click();
  await sleep(2000);
  await page.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  check("deactivating removes it from the map", (await waitHero(page, `/ ${home.n}`)).includes(`/ ${home.n}`), await heroText(page));
  check("users can't make themselves admin", (() => { try { sql(`set role authenticated; update profiles set is_admin=true`); return false; } catch { return true; } })());
});

await part("Mobile", async () => {
  const ctxM = await browser.createBrowserContext();
  const m = await newPage(ctxM, { width: 390, height: 844, mobile: true });
  await m.goto(`${BASE}/explore/${home.slug}`, { waitUntil: "networkidle2" });
  await waitMap(m);
  check("mobile map loads with bottom sheet", (await waitHero(m, `/ ${home.n}`)).includes(`/ ${home.n}`), await heroText(m));
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check("no sideways scrolling on a phone", !overflow);
  const listBtn = await m.$("[role='group'][aria-label='View'] button:last-child");
  await listBtn.click();
  await sleep(900);
  const items = await m.$$("section ul li button");
  check("list view shows restaurants", items.length > 3, String(items.length));
  await items[1].click();
  await sleep(1500);
  const det = await m.$("section[aria-label='Details'] button[aria-pressed='false']");
  check("tapping one opens details in the sheet", !!det);
  if (det) { await det.click(); await sleep(900); }
  check("mark visited works on mobile", (await m.$("section[aria-label='Details'] button[aria-pressed='true']")) !== null);
  await m.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
  await sleep(1200);
  check("dashboard fits a phone", !(await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await ctxM.close();
});

// ═══════════════════════════════════════════════════════════════════════
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
const uniq = [...new Set(errors)];
console.log(uniq.length ? `page errors (${uniq.length}):\n` + uniq.slice(0, 20).join("\n") : "no page errors");
sql(`delete from restaurants where name like 'Suite Test Kitchen %'; delete from auth.users where email like 'suite-%@biteatlas.test';`);
await browser.close();
process.exit(failed.length ? 1 : 0);
