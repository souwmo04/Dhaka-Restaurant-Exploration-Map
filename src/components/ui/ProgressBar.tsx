"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ProgressBar({
  percent,
  label,
  className,
  tone = "tomato",
}: {
  percent: number;
  /** Accessible name, e.g. "Uttara exploration". */
  label: string;
  className?: string;
  tone?: "tomato" | "ink";
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 10) / 10}
      className={cn("h-2 overflow-hidden rounded-full bg-paper-deep", className)}
    >
      <motion.div
        className={cn("h-full rounded-full", tone === "tomato" ? "bg-tomato" : "bg-ink")}
        initial={false}
        animate={{ width: `${clamped === 0 ? 0 : Math.max(clamped, 1.5)}%` }}
        transition={{ type: "spring", stiffness: 140, damping: 22 }}
      />
    </div>
  );
}
