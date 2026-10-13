// Read-only smoke test of a deployed site (works in snapshot mode, no accounts):
// every area map, search, share links, guest visits, filters, dashboard,
// favorites and mobile. Only the visitor's own browser storage is written.
//
//   npm run test:e2e:live                       # the Netlify site
//   npm run test:e2e:live -- https://example.app
import { readdirSync, readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { normalizeCatalog } from "../../src/lib/catalog/normalize.ts";
import { chromeArgs, chromePath, sleep } from "./shared.mjs";

const BASE = process.argv[2] ?? process.env.E2E_LIVE_URL ?? "https://dhakarestuexplore.netlify.app";

// Expected counts come from the same data files the site is built from.
const json = (p) => JSON.parse(readFileSync(new URL(`../../${p}`, import.meta.url), "utf8"));
const areasData = json("data/areas.json");
const records = readdirSync(new URL("../../data/restaurants", import.meta.url))
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => { const d = json(`data/restaurants/${f}`); return Array.isArray(d) ? d : d.restaurants; });
const catalog = normalizeCatalog(areasData, json("data/categories.json"), records);
const expect = Object.fromEntries(areasData.filter((a) => a.active).map((a) => [a.slug, catalog.restaurants.filter((r) => r.areaSlug === a.slug && r.active).length]));
const total = Object.values(expect).reduce((s, n) => s + n, 0);
let pass = 0, fail = 0;
const errors = [];
const check = (n, c, d = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  -> " + d}`); };
const browser = await puppeteer.launch({ executablePath: chromePath(), headless: "new", args: chromeArgs });
const mk = async (o = {}) => {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: o.w ?? 1440, height: o.h ?? 900, isMobile: !!o.m, hasTouch: !!o.m });
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  p.on("pageerror", (e) => errors.push(`${p.url()} :: ${e.message}`));
  p.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(`${p.url()} :: ${m.text()}`); });
  return p;
};
const mapReady = (p) => p.waitForFunction(() => { const c = document.querySelector(".maplibregl-canvas"); return c && c.width > 0; }, { timeout: 45000 }).then(() => sleep(2500));
const hero = (p) => p.$eval("section[aria-labelledby='progress-heading'] p.tabular", (e) => e.textContent.replace(/\s+/g, " ").trim()).catch(() => "(none)");
const waitHero = async (p, t) => {
  await p.waitForFunction((t) => document.querySelector("section[aria-labelledby='progress-heading'] p.tabular")?.textContent.replace(/\s+/g, " ").includes(t), { timeout: 15000 }, t).catch(() => {});
  return hero(p);
};
const panel = "aside[aria-label='Details']";
const byText = async (p, tag, t) => (await p.$$(`xpath/.//${tag}[contains(normalize-space(.), "${t}")]`))[0];
const listCount = (p) => p.$eval("#explore-sidebar", (s) => +(s.innerText.match(/(\d[\d,]*) restaurants? match/)?.[1] ?? -1));

const page = await mk();
for (const [slug, n] of Object.entries(expect)) {
  const t0 = Date.now();
  await page.goto(`${BASE}/explore/${slug}`, { waitUntil: "networkidle2", timeout: 60000 });
  await mapReady(page).catch(() => {});
  const h = await hero(page);
  const markers = await page.evaluate(() => {
    const c = document.querySelector(".maplibregl-canvas");
    if (!c) return 0;
    // sample the canvas for the dark marker colour
    const g = document.createElement("canvas"); g.width = c.width; g.height = c.height;
    const x = g.getContext("2d"); x.drawImage(c, 0, 0);
    const d = x.getImageData(0, 0, g.width, g.height).data; let dark = 0;
    for (let i = 0; i < d.length; i += 4 * 37) if (d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 60) dark++;
    return dark;
  });
  check(`${slug}: ${n} restaurants, map + markers drawn (${((Date.now() - t0) / 1000).toFixed(1)}s)`, h.includes(`/ ${n}`) && markers > 0, `${h}, dark px ${markers}`);
}
await page.screenshot({ path: "live-mohammadpur.png" });
const r404 = await page.goto(`${BASE}/explore/not-a-real-area`, { waitUntil: "networkidle2" });
check("unknown area shows a not-found page", r404.status() === 404, `HTTP ${r404.status()}`);
for (const path of ["/", "/dashboard", "/favorites", "/login", "/admin"]) {
  const r = await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 60000 });
  check(`${path} loads`, r.status() === 200, String(r.status()));
  if (path === "/login" || path === "/admin") console.log(`   ${path} says: ${(await page.evaluate(() => document.querySelector("main")?.innerText ?? "")).replace(/\s+/g, " ").slice(0, 160)}`);
}

