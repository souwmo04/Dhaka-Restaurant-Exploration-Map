"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, UserRestaurantRow } from "@/types/database";
import type { Visit, VisitMap } from "@/types/domain";
import { isEmptyVisit } from "./model";

type Db = SupabaseClient<Database>;

const COLUMNS = "restaurant_id, visited, visited_at, favorite, notes, updated_at" as const;

function toVisit(row: Pick<UserRestaurantRow, "restaurant_id" | "visited" | "visited_at" | "favorite" | "notes" | "updated_at">): Visit {
  return {
    restaurantId: row.restaurant_id,
    visited: row.visited,
    visitedAt: row.visited_at,
    favorite: row.favorite,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

/** RLS limits this to the signed-in user's rows. */
export async function fetchAccountVisits(db: Db): Promise<VisitMap> {
  const out: VisitMap = {};
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("user_restaurants")
      .select(COLUMNS)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    for (const row of data) out[row.restaurant_id] = toVisit(row);
    if (data.length < pageSize) return out;
  }
}

/** Upserts the visit, or deletes the row when nothing is recorded any more. */
export async function saveAccountVisit(db: Db, userId: string, visit: Visit): Promise<void> {
  if (isEmptyVisit(visit)) {
    const { error } = await db
      .from("user_restaurants")
      .delete()
      .eq("user_id", userId)
      .eq("restaurant_id", visit.restaurantId);
    if (error) throw error;
    return;
  }
  const { error } = await db.from("user_restaurants").upsert(
    {
      user_id: userId,
      restaurant_id: visit.restaurantId,
      visited: visit.visited,
      visited_at: visit.visitedAt,
      favorite: visit.favorite,
      notes: visit.notes,
    },
    { onConflict: "user_id,restaurant_id" },
  );
  if (error) throw error;
}

export async function saveAccountVisits(db: Db, userId: string, visits: Visit[]): Promise<void> {
  const rows = visits
    .filter((v) => !isEmptyVisit(v))
    .map((v) => ({
      user_id: userId,
      restaurant_id: v.restaurantId,
      visited: v.visited,
      visited_at: v.visitedAt,
      favorite: v.favorite,
      notes: v.notes,
    }));
  if (rows.length === 0) return;
  const { error } = await db.from("user_restaurants").upsert(rows, { onConflict: "user_id,restaurant_id" });
  if (error) throw error;
}
