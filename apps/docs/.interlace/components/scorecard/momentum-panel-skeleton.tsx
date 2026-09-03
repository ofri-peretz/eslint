/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import * as React from "react";
import { cn } from "../../lib/utils";
import { Skeleton } from "../ui/skeleton";

/**
 * Shape-matched skeleton for {@link ./momentum-panel.tsx} — three columns,
 * each with a small heading + 3 row placeholders.
 */
export function MomentumPanelSkeleton({
  className,
  ...rest
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="momentum-panel-skeleton"
      aria-busy="true"
      aria-label="Loading momentum"
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5",
        className,
      )}
      {...rest}
    >
      <header>
        <Skeleton className="h-3 w-40" />
      </header>

      <div className="grid gap-6 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, col) => (
          <div key={col} data-slot="momentum-column-skeleton">
            <Skeleton className="mb-2 h-3 w-20" />
            <ul className="flex flex-col gap-1.5">
              {Array.from({ length: 3 }).map((__, row) => (
                <li
                  key={row}
                  className="flex items-baseline justify-between gap-2"
                >
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-10" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
