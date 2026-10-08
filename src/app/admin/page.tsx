import { ShieldAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminView, type AdminBuilding, type AdminRestaurant } from "@/components/admin/AdminView";
import { StateMessage } from "@/components/feedback/States";
import { AppHeader } from "@/components/layout/AppHeader";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Manage restaurants", robots: { index: false } };

export default function AdminPage() {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <Suspense fallback={<p className="py-20 text-center text-ink-soft">Checking your access…</p>}>
          <AdminGate />
        </Suspense>
      </main>
    </div>
  );
}

/** Server-side authorization: only admins get the data and the editor. */
async function AdminGate() {
  const db = await getServerSupabase();
  if (!db) {
    return (
      <StateMessage icon={<ShieldAlert className="size-6" />} title="Admin needs a database">
        Restaurant editing works once Supabase is configured. Until then, edit the files in <code>/data</code> and re-run the import.
      </StateMessage>
    );
  }

  const { data: auth } = await db.auth.getUser();
  const { data: profile } = auth.user
    ? await db.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle()
    : { data: null };

  if (!profile?.is_admin) {
    return (
      <StateMessage
        tone="error"
        icon={<ShieldAlert className="size-6" />}
        title="Admins only"
        action={
          <Link href="/" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface">
            Back to the map
          </Link>
        }
      >
        This area is for people who maintain the restaurant data.
      </StateMessage>
    );
  }

  const [restaurants, buildings] = await Promise.all([
    db
      .from("restaurants")
      .select("id, name, name_bn, area_id, building_id, latitude, longitude, floor, address, phone, website, active, source, restaurant_categories(category_id, is_primary)")
      .order("name")
      .limit(5000),
    db.from("buildings").select("id, name, area_id").order("name"),
  ]);

  if (restaurants.error || buildings.error) {
    return <StateMessage tone="error" title="Couldn't load restaurants">Please refresh the page to try again.</StateMessage>;
  }

  const rows: AdminRestaurant[] = restaurants.data.map((r) => ({
    id: r.id,
    name: r.name,
    nameBn: r.name_bn,
    areaId: r.area_id,
    buildingId: r.building_id,
    latitude: r.latitude,
    longitude: r.longitude,
    floor: r.floor,
    address: r.address,
    phone: r.phone,
    website: r.website,
    active: r.active,
    source: r.source,
    categoryIds: [...r.restaurant_categories].sort((a, b) => Number(b.is_primary) - Number(a.is_primary)).map((c) => c.category_id),
  }));
  const buildingRows: AdminBuilding[] = buildings.data.map((b) => ({ id: b.id, name: b.name, areaId: b.area_id }));

  return <AdminView restaurants={rows} buildings={buildingRows} />;
}
