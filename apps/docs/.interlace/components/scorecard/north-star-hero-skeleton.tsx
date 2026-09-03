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
 * Shape-matched skeleton for {@link ./north-star-hero.tsx}. Mirrors padding,
 * gaps, and element heights so the swap-in is zero-CLS.
 *
 * Pure presentational, no data dependencies. Wrap the matching async section
 * in `<Suspense fallback={<NorthStarHeroSkeleton />}>`.
 */
export function NorthStarHeroSkeleton({
  className,
  ...rest
}: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="north-star-hero-skeleton"
      aria-busy="true"
      aria-label="Loading North Star"
      className={cn(
        "relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border bg-card px-6 py-12 text-center shadow-sm",
        className,
      )}
      {...rest}
    >
      <Skeleton className="h-3 w-24" />

      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-16 w-64 sm:h-20 sm:w-72" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Skeleton className="h-12 w-[360px] max-w-full" />

      <Skeleton className="h-4 w-80 max-w-full" />
      <Skeleton className="h-4 w-64 max-w-full" />

      <Skeleton className="h-3 w-48" />
    </section>
  );
}
