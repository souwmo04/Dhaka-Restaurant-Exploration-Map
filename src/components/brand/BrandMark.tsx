import { cn } from "@/lib/utils";

/** The BiteAtlas mark: a map dot with a bite taken out of it. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="var(--ink)" />
      <path
        fill="var(--tomato)"
        d="M32 12a20 20 0 1 0 19.5 15.6 7.5 7.5 0 0 1-9.6-9.6 7.5 7.5 0 0 1-6.3-5.7A20 20 0 0 0 32 12Z"
      />
      <circle cx="32" cy="32" r="6" fill="var(--surface)" />
    </svg>
  );
}
