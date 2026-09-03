/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import * as React from "react";
import { cn } from "../../lib/utils";
import { Skeleton } from "../ui/skeleton";
import { RatchetCardSkeleton } from "./ratchet-card-skeleton";
import type { Bucket } from "./types";

export interface RatchetGridSkeletonProps extends React.ComponentProps<"section"> {
  bucket: Bucket;
  /** How many card placeholders to render. Match the typical card count to keep
   * the page height stable. Defaults to 6 (2 sm rows × 3 lg cols). */
  cardCount?: number;
}

/**
 * Shape-matched skeleton for {@link ./ratchet-grid.tsx}. Renders `cardCount`
 * {@link RatchetCardSkeleton}s under a placeholder header.
 */
export function RatchetGridSkeleton({
  bucket,
  cardCount = 6,
  className,
  ...rest
}: RatchetGridSkeletonProps) {
  return (
    <section
      data-slot="ratchet-grid-skeleton"
      data-bucket={bucket}
      aria-busy="true"
      aria-label={`Loading ${bucket}`}
      className={cn("flex flex-col gap-4", className)}
      {...rest}
    >
      <header className="flex flex-col gap-1">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-64" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cardCount }).map((_, i) => (
          <RatchetCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