// search → details → share link
await page.goto(`${BASE}/explore/uttara`, { waitUntil: "networkidle2" });
await mapReady(page);
let input;
for (const i of await page.$$("input[role='combobox']")) if (await i.isVisible()) input = i;
await input.type("Chillox", { delay: 30 });
await sleep(600);
await page.keyboard.press("Enter");
await page.waitForSelector(`${panel} h2`, { timeout: 10000 }).catch(() => {});
await sleep(1000);
const name = await page.$eval(`${panel} h2`, (e) => e.textContent.trim()).catch(() => "");
check("search opens a restaurant", /chillox/i.test(name), name);
check("share link in URL", /[?&]r=/.test(page.url()), page.url());
const shared = page.url();

// guest visit + favorite + note
await page.click(`${panel} button[aria-pressed]:not([aria-label])`);
await sleep(900);
check("mark visited updates progress", (await waitHero(page, "1 /")).startsWith("1 /"), await hero(page));
await page.click(`${panel} button[aria-label$='favorites']`);
await sleep(500);
await (await byText(page, "button", "Add a private note")).click();
await page.type(`${panel} textarea`, "live test note");
await page.$eval(`${panel} textarea`, (e) => e.blur());
await sleep(500);
await page.goto(shared, { waitUntil: "networkidle2" });
await page.waitForSelector(`${panel} h2`, { timeout: 15000 }).catch(() => {});
await sleep(800);
check("share link reopens the restaurant", (await page.$eval(`${panel} h2`, (e) => e.textContent.trim()).catch(() => "")) === name);
check(
  "visit, favorite and note survive reload",
  (await hero(page)).startsWith("1 /") &&
    (await page.$eval(`${panel} textarea`, (t) => t.value).catch(() => "")) === "live test note" &&
    (await page.$eval(`${panel} button[aria-label$='favorites']`, (b) => b.getAttribute("aria-pressed"))) === "true",
);
await page.click(`${panel} button[aria-label='Close details']`).catch(() => {});
await sleep(500);

// filters
const chip = async (l) => { await (await byText(page, "button", l)).click(); await sleep(800); return listCount(page); };
check("Visited filter = 1", (await chip("Visited")) === 1);
check("Favorites filter = 1", (await chip("Favorites")) === 1);
check(`All = ${expect.uttara}`, (await chip("All")) === expect.uttara);
const sel = await page.$("#explore-sidebar select");
const opt = await sel.$$eval("option", (o) => o.map((x) => x.value).filter(Boolean)[1]);
await sel.select(opt);
await sleep(800);
const f = await listCount(page);
check("cuisine filter narrows the list", f > 0 && f < expect.uttara, String(f));

// dashboard + favorites
await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
await sleep(1500);
const dash = (await page.evaluate(() => document.body.innerText)).replace(/,/g, "");
check(`dashboard shows the ${total} total and the visit`, dash.includes(String(total)) && dash.includes(name));
await page.goto(`${BASE}/favorites`, { waitUntil: "networkidle2" });
await sleep(1200);
check("favorites page lists it", (await page.evaluate(() => document.querySelector("main").innerText)).includes(name));

// mobile
const m = await mk({ w: 390, h: 844, m: true });
await m.goto(`${BASE}/explore/gulshan`, { waitUntil: "networkidle2", timeout: 60000 });
await mapReady(m);
check("mobile: map + sheet load", (await waitHero(m, `/ ${expect.gulshan}`)).includes(`/ ${expect.gulshan}`));
check("mobile: no sideways scroll", !(await m.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
await (await m.$("[role='group'][aria-label='View'] button:last-child")).click();
await sleep(900);
const items = await m.$$("section ul li button");
await items[1].click();
await sleep(1500);
const det = await m.$("section[aria-label='Details'] button[aria-pressed='false']");
if (det) { await det.click(); await sleep(900); }
check("mobile: open details + mark visited", !!(await m.$("section[aria-label='Details'] button[aria-pressed='true']")));
await m.screenshot({ path: "live-mobile.png" });

console.log(`\n${pass} passed, ${fail} failed`);
const u = [...new Set(errors)];
console.log(u.length ? "browser errors:\n" + u.slice(0, 15).join("\n") : "no browser errors");
await browser.close();
process.exit(fail ? 1 : 0);
