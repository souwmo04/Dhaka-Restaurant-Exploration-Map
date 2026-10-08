"use client";

import { ArrowLeft, Building2, ExternalLink, Globe, MapPin, Phone, Star, X } from "lucide-react";
import { useCatalog } from "@/components/providers/CatalogProvider";
import { floorLabel, googleMapsUrl, openStreetMapUrl, websiteHref, websiteLabel } from "@/lib/restaurants/format";
import type { Restaurant } from "@/types/domain";
import { CategoryLabel } from "./CategoryLabel";
import { VisitControls } from "./VisitControls";

export function RestaurantPanel({
  restaurant,
  onClose,
  onBack,
  backLabel,
  headingId,
}: {
  restaurant: Restaurant;
  onClose: () => void;
  onBack?: () => void;
  backLabel?: string;
  headingId: string;
}) {
  const { buildingById, areaById } = useCatalog();
  const building = restaurant.buildingId ? buildingById.get(restaurant.buildingId) : null;
  const area = areaById.get(restaurant.areaId);
  const floor = floorLabel(restaurant.floor);
  const address = restaurant.address ?? building?.address;

  return (
    <article aria-labelledby={headingId} className="flex flex-col">
      <div className="flex items-center justify-between gap-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 flex min-w-0 items-center gap-1 rounded-full px-2 py-1.5 text-sm font-medium text-ink-soft hover:bg-paper-deep hover:text-ink"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{backLabel ?? "Back"}</span>
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-deep hover:text-ink"
          aria-label="Close details"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      {(building || floor) && (
        <p className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-ink-soft">
          <Building2 className="size-3.5" aria-hidden />
          {[building?.name, floor].filter(Boolean).join(" · ")}
        </p>
      )}
      <h2 id={headingId} className="mt-1 font-display text-[1.75rem] font-semibold leading-tight tracking-tight">
        {restaurant.name}
      </h2>
      {restaurant.nameBn && (
        <p className="mt-0.5 text-[15px] text-ink-soft" lang="bn">
          {restaurant.nameBn}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
        <CategoryLabel restaurant={restaurant} max={3} />
        {restaurant.rating !== null && (
          <span className="flex items-center gap-1 font-medium">
            <Star className="size-4 fill-gold text-gold" aria-hidden />
            {restaurant.rating.toFixed(1)}
            {restaurant.ratingCount !== null && (
              <span className="font-normal text-ink-muted">({restaurant.ratingCount.toLocaleString("en-US")})</span>
            )}
          </span>
        )}
        {area && (
          <span className="flex items-center gap-1 text-ink-soft">
            <MapPin className="size-3.5" aria-hidden />
            {area.name}
          </span>
        )}
      </div>

      <div className="mt-5">
        <VisitControls restaurant={restaurant} />
      </div>

      <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
        {address && (
          <div className="flex gap-3">
            <dt className="sr-only">Address</dt>
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
            <dd className="text-ink">{address}</dd>
          </div>
        )}
        {restaurant.phone && (
          <div className="flex gap-3">
            <dt className="sr-only">Phone</dt>
            <Phone className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
            <dd>
              <a href={`tel:${restaurant.phone.split(/[;,]/)[0].replace(/\s+/g, "")}`} className="text-ink underline-offset-2 hover:underline">
                {restaurant.phone.split(/[;,]/)[0]}
              </a>
            </dd>
          </div>
        )}
        {restaurant.website && (
          <div className="flex gap-3">
            <dt className="sr-only">Website</dt>
            <Globe className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
            <dd className="min-w-0">
              <a
                href={websiteHref(restaurant.website)}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-ink underline-offset-2 hover:underline"
              >
                {websiteLabel(restaurant.website)}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <a
          href={googleMapsUrl(restaurant)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-sm font-medium hover:border-line-strong hover:bg-paper"
        >
          Open in Maps <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(opens Google Maps in a new tab)</span>
        </a>
        <a
          href={openStreetMapUrl(restaurant.position, restaurant.osmId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-sm font-medium hover:border-line-strong hover:bg-paper"
        >
          OpenStreetMap <ExternalLink className="size-3.5" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>

      {restaurant.source === "osm" && (
        <p className="mt-4 text-xs text-ink-muted">
          Listing from OpenStreetMap. Something out of date?{" "}
          <a
            href={openStreetMapUrl(restaurant.position, restaurant.osmId)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            Suggest an edit
          </a>
          .
        </p>
      )}
    </article>
  );
}
