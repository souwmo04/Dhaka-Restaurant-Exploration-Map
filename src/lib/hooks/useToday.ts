"use client";

import { useSyncExternalStore } from "react";
import { todayIso } from "@/lib/utils";

const noopSubscribe = () => () => {};

/** Today's local date (YYYY-MM-DD) on the client; null while prerendering, since "today" isn't static. */
export function useToday(): string | null {
  return useSyncExternalStore(noopSubscribe, todayIso, () => null);
}
