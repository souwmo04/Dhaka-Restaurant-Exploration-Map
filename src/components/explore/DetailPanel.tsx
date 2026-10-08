"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Desktop detail panel: floats over the right edge of the map (the map stays
 * visible and interactive). Non-modal; Escape closes it.
 */
export function DetailPanel({ open, panelKey, onClose, children }: { open: boolean; panelKey: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !(e.target instanceof HTMLInputElement)) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Move focus into the panel when its content changes, so keyboard and
  // screen-reader users land on the new details.
  useEffect(() => {
    if (open) ref.current?.focus({ preventScroll: true });
  }, [open, panelKey]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          key="detail-panel"
          ref={ref}
          tabIndex={-1}
          aria-label="Details"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
          className="absolute bottom-4 right-4 top-4 z-20 flex w-[392px] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-panel outline-none"
        >
          <motion.div
            key={panelKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="flex-1 overflow-y-auto p-5 scrollbar-thin"
          >
            {children}
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
