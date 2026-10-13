"""
Synthesises the promo soundtrack: an original warm, mid-tempo track plus sound
effects locked to the video's timeline (wipes, clicks, pops, confetti), and
mixes in the narration with the music ducked underneath it.

    python scripts/voiceover.py           -> narration + src/data/timeline.json
    python scripts/soundtrack.py          -> public/audio/soundtrack.wav

Music and effects are generated from scratch with numpy/scipy, so there is
nothing to license. Timings are in video frames (30 fps) from timeline.json,
the same file src/Promo.tsx reads.
"""

import json
import os
import wave

import numpy as np
from scipy.signal import butter, sawtooth, sosfilt

SR = 48000
FPS = 30
BPM = 106
BEAT = 60 / BPM

HERE = os.path.dirname(os.path.abspath(__file__))
TIMELINE = json.load(open(os.path.join(HERE, "..", "src", "data", "timeline.json"), encoding="utf-8"))
# Scene starts in frames.
SCENES = {sc["id"]: sc["start"] for sc in TIMELINE["scenes"]}
TOTAL_FRAMES = TIMELINE["total"]
DUR = TOTAL_FRAMES / FPS + 1.0
N = int(DUR * SR)
rng = np.random.default_rng(7)

DROP = SCENES["numbers"] / FPS  # the beat comes in on the first cut
OUTRO = SCENES["outro"] / FPS


def t_of(frame):
    return frame / FPS


def sec(n):
    return np.arange(int(n * SR)) / SR


def lowpass(x, hz, order=2):
    return sosfilt(butter(order, hz, "low", fs=SR, output="sos"), x)


def highpass(x, hz, order=2):
    return sosfilt(butter(order, hz, "high", fs=SR, output="sos"), x)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def place(buf, sig, at, gain=1.0, pan=0.0):
    """Mixes a mono signal into the stereo buffer at time `at` (seconds)."""
    i = int(at * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    sig = sig[: N - i]
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    buf[0, i : i + len(sig)] += sig * gain * left * 1.414
    buf[1, i : i + len(sig)] += sig * gain * right * 1.414


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


# ── music ─────────────────────────────────────────────────────────────────
music = np.zeros((2, N))
drums = np.zeros((2, N))

# Cmaj7 · Am9 · Fmaj7 · G6, two bars each.
CHORDS = [[48, 52, 55, 59, 64], [45, 52, 55, 59, 60], [41, 48, 52, 57, 60], [43, 50, 55, 59, 64]]
BAR = BEAT * 4
CHORD_LEN = BAR * 2
# The chord grid is anchored so the drop lands on bar 1 of the home chord.
ORIGIN = DROP - 4 * CHORD_LEN


def chord_at(t):
    return CHORDS[int((t - ORIGIN) // CHORD_LEN) % 4]


def pad_chord(notes, length):
    t = sec(length)
    env = np.minimum(1, t / 0.6) * np.minimum(1, (length - t) / 0.8).clip(0, 1)
    out = np.zeros((2, len(t)))
    for m in notes:
        f = note(m)
        for ch, det in ((0, -0.006), (1, 0.006)):
            v = sawtooth(2 * np.pi * f * (1 + det) * t) + sawtooth(2 * np.pi * f * (1 - det * 0.7) * t + 1.3)
            out[ch] += v
    out = np.stack([lowpass(out[0], 1400), lowpass(out[1], 1400)])
    return out * env * 0.045


# Pad runs the whole piece; it starts filtered-dark and opens up after the drop.
start = ORIGIN
while start < DUR:
    seg = pad_chord(chord_at(start + 0.01), CHORD_LEN + 0.6)
    a = int(start * SR)
    if a < 0:
        seg = seg[:, -a:]
        a = 0
    b = min(N, a + seg.shape[1])
    music[:, a:b] += seg[:, : b - a]
    start += CHORD_LEN
music = np.stack([lowpass(music[0], 3200), lowpass(music[1], 3200)])
intro_dark = np.clip((np.arange(N) / SR) / DROP, 0, 1)
music *= 0.55 + 0.45 * intro_dark

# Bass: root notes in an eighth-note pattern after the drop.
beat_times = np.arange(DROP, OUTRO, BEAT / 2)
for k, bt in enumerate(beat_times):
    chord = chord_at(bt + 0.001)
    f = note(chord[0] - 12)
    t = sec(BEAT / 2 * 0.95)
    env = np.exp(-t * 7) * np.minimum(1, t / 0.006)
    sig = (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)) * env
    place(music, sig, bt, 0.16 if k % 2 == 0 else 0.1)

# Plucky arpeggio through the feature scenes for lift.
ARP_FROM, ARP_TO = t_of(SCENES["explore"]), t_of(SCENES["tech"]) + 4
for k, bt in enumerate(np.arange(ARP_FROM, ARP_TO, BEAT / 2)):
    chord = chord_at(bt + 0.001)
    m = chord[[1, 2, 3, 4, 3, 2][k % 6]] + 12
    f = note(m)
    t = sec(0.35)
    env = np.exp(-t * 11)
    sig = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)) * env
    place(music, sig, bt, 0.05, pan=0.35 if k % 2 else -0.35)

