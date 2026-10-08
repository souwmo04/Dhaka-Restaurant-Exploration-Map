"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, LayoutDashboard, Map } from "lucide-react";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./AccountMenu";

const NAV = [
  { href: "/", label: "Map", icon: Map, match: (p: string) => p === "/" || p.startsWith("/explore") },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p.startsWith("/dashboard") },
  { href: "/favorites", label: "Favorites", icon: Heart, match: (p: string) => p.startsWith("/favorites") },
];

/** Top bar. `search` renders in the centre slot on wide screens (the explore page passes its search box). */
export function AppHeader({ search }: { search?: ReactNode }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 flex h-[var(--header-h)] items-center gap-3 border-b border-line bg-surface/92 px-3 backdrop-blur-md sm:px-5">
      <Link href="/" className="flex shrink-0 items-center gap-2 rounded-lg" aria-label={`${siteConfig.name} home`}>
        <BrandMark />
        <span className="hidden font-display text-[1.35rem] font-semibold tracking-tight sm:inline">
          {siteConfig.name}
        </span>
      </Link>

      <div className="flex min-w-0 flex-1 justify-center">{search}</div>

      <nav aria-label="Main" className="flex items-center gap-0.5">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm font-medium transition-colors md:px-3.5",
                active ? "bg-ink text-surface" : "text-ink-soft hover:bg-paper-deep hover:text-ink",
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
              <span className="sr-only md:not-sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>

      <AccountMenu />
    </header>
  );
}
