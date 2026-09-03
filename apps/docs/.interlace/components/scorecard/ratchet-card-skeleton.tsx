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
 * Shape-matched skeleton for a single {@link ./ratchet-card.tsx}. Same outer
 * frame (rounded-xl border, p-5, gap-3) so when the real card slides in
 * nothing reflows.
 */
export function RatchetCardSkeleton({
  className,
  ...rest
}: React.ComponentProps<"article">) {
  return (
    <article
      data-slot="ratchet-card-skeleton"
      aria-busy="true"
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm",
        className,
      )}
      {...rest}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-12" />
      </header>

      <div className="flex items-baseline gap-3">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-10" />
        <Skeleton className="h-3 w-12" />
      </div>

      <Skeleton className="h-8 w-full" />

      <Skeleton className="h-3 w-3/4" />
      <Skeleton className="h-3 w-1/2" />

      <Skeleton className="mt-auto h-3 w-14" />
    </article>
  );
}