# Drums.
def kick():
    t = sec(0.42)
    f = 46 + 90 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5)


def hat():
    t = sec(0.05)
    return highpass(rng.standard_normal(len(t)), 7000) * np.exp(-t * 90)


def clap():
    t = sec(0.22)
    n = bandpass(rng.standard_normal(len(t)), 900, 3200) * np.exp(-t * 22)
    return n + 0.3 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)


duck = np.ones(N)
for k, bt in enumerate(np.arange(DROP, OUTRO, BEAT)):
    place(drums, kick(), bt, 0.55)
    a = int(bt * SR)
    d = 1 - 0.45 * np.exp(-sec(BEAT) * 9)
    duck[a : a + len(d)] = np.minimum(duck[a : a + len(d)], d[: N - a] if a + len(d) > N else d)
    if k % 2 == 1:
        place(drums, clap(), bt, 0.16, pan=0.05)
for k, bt in enumerate(np.arange(DROP + BEAT / 2, OUTRO, BEAT / 2)):
    place(drums, hat(), bt, 0.05 if k % 2 else 0.028, pan=0.25)

music *= duck
mix = music + drums

# ── sound effects ─────────────────────────────────────────────────────────
sfx = np.zeros((2, N))


def whoosh(length=0.55, lo=250, hi=4200):
    t = sec(length)
    noise = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    chunks = 24
    for c in range(chunks):
        a, b = c * len(t) // chunks, (c + 1) * len(t) // chunks
        center = lo * (hi / lo) ** (c / chunks)
        out[a:b] = bandpass(noise, center * 0.7, min(center * 1.4, SR / 2 - 100))[a:b]
    env = np.sin(np.pi * np.clip(t / length, 0, 1)) ** 1.6
    return out * env


def pop_sfx(f0=520, f1=980):
    t = sec(0.12)
    f = f0 + (f1 - f0) * (1 - np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32)


def click():
    t = sec(0.03)
    return highpass(rng.standard_normal(len(t)), 2500) * np.exp(-t * 260) + 0.5 * np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 200)


def thud():
    t = sec(0.35)
    f = 60 + 70 * np.exp(-t * 20)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def chime(base=1568):
    t = sec(1.2)
    out = np.zeros(len(t))
    for k, m in enumerate([1, 1.5, 2, 3]):
        out += np.sin(2 * np.pi * base * m * t) * np.exp(-t * (3 + k * 1.5)) / (k + 1)
    return out


