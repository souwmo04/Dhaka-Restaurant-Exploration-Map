"""
Writes subtitles for the narration from src/data/timeline.json.

    python scripts/subtitles.py      -> out/biteatlas-promo.srt + .vtt

Each scene's line is split into sentences, and the line's measured duration
is shared between them by length. Cues wrap at 42 characters, two lines max.
"""

import json
import os
import re
import textwrap

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
TIMELINE = json.load(open(os.path.join(ROOT, "src", "data", "timeline.json"), encoding="utf-8"))
FPS = TIMELINE["fps"]


def stamp(t: float, sep: str) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{sep}{ms:03d}"


def chunks(line: str):
    """Sentences, with any sentence too long for two 42-char lines split at a comma."""
    for sentence in re.split(r"(?<=[.?!])\s+", line.strip()):
        if len(sentence) <= 84:
            yield sentence
            continue
        parts = re.split(r"(?<=,)\s+", sentence)
        buf = ""
        for p in parts:
            if buf and len(buf) + len(p) + 1 > 84:
                yield buf
                buf = p
            else:
                buf = f"{buf} {p}".strip()
        if buf:
            yield buf


cues = []
for sc in TIMELINE["scenes"]:
    start = sc["start"] / FPS + sc["voAt"]
    pieces = list(chunks(sc["line"]))
    total = sum(len(p) for p in pieces)
    t = start
    for p in pieces:
        d = sc["voDur"] * len(p) / total
        cues.append((t, t + d, "\n".join(textwrap.wrap(p, 42))))
        t += d

os.makedirs(os.path.join(ROOT, "out"), exist_ok=True)
with open(os.path.join(ROOT, "out", "biteatlas-promo.srt"), "w", encoding="utf-8", newline="\n") as f:
    for i, (a, b, text) in enumerate(cues, 1):
        f.write(f"{i}\n{stamp(a, ',')} --> {stamp(b, ',')}\n{text}\n\n")
with open(os.path.join(ROOT, "out", "biteatlas-promo.vtt"), "w", encoding="utf-8", newline="\n") as f:
    f.write("WEBVTT\n\n")
    for a, b, text in cues:
        f.write(f"{stamp(a, '.')} --> {stamp(b, '.')}\n{text}\n\n")
print(f"{len(cues)} cues")
