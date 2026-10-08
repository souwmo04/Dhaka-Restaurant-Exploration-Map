"use client";

import { MapPinOff, RotateCw } from "lucide-react";
import type { MapStatus } from "./RestaurantMap";

/** Shown under the map while it loads, or instead of it if it fails. */
export function MapFallback({ status, onRetry }: { status: Exclude<MapStatus, "ready">; onRetry: () => void }) {
  if (status === "loading") {
    return (
      <div className="absolute inset-0 overflow-hidden bg-paper" aria-hidden>
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-transparent via-surface/50 to-transparent" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 grid place-items-center bg-paper p-6" role="alert">
      <div className="max-w-xs text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-tomato-soft text-tomato-deep">
          <MapPinOff className="size-6" aria-hidden />
        </div>
        <h2 className="mt-4 font-display text-xl font-semibold">The map couldn&apos;t load</h2>
        <p className="mt-2 text-sm text-ink-soft">
          This is usually a network hiccup or a browser without WebGL. Your progress is safe — and the restaurant
          list still works.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink-soft"
        >
          <RotateCw className="size-4" aria-hidden /> Try again
        </button>
      </div>
    </div>
  );
}
