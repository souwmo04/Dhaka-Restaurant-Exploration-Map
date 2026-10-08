import { DatabaseZap } from "lucide-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { siteConfig } from "@/config/site";
import { StateMessage } from "./States";

/** Full-page state when the restaurant catalog can't be loaded at all. */
export function CatalogUnavailable() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper p-6">
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-2 shadow-panel">
        <div className="flex items-center gap-2 px-4 pt-4">
          <BrandMark className="size-7" />
          <span className="font-display text-lg font-semibold">{siteConfig.name}</span>
        </div>
        <StateMessage
          tone="error"
          icon={<DatabaseZap className="size-6" />}
          title="Restaurant data is unavailable"
          action={
            <a href="" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface hover:bg-ink-soft">
              Reload
            </a>
          }
        >
          We couldn&apos;t reach the restaurant database just now. Your visits are safe — please try again in a moment.
        </StateMessage>
      </div>
    </main>
  );
}
