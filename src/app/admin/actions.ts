"use server";

import { updateTag } from "next/cache";
import { validateRestaurantInput, type FieldErrors, type RestaurantInput } from "@/lib/admin/schema";
import { CATALOG_TAG } from "@/lib/catalog/repository";
import { slugify } from "@/lib/catalog/import-format";
import { getServerSupabase } from "@/lib/supabase/server";

export type ActionResult = { ok: true; id: string } | { ok: false; message: string; fieldErrors?: FieldErrors };

type ServerDb = NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>;

/** Re-checks the session and admin flag inside every action — never trust the client. */
async function requireAdmin(): Promise<{ ok: true; db: ServerDb } | { ok: false; error: string }> {
  const db = await getServerSupabase();
  if (!db) return { ok: false, error: "The database isn't configured." };
  const { data } = await db.auth.getUser();
  if (!data.user) return { ok: false, error: "Please sign in again." };
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", data.user.id).maybeSingle();
  if (!profile?.is_admin) return { ok: false, error: "You don't have permission to do that." };
  return { ok: true, db };
}

async function uniqueSlug(db: ServerDb, table: "restaurants" | "buildings", base: string, ignoreId?: string | null) {
  const root = base || "restaurant";
  const { data } = await db.from(table).select("id, slug").like("slug", `${root}%`);
  const taken = new Set((data ?? []).filter((r) => r.id !== ignoreId).map((r) => r.slug));
  let slug = root;
  for (let n = 2; taken.has(slug); n++) slug = `${root}-${n}`;
  return slug;
}

export async function saveRestaurant(input: RestaurantInput): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, message: auth.error };
  const { db } = auth;

  const fieldErrors = validateRestaurantInput(input);
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };

  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);

  let buildingId: string | null = input.buildingId && input.buildingId !== "new" ? input.buildingId : null;
  if (input.buildingId === "new") {
    const { data: area } = await db.from("areas").select("slug").eq("id", input.areaId).single();
    const slug = await uniqueSlug(db, "buildings", `${area?.slug ?? "area"}-${slugify(input.newBuildingName)}`);
    const { data, error } = await db
      .from("buildings")
      .insert({ slug, area_id: input.areaId, name: input.newBuildingName.trim(), address: input.address.trim() || null, latitude, longitude })
      .select("id")
      .single();
    if (error) return { ok: false, message: "Couldn't create the building." };
    buildingId = data.id;
  }

  const row = {
    name: input.name.trim(),
    name_bn: input.nameBn.trim() || null,
    area_id: input.areaId,
    building_id: buildingId,
    latitude,
    longitude,
    floor: input.floor.trim() || null,
    address: input.address.trim() || null,
    phone: input.phone.trim() || null,
    website: input.website.trim() || null,
    active: input.active,
  };

  let id = input.id;
  if (id) {
    const { error } = await db.from("restaurants").update(row).eq("id", id);
    if (error) return { ok: false, message: "Couldn't save the restaurant." };
  } else {
    const slug = await uniqueSlug(db, "restaurants", slugify(input.name));
    const { data, error } = await db.from("restaurants").insert({ ...row, slug, source: "manual" }).select("id").single();
    if (error) return { ok: false, message: "Couldn't create the restaurant." };
    id = data.id;
  }

  const { error: clearError } = await db.from("restaurant_categories").delete().eq("restaurant_id", id);
  if (clearError) return { ok: false, message: "Saved, but categories couldn't be updated." };
  const { error: catError } = await db
    .from("restaurant_categories")
    .insert(input.categoryIds.map((categoryId, i) => ({ restaurant_id: id!, category_id: categoryId, is_primary: i === 0 })));
  if (catError) return { ok: false, message: "Saved, but categories couldn't be updated." };

  updateTag(CATALOG_TAG);
  return { ok: true, id };
}

export async function setRestaurantActive(id: string, active: boolean): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (!auth.ok) return { ok: false, message: auth.error };
  const { error } = await auth.db.from("restaurants").update({ active }).eq("id", id);
  if (error) return { ok: false, message: "Couldn't update the restaurant." };
  updateTag(CATALOG_TAG);
  return { ok: true, id };
}
