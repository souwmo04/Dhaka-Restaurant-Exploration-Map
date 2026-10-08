"use client";

import { motion } from "framer-motion";
import { CalendarDays, Check, NotebookPen, Star } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useVisits } from "@/components/providers/VisitsProvider";
import { useToast } from "@/components/ui/Toaster";
import { cn, formatIsoDate, todayIso } from "@/lib/utils";
import type { Restaurant } from "@/types/domain";

export function VisitControls({ restaurant }: { restaurant: Restaurant }) {
  const { visits, update, status } = useVisits();
  const toast = useToast();
  const visit = visits[restaurant.id];
  const visited = !!visit?.visited;
  const favorite = !!visit?.favorite;
  const disabled = status === "loading";

  const dateId = useId();
  const notesId = useId();
  const [editingDate, setEditingDate] = useState(false);
  const [notesOpen, setNotesOpen] = useState(!!visit?.notes);
  const [notes, setNotes] = useState(visit?.notes ?? "");

  // Keep the draft in sync when switching restaurants or when data loads.
  useEffect(() => {
    setNotes(visit?.notes ?? "");
    setNotesOpen(!!visit?.notes);
    setEditingDate(false);
  }, [restaurant.id, visit?.notes]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          disabled={disabled}
          aria-pressed={visited}
          onClick={() => {
            update(restaurant.id, { visited: !visited });
            if (!visited) toast({ tone: "success", title: `${restaurant.name} marked as visited` });
          }}
          className={cn(
            "flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-colors disabled:opacity-60",
            visited
              ? "border-2 border-tomato bg-tomato-soft text-tomato-deep hover:bg-tomato-soft/70"
              : "bg-tomato-deep text-white hover:bg-[#a9370f]",
          )}
        >
          <Check className="size-5" strokeWidth={3} aria-hidden />
          {visited ? "Visited" : "Mark as visited"}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          disabled={disabled}
          aria-pressed={favorite}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
          title={favorite ? "Remove from favorites" : "Add to favorites"}
          onClick={() => update(restaurant.id, { favorite: !favorite })}
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl border-2 transition-colors disabled:opacity-60",
            favorite ? "border-gold bg-gold-soft text-gold-deep" : "border-line bg-surface text-ink-soft hover:border-line-strong",
          )}
        >
          <motion.span key={String(favorite)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
            <Star className={cn("size-5", favorite && "fill-gold")} aria-hidden />
          </motion.span>
        </motion.button>
      </div>

      {visited && visit?.visitedAt && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-paper px-3 py-2 text-sm">
          <CalendarDays className="size-4 text-ink-muted" aria-hidden />
          {editingDate ? (
            <>
              <label htmlFor={dateId} className="text-ink-soft">
                Visited on
              </label>
              <input
                id={dateId}
                type="date"
                autoFocus
                max={todayIso()}
                defaultValue={visit.visitedAt}
                onChange={(e) => {
                  if (e.target.value) update(restaurant.id, { visitedAt: e.target.value });
                }}
                onBlur={() => setEditingDate(false)}
                className="rounded-lg border border-line bg-surface px-2 py-1 text-sm"
              />
            </>
          ) : (
            <>
              <span className="text-ink-soft">
                Visited <span className="font-medium text-ink">{formatIsoDate(visit.visitedAt)}</span>
              </span>
              <button
                type="button"
                onClick={() => setEditingDate(true)}
                className="ml-auto rounded-md px-1 text-sm font-medium text-tomato-deep underline-offset-2 hover:underline"
              >
                Change date
              </button>
            </>
          )}
        </div>
      )}

      {notesOpen ? (
        <div>
          <label htmlFor={notesId} className="mb-1 block text-xs font-medium text-ink-soft">
            Your private note
          </label>
          <textarea
            id={notesId}
            value={notes}
            rows={2}
            maxLength={2000}
            placeholder="What did you order? Worth going back?"
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              const next = notes.trim() || null;
              if (next !== (visit?.notes ?? null)) update(restaurant.id, { notes: next });
            }}
            className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm placeholder:text-ink-muted hover:border-line-strong"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNotesOpen(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <NotebookPen className="size-4" aria-hidden /> Add a private note
        </button>
      )}
    </div>
  );
}