def sparkle(length=2.2, density=26):
    out = np.zeros(int(length * SR))
    for _ in range(int(density * length)):
        f = rng.uniform(2200, 5200)
        t = sec(0.18)
        s = np.sin(2 * np.pi * f * t) * np.exp(-t * 30)
        at = int(rng.uniform(0, length - 0.2) * SR)
        out[at : at + len(s)] += s * rng.uniform(0.3, 1)
    return out


def riser(length=1.4):
    t = sec(length)
    n = rng.standard_normal(len(t))
    out = highpass(n, 1500) * (t / length) ** 2.2
    return out


s = SCENES
cuts = [s[k] for k in ("numbers", "city", "explore", "buildings", "visit", "search", "dashboard", "mobile", "tech", "outro")]
for k, c in enumerate(cuts):
    place(sfx, whoosh(), t_of(c) - 0.42, 0.22, pan=0.6 - 1.2 * ((k % 2)))

# intro
place(sfx, riser(1.6), 0.2, 0.05)
place(sfx, thud(), t_of(12), 0.6)
place(sfx, pop_sfx(400, 800), t_of(12), 0.25)
for k in range(9):
    place(sfx, click(), t_of(22 + k * 2.2), 0.05, pan=-0.4 + k * 0.1)
place(sfx, chime(1046), t_of(84), 0.1)
# numbers: counters slam in
for k, d in enumerate((10, 22, 34)):
    place(sfx, thud(), t_of(s["numbers"] + d), 0.45, pan=-0.5 + k * 0.5)
    place(sfx, pop_sfx(300 + k * 80, 600 + k * 100), t_of(s["numbers"] + d), 0.12)
# city: dots rain, then visited dots light up
place(sfx, sparkle(2.6, 30), t_of(s["city"] + 60), 0.045)
place(sfx, chime(1318), t_of(s["city"] + 190), 0.1)
place(sfx, sparkle(1.4, 22), t_of(s["city"] + 190), 0.04)
# explore
place(sfx, whoosh(0.9, 200, 2400), t_of(s["explore"] + 4), 0.12)
for d in (50, 78, 176, 200):
    place(sfx, pop_sfx(), t_of(s["explore"] + d + 12), 0.12)
place(sfx, whoosh(1.0, 300, 6000), t_of(s["explore"] + 126), 0.16)
place(sfx, click(), t_of(s["explore"] + 226), 0.3)
# buildings
place(sfx, whoosh(1.4, 4000, 300), t_of(s["buildings"] + 16), 0.14)
place(sfx, pop_sfx(), t_of(s["buildings"] + 120), 0.12)
place(sfx, click(), t_of(s["buildings"] + 156), 0.3)
# visit: the money shot
place(sfx, click(), t_of(s["visit"] + 80), 0.4)
place(sfx, pop_sfx(500, 1200), t_of(s["visit"] + 80), 0.3)
place(sfx, sparkle(0.9, 50), t_of(s["visit"] + 81), 0.09)
place(sfx, chime(1568), t_of(s["visit"] + 84), 0.14)
place(sfx, pop_sfx(700, 1000), t_of(s["visit"] + 90), 0.1)
place(sfx, click(), t_of(s["visit"] + 132), 0.35)
place(sfx, chime(2093), t_of(s["visit"] + 133), 0.1)
# search: typing, results, filter ticks
for k in range(5):
    place(sfx, click(), t_of(s["search"] + 22 + k * 4), 0.22, pan=-0.2)
for k in range(5):
    place(sfx, pop_sfx(800, 1100), t_of(s["search"] + 44 + k * 4), 0.04)
for d in (112, 140, 168):
    place(sfx, click(), t_of(s["search"] + d), 0.25, pan=0.4)
# dashboard
place(sfx, whoosh(1.0, 250, 3500), t_of(s["dashboard"] + 2), 0.13)
for k in range(4):
    place(sfx, pop_sfx(600 + k * 90, 900 + k * 90), t_of(s["dashboard"] + 54 + k * 9), 0.1)
