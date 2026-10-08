"use client";

import { Check, Search, Star, X } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useVisits } from "@/components/providers/VisitsProvider";
import { rankSearch } from "@/lib/restaurants/filters";
import { cn } from "@/lib/utils";
import type { Restaurant } from "@/types/domain";
import { useCategoryEmoji } from "./CategoryLabel";

type Props = {
  restaurants: Restaurant[];
  value: string;
  onValueChange: (q: string) => void;
  onSelect: (r: Restaurant) => void;
  placeholder?: string;
  className?: string;
};

/**
 * Combobox (WAI-ARIA 1.2). Typing filters the map + list via `onValueChange`;
 * choosing a suggestion calls `onSelect` (the map flies to it).
 */
export function RestaurantSearch({ restaurants, value, onValueChange, onSelect, placeholder, className }: Props) {
  const { buildingNames } = useCatalog();
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => rankSearch(restaurants, value, buildingNames, 7), [restaurants, value, buildingNames]);
  const showList = open && value.trim().length > 0;

  const choose = (r: Restaurant) => {
    onSelect(r);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results[active] ? `${id}-opt-${active}` : undefined}
        aria-label="Search restaurants"
        placeholder={placeholder ?? "Search restaurants, buildings…"}
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          onValueChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && showList && results[active]) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === "Escape") {
            if (showList) setOpen(false);
            else onValueChange("");
          }
        }}
        className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-10 text-[15px] text-ink shadow-sm outline-none placeholder:text-ink-muted hover:border-line-strong focus:border-ink [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-ink-muted hover:bg-paper-deep hover:text-ink"
          aria-label="Clear search"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}

      <ul
        id={listId}
        role="listbox"
        aria-label="Matching restaurants"
        hidden={!showList}
        className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-80 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-panel scrollbar-thin"
      >
        {results.length === 0 ? (
          <li className="px-3 py-3 text-sm text-ink-soft" role="presentation">
            No tracked restaurant matches “{value.trim()}”.
          </li>
        ) : (
          results.map((r, i) => (
            <SearchOption
              key={r.id}
              id={`${id}-opt-${i}`}
              restaurant={r}
              active={i === active}
              onHover={() => setActive(i)}
              onChoose={() => choose(r)}
            />
          ))
        )}
      </ul>
    </div>
  );
}

function SearchOption({
  id,
  restaurant,
  active,
  onHover,
  onChoose,
}: {
  id: string;
  restaurant: Restaurant;
  active: boolean;
  onHover: () => void;
  onChoose: () => void;
}) {
  const { buildingNames } = useCatalog();
  const { visits } = useVisits();
  const emoji = useCategoryEmoji(restaurant);
  const v = visits[restaurant.id];
  const where = restaurant.buildingId ? buildingNames.get(restaurant.buildingId) : restaurant.address;

  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      onMouseDown={(e) => e.preventDefault()}
      onMouseEnter={onHover}
      onClick={onChoose}
      className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2", active && "bg-paper-deep")}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-paper text-base" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{restaurant.name}</span>
        {where && <span className="block truncate text-xs text-ink-muted">{where}</span>}
      </span>
      {v?.favorite && <Star className="size-4 shrink-0 fill-gold text-gold-deep" aria-label="Favorite" />}
      {v?.visited && <Check className="size-4 shrink-0 text-tomato-deep" aria-label="Visited" />}
    </li>
  );
}
