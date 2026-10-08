"use client";

import { animate, motion, useMotionValue, useReducedMotion, type PanInfo } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SheetSnap = "peek" | "half" | "full";

export const SHEET_PEEK = 136;

export function sheetHeight(snap: SheetSnap, containerHeight: number): number {
  if (snap === "peek") return SHEET_PEEK;
  if (snap === "half") return Math.round(containerHeight * 0.56);
  return containerHeight - 8;
}

/**
 * Mobile bottom sheet over the map with peek / half / full snap points.
 * Drag the handle area to resize; the handle is also a button for keyboard
 * and switch users.
 */
export function MobileSheet({
  snap,
  onSnapChange,
  header,
  children,
  label,
}: {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Always-visible top section (also the drag area). */
  header: ReactNode;
  children: ReactNode;
  label: string;
}) {
  const boundsRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  const height = useMotionValue(SHEET_PEEK);
  const dragStart = useRef(0);
  const reduce = useReducedMotion();

  useLayoutEffect(() => {
    const el = boundsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!containerHeight) return;
    const target = sheetHeight(snap, containerHeight);
    const controls = animate(height, target, reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 40 });
    return () => controls.stop();
  }, [snap, containerHeight, height, reduce]);

  const onPanEnd = (_: unknown, info: PanInfo) => {
    const projected = height.get() - info.velocity.y * 0.18;
    const snaps: SheetSnap[] = ["peek", "half", "full"];
    const nearest = snaps.reduce((best, s) =>
      Math.abs(sheetHeight(s, containerHeight) - projected) < Math.abs(sheetHeight(best, containerHeight) - projected) ? s : best,
    );
    // Snap state may be unchanged; re-run the spring back to it explicitly.
    if (nearest === snap) animate(height, sheetHeight(snap, containerHeight), { type: "spring", stiffness: 420, damping: 40 });
    else onSnapChange(nearest);
  };

  return (
    <div ref={boundsRef} className="pointer-events-none absolute inset-0 z-20">
      <motion.section
        aria-label={label}
        style={{ height }}
        className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[28px] border-t border-line bg-surface shadow-[0_-12px_40px_-12px_rgb(31_27_22/0.3)]"
      >
        <motion.div
          className="shrink-0 touch-none select-none px-5 pb-3 pt-2"
          onPanStart={() => (dragStart.current = height.get())}
          onPan={(_, info) => {
            const next = dragStart.current - info.offset.y;
            height.set(Math.max(SHEET_PEEK - 40, Math.min(containerHeight - 8, next)));
          }}
          onPanEnd={onPanEnd}
        >
          <button
            type="button"
            onClick={() => onSnapChange(snap === "peek" ? "half" : "peek")}
            aria-expanded={snap !== "peek"}
            aria-label={snap === "peek" ? "Expand panel" : "Collapse panel"}
            className="mx-auto mb-2 flex h-6 w-16 items-center justify-center rounded-full"
          >
            <span className="h-1.5 w-10 rounded-full bg-line-strong" />
          </button>
          {header}
        </motion.div>
        <div className={cn("min-h-0 flex-1 px-4 pb-[max(env(safe-area-inset-bottom),16px)]", snap === "peek" ? "overflow-hidden" : "overflow-y-auto overscroll-contain")}>
          {children}
        </div>
      </motion.section>
    </div>
  );
}
