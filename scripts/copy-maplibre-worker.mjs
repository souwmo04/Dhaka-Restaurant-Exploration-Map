// MapLibre resolves its web worker relative to its own module URL, which does
// not survive bundling. Copy the worker into /public so it can be served from a
// stable path and registered with `setWorkerUrl` (see src/lib/map/maplibre.ts).
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "maplibre-gl");
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
const outDir = join(root, "public", "maplibre");

mkdirSync(outDir, { recursive: true });
copyFileSync(join(pkgDir, "dist", "maplibre-gl-worker.mjs"), join(outDir, `maplibre-gl-worker-${version}.mjs`));
console.log(`maplibre worker ${version} copied to public/maplibre`);
