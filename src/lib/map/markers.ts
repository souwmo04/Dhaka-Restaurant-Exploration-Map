"use client";

import { mapPalette as p } from "./theme";

/** Marker state → image id registered on the map. */
export const MARKER_IMAGES = {
  unvisited: "pin-unvisited",
  visited: "pin-visited",
  favorite: "pin-favorite",
  visitedFavorite: "pin-visited-favorite",
  groupNone: "group-none",
  groupSome: "group-some",
  groupAll: "group-all",
} as const;

export type MarkerImageId = (typeof MARKER_IMAGES)[keyof typeof MARKER_IMAGES];

type Drawn = { width: number; height: number; data: Uint8ClampedArray };

function canvas(w: number, h: number, ratio: number) {
  const el = document.createElement("canvas");
  el.width = Math.ceil(w * ratio);
  el.height = Math.ceil(h * ratio);
  const ctx = el.getContext("2d")!;
  ctx.scale(ratio, ratio);
  return { el, ctx };
}

function read(el: HTMLCanvasElement): Drawn {
  const ctx = el.getContext("2d")!;
  return { width: el.width, height: el.height, data: ctx.getImageData(0, 0, el.width, el.height).data };
}

function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, outer: number, inner: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
}

// Pin: 32×42 CSS px, head centred at (16,15), tip at (16,39).
const PIN_W = 32;
const PIN_H = 42;

function pinPath(ctx: CanvasRenderingContext2D) {
  const cx = 16;
  const cy = 15;
  const r = 12.5;
  ctx.beginPath();
  ctx.moveTo(cx, 39);
  ctx.bezierCurveTo(cx - 3, 32, cx - r, 25, cx - r, cy);
  ctx.arc(cx, cy, r, Math.PI, 0);
  ctx.bezierCurveTo(cx + r, 25, cx + 3, 32, cx, 39);
  ctx.closePath();
}

function drawPin(kind: "unvisited" | "visited" | "favorite" | "visitedFavorite", ratio: number): Drawn {
  const { el, ctx } = canvas(PIN_W, PIN_H, ratio);
  const filled = kind === "visited" || kind === "visitedFavorite";

  ctx.save();
  ctx.shadowColor = "rgba(35, 31, 26, 0.28)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1.5;
  pinPath(ctx);
  ctx.fillStyle = filled ? p.tomato : p.white;
  ctx.fill();
  ctx.restore();

  pinPath(ctx);
  ctx.lineWidth = 2;
  ctx.strokeStyle = filled ? p.tomatoDeep : p.ink;
  ctx.stroke();

  if (kind === "unvisited") {
    ctx.beginPath();
    ctx.arc(16, 15, 4, 0, Math.PI * 2);
    ctx.fillStyle = p.ink;
    ctx.fill();
  } else if (kind === "visited") {
    ctx.beginPath();
    ctx.moveTo(10.5, 15.5);
    ctx.lineTo(14.5, 19.5);
    ctx.lineTo(21.5, 11);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = p.white;
    ctx.stroke();
  } else {
    star(ctx, 16, 15.5, 8, 3.6);
    ctx.fillStyle = kind === "favorite" ? p.gold : p.white;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = kind === "favorite" ? "#b58800" : p.white;
    ctx.stroke();
  }
  return read(el);
}

// Building group: 40×40 CSS px stacked card; the count is drawn by a text layer.
function drawGroup(kind: "none" | "some" | "all", ratio: number): Drawn {
  const size = 40;
  const { el, ctx } = canvas(size, size, ratio);
  const card = (x: number, y: number, w: number, h: number) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 9);
  };

  // back card (gives the "several places here" stack)
  card(9, 4, 26, 26);
  ctx.fillStyle = kind === "all" ? p.tomatoDeep : "#d9cfbf";
  ctx.fill();

  ctx.save();
  ctx.shadowColor = "rgba(35, 31, 26, 0.3)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1.5;
  card(5, 8, 28, 28);
  ctx.fillStyle = kind === "all" ? p.tomato : p.white;
  ctx.fill();
  ctx.restore();

  card(5, 8, 28, 28);
  ctx.lineWidth = 2;
  ctx.strokeStyle = kind === "all" ? p.tomatoDeep : p.ink;
  ctx.stroke();

  if (kind === "some") {
    // progress notch along the bottom edge
    ctx.beginPath();
    ctx.roundRect(10, 30, 18, 3, 1.5);
    ctx.fillStyle = p.tomato;
    ctx.fill();
  }
  return read(el);
}

export function createMarkerImages(ratio: number): Record<MarkerImageId, Drawn> {
  return {
    [MARKER_IMAGES.unvisited]: drawPin("unvisited", ratio),
    [MARKER_IMAGES.visited]: drawPin("visited", ratio),
    [MARKER_IMAGES.favorite]: drawPin("favorite", ratio),
    [MARKER_IMAGES.visitedFavorite]: drawPin("visitedFavorite", ratio),
    [MARKER_IMAGES.groupNone]: drawGroup("none", ratio),
    [MARKER_IMAGES.groupSome]: drawGroup("some", ratio),
    [MARKER_IMAGES.groupAll]: drawGroup("all", ratio),
  } as Record<MarkerImageId, Drawn>;
}
