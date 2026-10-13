# BiteAtlas promo video

A ~90-second, 1080p narrated motion-graphics promo for BiteAtlas, built in code with
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

**Narration.** `scripts/voiceover.py` holds the script (one line per scene)
and voices it with a Microsoft neural voice (`en-US-AndrewMultilingualNeural`
via [edge-tts](https://github.com/rany2/edge-tts)). It measures every line and
writes `src/data/timeline.json`; a scene is stretched (never shortened) so its
line fits with a breath to spare, and both the video and the mix read that file.

**Music and effects.** The soundtrack and every sound effect are synthesised
from scratch by `scripts/soundtrack.py` on the same timeline, so nothing needs
licensing. It also mixes the narration in, levelled to a broadcast-style
loudness, with the music ducked about 15 dB underneath while the narrator
speaks (it prints the voice-over-music ratio; aim for 10 dB or more).

## Render

```bash
npm install
pip install edge-tts numpy scipy
python scripts/voiceover.py     # narration clips + src/data/timeline.json (needs internet; retries if throttled)
python scripts/soundtrack.py    # music + effects + narration -> public/audio/soundtrack.wav
npm run render                  # writes out/biteatlas-promo.mp4
```

`npm run studio` opens Remotion Studio to scrub and tweak scenes. If Remotion
can't find a browser, add `--browser-executable="<path to chrome>"`.

## Inputs

- `public/shots/` — screenshots of the real app (desktop at 2×, phone at 3×), seeded with sample visits.
- `src/data/city.json` — area outlines and restaurant positions exported from `../data`.

Remotion is free for individuals and small teams; larger companies need a
[company license](https://www.remotion.dev/license).

To change what the narrator says, edit the lines in `scripts/voiceover.py`,
then re-run both scripts and render. Unchanged lines are reused from
`public/audio/vo/`, so only edited lines are re-voiced.
