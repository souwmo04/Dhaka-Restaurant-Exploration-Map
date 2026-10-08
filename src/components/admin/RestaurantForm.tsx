"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Loader2, X } from "lucide-react";
import { useId, useState, useTransition, type ReactNode } from "react";
import { saveRestaurant } from "@/app/admin/actions";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { useToast } from "@/components/ui/Toaster";
import { validateRestaurantInput, type FieldErrors, type RestaurantInput } from "@/lib/admin/schema";
import { cn } from "@/lib/utils";
import type { AdminBuilding, AdminRestaurant } from "./AdminView";

function toInput(r: AdminRestaurant | null, defaultAreaId: string): RestaurantInput {
  return {
    id: r?.id ?? null,
    name: r?.name ?? "",
    nameBn: r?.nameBn ?? "",
    areaId: r?.areaId ?? defaultAreaId,
    buildingId: r?.buildingId ?? "",
    newBuildingName: "",
    latitude: r ? String(r.latitude) : "",
    longitude: r ? String(r.longitude) : "",
    floor: r?.floor ?? "",
    address: r?.address ?? "",
    phone: r?.phone ?? "",
    website: r?.website ?? "",
    categoryIds: r?.categoryIds ?? [],
    active: r?.active ?? true,
  };
}

export function RestaurantForm({
  initial,
  buildings,
  defaultAreaId,
  onClose,
  onSaved,
}: {
  initial: AdminRestaurant | null;
  buildings: AdminBuilding[];
  defaultAreaId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { areas, categories } = useCatalog();
  const toast = useToast();
  const [value, setValue] = useState<RestaurantInput>(() => toInput(initial, defaultAreaId));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof RestaurantInput>(key: K, v: RestaurantInput[K]) => setValue((s) => ({ ...s, [key]: v }));
  const areaBuildings = buildings.filter((b) => b.areaId === value.areaId);

  const submit = () => {
    const local = validateRestaurantInput(value);
    setErrors(local);
    if (Object.keys(local).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }
    startTransition(async () => {
      const result = await saveRestaurant(value);
      if (result.ok) {
        toast({ tone: "success", title: initial ? "Restaurant updated" : "Restaurant added", description: "The public map refreshes within moments." });
        onSaved();
      } else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.message);
      }
    });
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-panel sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[640px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-display text-2xl font-semibold">{initial ? "Edit restaurant" : "Add restaurant"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-soft">Changes appear on everyone&apos;s map.</Dialog.Description>
            </div>
            <Dialog.Close className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-paper-deep" aria-label="Close">
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <form
            className="mt-6 grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Field label="Name" error={errors.name} className="sm:col-span-2">
              {(id, describedBy) => <input id={id} aria-describedby={describedBy} aria-invalid={!!errors.name} value={value.name} onChange={(e) => set("name", e.target.value)} className={inputCls(errors.name)} />}
            </Field>
            <Field label="Name in Bangla (optional)">
              {(id) => <input id={id} lang="bn" value={value.nameBn} onChange={(e) => set("nameBn", e.target.value)} className={inputCls()} />}
            </Field>
            <Field label="Area" error={errors.areaId}>
              {(id, describedBy) => (
                <select id={id} aria-describedby={describedBy} value={value.areaId} onChange={(e) => setValue((s) => ({ ...s, areaId: e.target.value, buildingId: "" }))} className={inputCls(errors.areaId)}>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.active ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Building (optional)">
              {(id) => (
                <select id={id} value={value.buildingId} onChange={(e) => set("buildingId", e.target.value)} className={inputCls()}>
                  <option value="">Standalone</option>
                  {areaBuildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                  <option value="new">+ New building…</option>
                </select>
              )}
            </Field>
            {value.buildingId === "new" ? (
              <Field label="New building name" error={errors.newBuildingName}>
                {(id, describedBy) => <input id={id} aria-describedby={describedBy} value={value.newBuildingName} onChange={(e) => set("newBuildingName", e.target.value)} className={inputCls(errors.newBuildingName)} />}
              </Field>
            ) : (
              <Field label="Floor (optional)">
                {(id) => <input id={id} value={value.floor} placeholder="e.g. 3" onChange={(e) => set("floor", e.target.value)} className={inputCls()} />}
              </Field>
            )}
            <Field label="Latitude" error={errors.latitude}>
              {(id, describedBy) => <input id={id} aria-describedby={describedBy} inputMode="decimal" value={value.latitude} placeholder="23.8686" onChange={(e) => set("latitude", e.target.value)} className={inputCls(errors.latitude)} />}
            </Field>
            <Field label="Longitude" error={errors.longitude}>
              {(id, describedBy) => <input id={id} aria-describedby={describedBy} inputMode="decimal" value={value.longitude} placeholder="90.3987" onChange={(e) => set("longitude", e.target.value)} className={inputCls(errors.longitude)} />}
            </Field>
            <Field label="Address (optional)" className="sm:col-span-2">
              {(id) => <input id={id} value={value.address} onChange={(e) => set("address", e.target.value)} className={inputCls()} />}
            </Field>
            <Field label="Phone (optional)">
              {(id) => <input id={id} type="tel" value={value.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls()} />}
            </Field>
            <Field label="Website (optional)" error={errors.website}>
              {(id, describedBy) => <input id={id} aria-describedby={describedBy} value={value.website} onChange={(e) => set("website", e.target.value)} className={inputCls(errors.website)} />}
            </Field>

            <fieldset className="sm:col-span-2">
              <legend className="text-sm font-medium">Categories <span className="font-normal text-ink-muted">(first selected is primary)</span></legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {categories.map((c) => {
                  const idx = value.categoryIds.indexOf(c.id);
                  const on = idx >= 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("categoryIds", on ? value.categoryIds.filter((x) => x !== c.id) : [...value.categoryIds, c.id])}
                      className={cn("rounded-full border px-3 py-1.5 text-[13px]", on ? "border-ink bg-ink text-surface" : "border-line text-ink-soft hover:border-line-strong")}
                    >
                      {c.emoji} {c.name}
                      {idx === 0 && <span className="ml-1 opacity-70">· primary</span>}
                    </button>
                  );
                })}
              </div>
              {errors.categoryIds && <p className="mt-1.5 text-sm text-tomato-deep">{errors.categoryIds}</p>}
            </fieldset>

            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={value.active} onChange={(e) => set("active", e.target.checked)} className="size-4 accent-[var(--tomato-deep)]" />
              Active (shown on the map and counted in progress)
            </label>

            {formError && (
              <p role="alert" className="rounded-xl bg-tomato-soft px-3.5 py-2.5 text-sm text-tomato-deep sm:col-span-2">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Dialog.Close className="rounded-full px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-deep">Cancel</Dialog.Close>
              <button type="submit" disabled={pending} className="flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-surface hover:bg-ink-soft disabled:opacity-70">
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {initial ? "Save changes" : "Add restaurant"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputCls = (error?: string) =>
  cn("mt-1.5 h-11 w-full rounded-xl border bg-surface px-3 text-sm hover:border-line-strong", error ? "border-tomato" : "border-line");

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children(id, error ? errorId : undefined)}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-tomato-deep">
          {error}
        </p>
      )}
    </div>
  );
}
