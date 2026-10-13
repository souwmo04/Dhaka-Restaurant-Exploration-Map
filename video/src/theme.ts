import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { Easing, interpolate, spring } from "remotion";

/** BiteAtlas brand tokens (same values as the app's globals.css). */
export const C = {
  paper: "#f6f1e8",
  paperDeep: "#ece4d6",
  surface: "#fffdf9",
  ink: "#1f1b16",
  inkSoft: "#564e44",
  inkMuted: "#6f665a",
  line: "#e3d9c8",
  tomato: "#e4572e",
  tomatoDeep: "#c2401b",
  tomatoSoft: "#fbe3d9",
  gold: "#f2b705",
  goldSoft: "#fcf0c8",
  leaf: "#2f7a4f",
};

export const display = loadFraunces("normal", { weights: ["500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const displayItalic = loadFraunces("italic", { weights: ["600"], subsets: ["latin"] }).fontFamily;
export const sans = loadGeist("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;

export const FPS = 30;
export const W = 1920;
export const H = 1080;

/** House easing curves. */
export const ease = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.7, 0, 0.84, 0),
  soft: Easing.bezier(0.22, 1, 0.36, 1),
};

/** 0→1 over [start, start+duration] with an easing curve, clamped. */
export function prog(frame: number, start: number, duration: number, easing = ease.out) {
  return interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

/** A springy 0→1 starting at `delay`. */
export function pop(frame: number, fps: number, delay = 0, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  return spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 160, mass: 0.8, ...config } });
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
