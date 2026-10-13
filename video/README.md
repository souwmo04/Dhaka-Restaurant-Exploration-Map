# BiteAtlas promo video

A ~77-second, 1080p motion-graphics promo for BiteAtlas, built in code with
[Remotion](https://www.remotion.dev/) (React → video). Every frame is
designed animation: kinetic type, cover-wipe transitions, a data-driven city
map, and UI moments recreated in vector. App footage uses real
screenshots of the site.

## Scenes

| # | Scene | What happens |
|---|-------|--------------|
| 1 | Intro | Grid draws in, logo spins in, the question rises word by word |
| 2 | Numbers | 3,350 restaurants · 10 maps · 7 neighbourhoods count up |
| 3 | City | Real area outlines draw themselves; all 3,350 restaurants rain in north→south; some light up as "visited" |
| 4 | Explore | The app tilts in, callouts pop, then the camera zooms to street level |
| 5 | Buildings | Starts tight on a tower marker, pulls back to its 7 restaurants |
| 6 | Visit | "Mark as visited" → confetti, toast, progress ticks up; then a favourite |
| 7 | Search & filter | "pizza" types out with live results; filter pill slides between counts |
| 8 | Dashboard | The dashboard scrolls past in a tilted window as the stats land |
| 9 | Mobile | Three phones rise and float |
| 10 | Under the hood | Six feature tiles pop; the stack scrolls by |
| 11 | Outro | A tomato bloom, the question again, the URL |

The soundtrack and every sound effect are synthesised from scratch by
`scripts/soundtrack.py` on the same frame timeline, so nothing needs licensing.

## Render

```bash
npm install
python scripts/soundtrack.py    # writes public/audio/soundtrack.wav (needs numpy + scipy)
npm run render                  # writes out/biteatlas-promo.mp4
```

`npm run studio` opens Remotion Studio to scrub and tweak scenes. If Remotion
can't find a browser, add `--browser-executable="<path to chrome>"`.

## Inputs

- `public/shots/` — screenshots of the real app (desktop at 2×, phone at 3×), seeded with sample visits.
- `src/data/city.json` — area outlines and restaurant positions exported from `../data`.

Remotion is free for individuals and small teams; larger companies need a
[company license](https://www.remotion.dev/license).
