"use client";

import * as Popover from "@radix-ui/react-popover";
import { LogOut, Shield, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/ui/Toaster";

export function AccountMenu() {
  const { status, user, isAdmin, signOut } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);

  if (status === "unavailable") return null;
  if (status === "loading") return <div className="size-9 shrink-0 animate-pulse rounded-full bg-paper-deep" aria-hidden />;

  if (!user) {
    return (
      <Link
        href="/login"
        className="shrink-0 rounded-full bg-ink px-3.5 py-2 text-sm font-medium text-surface transition-colors hover:bg-ink-soft"
      >
        Sign in
      </Link>
    );
  }

  const initials = user.displayName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className="grid size-9 shrink-0 place-items-center rounded-full bg-tomato-deep text-sm font-semibold text-white ring-2 ring-surface"
        aria-label={`Account menu for ${user.displayName}`}
      >
        {initials || <UserRound className="size-4" aria-hidden />}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 rounded-2xl border border-line bg-surface p-2 shadow-panel"
        >
          <div className="px-3 py-2">
            <p className="truncate font-medium">{user.displayName}</p>
            {user.email && <p className="truncate text-sm text-ink-muted">{user.email}</p>}
          </div>
          <div className="my-1 h-px bg-line" />
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-paper-deep"
            >
              <Shield className="size-4" aria-hidden /> Manage restaurants
            </Link>
          )}
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              toast({ tone: "success", title: "Signed out" });
              router.refresh();
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-paper-deep"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
