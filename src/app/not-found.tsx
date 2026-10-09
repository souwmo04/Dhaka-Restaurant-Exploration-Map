import { MapPinOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { StateMessage } from "@/components/feedback/States";
import { AppHeader } from "@/components/layout/AppHeader";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6">
        <StateMessage
          icon={<MapPinOff className="size-6" />}
          title="This page isn't on the map"
          action={
            <Link href="/" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-surface">
              Back to the map
            </Link>
          }
        >
          The link may be mistyped, or the area isn&apos;t explorable yet.
        </StateMessage>
      </main>
    </div>
  );
}
