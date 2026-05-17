/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import * as React from "react";
import { cn } from "../../lib/utils";
import { RatchetCard } from "./ratchet-card";
import type {
  Bucket,
  RatchetBreakdownRow,
  RatchetDeltaRow,
  RatchetTrendRow,
} from "./types";

export interface RatchetGridProps extends React.ComponentProps<"section"> {
  /** Rows from `v_ratchet_breakdown` for the bucket. */
  rows: ReadonlyArray<RatchetBreakdownRow>;
  /** Optional delta rows keyed by kind. */
  deltas?: ReadonlyArray<RatchetDeltaRow>;
  /** Optional trend rows keyed by kind. */
  trends?: ReadonlyArray<RatchetTrendRow>;
  /** Optional history series keyed by kind (oldest first). */
  histories?: Record<string, ReadonlyArray<number>>;
  /** Render an icon for a given kind. Consumer maps `kind` → React node. */
  iconFor?: (kind: string) => React.ReactNode;
  /** Bucket heading style. */
  bucket: Bucket;
  /** Optional override for the title. Defaults to the bucket name. */
  title?: string;
  /** Optional caption sentence beneath the title. */
  caption?: string;
}

const bucketTitle: Record<Bucket, string> = {
  contributions: "Contributions",
  engagement: "Engagement",
  north_star: "North Star",
};

const bucketCaption: Record<Bucket, string> = {
  contributions: "What we ship to the world.",
  engagement: "How the world responds.",
  north_star: "The single number that grows.",
};

/**
 * Grid of `<RatchetCard>` rows for a single bucket. Sorts by display_order,
 * caps wide at 3 columns. Accepts optional deltas / trends / histories which
 * are looked up by kind.
 */
export function RatchetGrid({
  rows,
  deltas,
  trends,
  histories,
  iconFor,
  bucket,
  title,
  caption,
  className,
  ...rest
}: RatchetGridProps) {
  const sorted = React.useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          a.display_order - b.display_order || a.kind.localeCompare(b.kind),
      ),
    [rows],
  );

  const deltasByKind = React.useMemo(
    () => new Map((deltas ?? []).map((d) => [d.kind, d])),
    [deltas],
  );

  const trendsByKind = React.useMemo(
    () => new Map((trends ?? []).map((t) => [t.kind, t])),
    [trends],
  );

  return (
    <section
      data-slot="ratchet-grid"
      data-bucket={bucket}
      className={cn("flex flex-col gap-4", className)}
      {...rest}
    >
      <header className="flex flex-col gap-1">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {title ?? bucketTitle[bucket]}
        </h3>
        {(caption ?? bucketCaption[bucket]) && (
          <p className="text-sm text-muted-foreground">
            {caption ?? bucketCaption[bucket]}
          </p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((row) => (
          <RatchetCard
            key={row.kind}
            row={row}
            delta={deltasByKind.get(row.kind) ?? null}
            trend={trendsByKind.get(row.kind) ?? null}
            history={histories?.[row.kind]}
            icon={iconFor?.(row.kind)}
          />
        ))}
      </div>
    </section>
  );
}
