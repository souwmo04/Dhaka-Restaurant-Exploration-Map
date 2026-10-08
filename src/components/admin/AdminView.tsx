"use client";

import { Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { setRestaurantActive } from "@/app/admin/actions";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useToast } from "@/components/ui/Toaster";
import { normalizeSearch } from "@/lib/restaurants/filters";
import { cn } from "@/lib/utils";
import { RestaurantForm } from "./RestaurantForm";

export type AdminRestaurant = {
  id: string;
  name: string;
  nameBn: string | null;
  areaId: string;
  buildingId: string | null;
  latitude: number;
  longitude: number;
  floor: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  active: boolean;
  source: string;
  categoryIds: string[];
};

export type AdminBuilding = { id: string; name: string; areaId: string };

export function AdminView({ restaurants, buildings }: { restaurants: AdminRestaurant[]; buildings: AdminBuilding[] }) {
  const { areaById, categoryById, activeAreas } = useCatalog();
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [editing, setEditing] = useState<AdminRestaurant | "new" | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = useMemo(() => {
    const q = normalizeSearch(query);
    return restaurants.filter((r) => (showInactive || r.active) && (!q || normalizeSearch(`${r.name} ${r.address ?? ""}`).includes(q)));
  }, [restaurants, query, showInactive]);

  const toggleActive = (r: AdminRestaurant) =>
    startTransition(async () => {
      const result = await setRestaurantActive(r.id, !r.active);
      if (result.ok) {
        toast({ tone: "success", title: r.active ? `${r.name} deactivated` : `${r.name} reactivated` });
        router.refresh();
      } else toast({ tone: "error", title: result.message });
    });

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tomato-deep">Admin</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Restaurants</h1>
          <p className="mt-1 text-ink-soft">
            {restaurants.filter((r) => r.active).length} active · {restaurants.filter((r) => !r.active).length} inactive
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-2 rounded-full bg-tomato-deep px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#a9370f]"
        >
          <Plus className="size-4" aria-hidden /> Add restaurant
        </button>
      </div>

      {editing && (
        <RestaurantForm
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          buildings={buildings}
          defaultAreaId={activeAreas[0]?.id ?? ""}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or address"
            aria-label="Filter restaurants"
            className="h-11 w-full rounded-full border border-line bg-surface pl-10 pr-4 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="size-4 accent-[var(--tomato-deep)]" />
          Show inactive
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">Name</th>
              <th scope="col" className="px-3 py-3 font-semibold">Area</th>
              <th scope="col" className="px-3 py-3 font-semibold">Category</th>
              <th scope="col" className="px-3 py-3 font-semibold">Source</th>
              <th scope="col" className="px-3 py-3 font-semibold">Status</th>
              <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className={cn(!r.active && "text-ink-muted")}>
                <td className="px-5 py-3 font-medium">{r.name}</td>
                <td className="px-3 py-3">{areaById.get(r.areaId)?.name}</td>
                <td className="px-3 py-3">{r.categoryIds.map((id) => categoryById.get(id)?.name).filter(Boolean).slice(0, 2).join(", ")}</td>
                <td className="px-3 py-3 uppercase text-xs">{r.source}</td>
                <td className="px-3 py-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", r.active ? "bg-leaf/10 text-leaf" : "bg-paper-deep text-ink-soft")}>
                    {r.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-right">
                  <button type="button" onClick={() => setEditing(r)} className="rounded-lg px-2 py-1 font-medium text-ink hover:bg-paper-deep">
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggleActive(r)}
                    className="ml-1 rounded-lg px-2 py-1 font-medium text-ink-soft hover:bg-paper-deep disabled:opacity-50"
                  >
                    {r.active ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center text-ink-soft">No restaurants match.</p>}
      </div>
    </div>
  );
}
