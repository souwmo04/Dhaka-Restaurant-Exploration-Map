"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, LocateFixed } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { groupAreas } from "@/lib/areas";
import { cn } from "@/lib/utils";
import type { Area } from "@/types/domain";

/** Area switcher — data-driven from the `areas` table; inactive areas show "Coming soon". */
export function AreaSwitcher({ current, className }: { current: Area; className?: string }) {
  const { areas } = useCatalog();
  const [open, setOpen] = useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={cn(
          "flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface pl-4 pr-3 text-sm font-semibold shadow-float hover:border-line-strong",
          className,
        )}
        aria-label={`Area: ${current.name}. Change area`}
      >
        {current.group && !current.name.includes(current.group) && (
          <span className="font-normal text-ink-muted">{current.group} ·</span>
        )}
        <span className="max-w-[11rem] truncate">{current.name}</span>
        <ChevronDown className="size-4 text-ink-muted" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className="z-50 max-h-[70vh] w-64 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-panel scrollbar-thin">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Dhaka areas</p>
          <ul>
            {groupAreas(areas).map((section) => (
              <li key={section.group ?? section.items[0].id}>
                {section.group && (
                  <p className="px-3 pb-0.5 pt-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{section.group}</p>
                )}
                <ul aria-label={section.group ?? undefined}>
                  {section.items.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/explore/${a.slug}`}
                        onClick={() => setOpen(false)}
                        aria-current={a.id === current.id ? "page" : undefined}
                        className={cn("flex items-center justify-between gap-2 rounded-xl py-2 pr-3 text-sm hover:bg-paper-deep", section.group ? "pl-5" : "pl-3")}
                      >
                        <span className={cn(a.active ? "font-medium text-ink" : "text-ink-soft")}>{a.name}</span>
                        {a.id === current.id ? (
                          <Check className="size-4 text-tomato-deep" aria-hidden />
                        ) : (
                          !a.active && <span className="rounded-full bg-paper-deep px-2 py-0.5 text-[11px] font-medium text-ink-muted">Soon</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function ReturnToAreaButton({ area, onClick, className }: { area: Area; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium shadow-float hover:border-line-strong",
        className,
      )}
      aria-label={`Return to ${area.name}`}
      title={`Return to ${area.name}`}
    >
      <LocateFixed className="size-4" aria-hidden />
      <span className="hidden sm:inline">{area.name}</span>
    </button>
  );
}

/** Small key explaining the marker states. */
export function MapLegend({ areaName, className }: { areaName: string; className?: string }) {
  const item = "flex items-center gap-1.5";
  return (
    <div className={cn("flex items-center gap-3 rounded-full border border-line bg-surface/95 px-3.5 py-2 text-xs text-ink-soft shadow-float backdrop-blur", className)}>
      <span className={item}>
        <span className="size-3 rounded-full border-2 border-ink bg-surface" aria-hidden /> Not yet
      </span>
      <span className={item}>
        <span className="size-3 rounded-full border-2 border-tomato-deep bg-tomato" aria-hidden /> Visited
      </span>
      <span className={item}>
        <span className="text-[13px] leading-none text-gold" aria-hidden>
          ★
        </span>{" "}
        Favorite
      </span>
      <span className={item}>
        <span className="h-0 w-4 border-t-2 border-dashed border-tomato-deep" aria-hidden /> {areaName}
      </span>
      <span className={item}>
        <span className="grid h-3.5 min-w-3.5 place-items-center rounded-[4px] border-2 border-ink bg-surface px-0.5 text-[8px] font-bold leading-none text-ink" aria-hidden>
          3
        </span>{" "}
        Building
      </span>
    </div>
  );
}