# mobile
for d, pan in ((6, 0), (14, -0.5), (22, 0.5)):
    place(sfx, whoosh(0.6, 3000, 400), t_of(s["mobile"] + d), 0.1, pan=pan)
# tech
for k in range(6):
    place(sfx, pop_sfx(450 + k * 60, 800 + k * 60), t_of(s["tech"] + 20 + k * 6), 0.09, pan=-0.5 + (k % 3) * 0.5)
# outro: swell, logo hit, URL
place(sfx, riser(1.2), t_of(s["outro"]) - 1.2, 0.06)
place(sfx, thud(), t_of(s["outro"] + 14), 0.6)
place(sfx, chime(1046), t_of(s["outro"] + 14), 0.16)
place(sfx, pop_sfx(500, 1000), t_of(s["outro"] + 80), 0.18)

# Final chord rings out over the outro (drums already stopped there).
tail = pad_chord(CHORDS[0], 6.5) * 1.6
a = int(OUTRO * SR)
music_tail = np.zeros((2, N))
music_tail[:, a : a + tail.shape[1]] += tail[:, : N - a]

# ── narration ─────────────────────────────────────────────────────────────
vo = np.zeros((2, N))
for sc in TIMELINE["scenes"]:
    path = os.path.join(HERE, "..", "public", "audio", "vo", f"{sc['id']}.wav")
    with wave.open(path) as w:
        clip = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").astype(float) / 32768
    clip = highpass(clip, 90)
    # Level the voice like a broadcast mix: loudness target, then soft peak limiting.
    voiced = np.abs(clip) > 0.02 * np.max(np.abs(clip))
    clip *= 10 ** (-14 / 20) / (np.sqrt((clip[voiced] ** 2).mean()) + 1e-9)
    clip = np.tanh(clip / 0.55) * 0.55
    place(vo, clip, t_of(sc["start"]) + sc["voAt"], 1.0)

# Duck music (about -9 dB) and soften effects while the narrator speaks.
level = np.abs(vo[0])
win = int(0.25 * SR)
csum = np.concatenate([[0.0], np.cumsum(level)])
idx = np.clip(np.arange(N) + win // 2, 0, N)
lo = np.clip(np.arange(N) - win // 2, 0, N)
level = (csum[idx] - csum[lo]) / win  # running mean (fast)
speaking = np.clip(level / (np.percentile(level[level > 1e-4], 60) + 1e-9), 0, 1)
# Smooth the envelope: quick attack, slow release.
env = np.zeros(N)
a_c, r_c = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.5 * SR))
prev = 0.0
step = 64
for i in range(0, N, step):
    x = speaking[i]
    prev = x + (prev - x) * (a_c ** step if x > prev else r_c ** step)
    env[i : i + step] = prev
music_gain = 0.8 * (1 - 0.82 * env)  # about -15 dB under the voice
sfx_gain = 1 - 0.4 * env

bed = (mix + music_tail) * music_gain + sfx * sfx_gain
talking = env > 0.5
ratio = 20 * np.log10(np.sqrt((vo[0][talking] ** 2).mean()) / np.sqrt((bed[0][talking] ** 2).mean()))
print(f"voice is {ratio:.1f} dB above the music while speaking")
out = bed + vo
# Gentle fade at the very end, soft limiter, normalise to -1 dBFS.
t = np.arange(N) / SR
end = TOTAL_FRAMES / FPS
out *= np.clip((end + 0.6 - t) / 1.6, 0, 1)
out = np.tanh(out * 1.4) / np.tanh(1.4)
out *= 10 ** (-1 / 20) / np.max(np.abs(out))

os.makedirs("public/audio", exist_ok=True)
pcm = (out.T * 32767).astype("<i2")
with wave.open("public/audio/soundtrack.wav", "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(json.dumps({"seconds": round(N / SR, 2), "peak": float(np.max(np.abs(out)))}))
