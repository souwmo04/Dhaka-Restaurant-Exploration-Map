import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Friendly empty/error state used across lists, panels and pages. */
export function StateMessage({
  icon,
  title,
  children,
  action,
  tone = "neutral",
  className,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "error";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)} role={tone === "error" ? "alert" : undefined}>
      {icon && (
        <div
          className={cn(
            "grid size-12 place-items-center rounded-full",
            tone === "error" ? "bg-tomato-soft text-tomato-deep" : "bg-paper-deep text-ink-soft",
          )}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <h3 className="mt-4 font-display text-lg font-semibold text-ink">{title}</h3>
      {children && <div className="mt-1.5 max-w-xs text-sm text-ink-soft">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
