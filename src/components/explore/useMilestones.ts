"use client";

import { useEffect, useRef } from "react";
import { useVisits } from "@/components/providers/VisitsProvider";
import { useToast } from "@/components/ui/Toaster";

/** Visit counts worth a small celebration. (A future achievements system can build on this.) */
const MILESTONES: Record<number, string> = {
  1: "First bite! Your map has started.",
  5: "Five down. You're getting the taste for it.",
  10: "10 restaurants explored!",
  25: "25 restaurants — a proper regular.",
  50: "50 restaurants. Serious explorer.",
  100: "100 restaurants. Local legend.",
};

/** Toasts when the visited count *increases* past a milestone (not on initial load). */
export function useMilestones(visited: number, areaName: string) {
  const { status } = useVisits();
  const toast = useToast();
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "ready") {
      previous.current = null;
      return;
    }
    const prev = previous.current;
    previous.current = visited;
    if (prev === null || visited <= prev) return;
    for (let n = prev + 1; n <= visited; n++) {
      if (MILESTONES[n]) toast({ tone: "success", title: MILESTONES[n], description: `${n} visited in ${areaName}.` });
    }
  }, [visited, status, areaName, toast]);
}
