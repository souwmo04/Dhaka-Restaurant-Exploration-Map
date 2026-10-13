"""
Generates the narration, one clip per scene, and the timeline the video and
soundtrack share.

    python scripts/voiceover.py      -> public/audio/vo/*.wav + src/data/timeline.json

Voice: Microsoft neural TTS via edge-tts (needs internet). Each scene is
stretched, never shortened, so its line always fits with a breath to spare.
"""

import asyncio
import json
import math
import os
import subprocess
import wave
from pathlib import Path

import edge_tts

VOICE = "en-US-AndrewMultilingualNeural"
RATE = "+4%"
FPS = 30

# id, designed length in frames, when the line starts (s into the scene), the line.
SCENES = [
    ("intro", 170, 0.6, "This is BiteAtlas. A map built around one simple question: how much of Dhaka have you tasted?"),
    ("numbers", 150, 0.35, "Three thousand, three hundred and fifty restaurants. Ten maps. Seven neighbourhoods."),
    ("city", 260, 0.5, "Every area is traced from real streets, rivers and rail lines, and every restaurant comes from open map data. Nothing scraped. Nothing invented."),
    ("explore", 300, 0.5, "Pick an area, and a real, living map opens up. Clusters fill with colour as you explore, and every pin opens the restaurant's details."),
    ("buildings", 180, 0.4, "Food courts and towers get a single marker. Tap it, and see every restaurant inside, floor by floor."),
    ("visit", 210, 0.4, "Been there? One tap marks it visited. Your progress updates instantly, and you can star the places you love."),
    ("search", 200, 0.4, "Craving pizza in Gulshan? Search finds it as you type, and filters show what you've visited, saved, or still have to try."),
    ("dashboard", 240, 0.4, "Your dashboard turns it all into a picture of the city, every area filling in as you eat your way across Dhaka."),
    ("mobile", 200, 0.4, "It's made for your phone too. A swipe-up sheet, a list view, and no sign-up needed to start."),
    ("tech", 220, 0.4, "And under the hood: open data, private accounts, accessibility built in, and every feature tested end to end."),
    ("outro", 190, 0.5, "So... how much of Dhaka have you tasted? Start exploring today. The link is on screen."),
]

ROOT = Path(__file__).resolve().parent.parent
VO_DIR = ROOT / "public" / "audio" / "vo"
FFMPEG = next((ROOT / "node_modules" / "@remotion").glob("compositor-*/ffmpeg*"))


async def synth(text: str, mp3: Path):
    # The service occasionally returns nothing; retry a few times.
    for attempt in range(40):
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(mp3))
            return
        except edge_tts.exceptions.NoAudioReceived:
            await asyncio.sleep(8)
    raise RuntimeError(f"TTS failed for: {text[:40]}")


def to_wav(mp3: Path, wav: Path):
    subprocess.run([str(FFMPEG), "-v", "error", "-y", "-i", str(mp3), "-ar", "48000", "-ac", "1", str(wav)], check=True)


def duration(wav: Path) -> float:
    with wave.open(str(wav)) as w:
        return w.getnframes() / w.getframerate()


async def main():
    VO_DIR.mkdir(parents=True, exist_ok=True)
    timeline = []
    start = 0
    for sid, design, offset, line in SCENES:
        mp3 = VO_DIR / f"{sid}.mp3"
        wav = VO_DIR / f"{sid}.wav"
        txt = VO_DIR / f"{sid}.txt"
        # Reuse a clip when its line hasn't changed (the service rate-limits bursts).
        if not (wav.exists() and txt.exists() and txt.read_text(encoding="utf-8") == f"{VOICE}|{RATE}|{line}"):
            await synth(line, mp3)
            to_wav(mp3, wav)
            mp3.unlink()
            txt.write_text(f"{VOICE}|{RATE}|{line}", encoding="utf-8")
            await asyncio.sleep(2)
        dur = duration(wav)
        # Leave at least ~0.7 s after the line before the next cut.
        needed = math.ceil((offset + dur + 0.7) * FPS)
        length = max(design, needed)
        timeline.append({"id": sid, "start": start, "len": length, "voAt": offset, "voDur": round(dur, 3), "line": line})
        print(f"{sid:10s} line {dur:5.2f}s  scene {design}->{length} frames")
        start += length
    out = {"fps": FPS, "voice": VOICE, "total": start, "scenes": timeline}
    (ROOT / "src" / "data" / "timeline.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"total {start} frames = {start / FPS:.1f}s")


asyncio.run(main())
