import { AppHeader } from "@/components/layout/AppHeader";

/** Instant placeholder while an area page streams in. */
export function ExploreSkeleton() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true">
      <AppHeader />
      <div className="relative flex min-h-0 flex-1">
        <div className="hidden w-[380px] shrink-0 flex-col gap-4 border-r border-line bg-surface p-6 lg:flex xl:w-[410px]">
          <div className="h-3 w-48 animate-pulse rounded bg-paper-deep" />
          <div className="h-10 w-40 animate-pulse rounded bg-paper-deep" />
          <div className="h-2.5 w-full animate-pulse rounded-full bg-paper-deep" />
        </div>
        <div className="relative flex-1 overflow-hidden bg-paper">
          <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] [background-size:48px_48px]" />
        </div>
      </div>
      <span className="sr-only">Loading map…</span>
    </div>
  );
}
