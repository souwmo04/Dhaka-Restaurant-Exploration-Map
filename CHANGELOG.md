# Changelog

What changed, newest first. Dates are when the work landed on `main`.

## 2026-10-13 · Promo video, sharing and test tooling

- **Promo video.** A 90-second narrated motion-graphics tour built in code with Remotion ([`video/`](video/README.md)). The music and effects are synthesised, so it's free to reuse. Includes subtitles (SRT/VTT), a captioned cut for muted feeds and a compressed web version ([`docs/media/`](docs/media)).
- **Link previews.** Shared links show a branded Open Graph / X card.
- **Search engines.** `robots.txt` keeps admin and auth pages out; `sitemap.xml` lists every area map.
- **Netlify.** `netlify.toml` pins Node 22 and adds security headers. The site URL falls back to Netlify's own `URL`, so share images no longer point at localhost.
- **Tests.** An 80-check browser suite for local runs (`npm run test:e2e`), a read-only smoke test for deployments (`npm run test:e2e:live`), and unit tests for area grouping. CI also type-checks the video project.

## 2026-10-10 · Motion and the Dhaka overview map

- The dashboard draws a small map of every area that fills in as you explore and opens an area on click.
- Marking a restaurant visited plays confetti and ripples the map. The selected marker pulses, markers fade in, progress bars fill and numbers count up. All of it respects reduced motion.

## 2026-10-09 · Ten maps

- Real traced outlines and data for **Uttara**, **Bashundhara R/A**, **Dhanmondi**, **Banani**, **Gulshan**, **Mohammadpur & Adabor** and four grouped **Mirpur** maps: 3,350 restaurants from OpenStreetMap and Overture Maps.
- Maps are locked to their area: everything outside is hidden and the camera can't leave it. The sidebar can be collapsed.
- Restaurant IDs carry their area, so adding an area never renames or repoints existing restaurants.
- Fixes: the admin table now loads every restaurant (it stopped at 1,000), and unknown areas return a real 404.

## 2026-10-08 · First release

- Next.js 16 + MapLibre + Supabase app: themed map, custom markers, clustering, shared buildings, visit/favorite/notes, progress, search and filters, dashboard, favorites, guest mode with merge on sign-in, admin, RLS.
- Unit tests, database security tests, CI and full documentation.
