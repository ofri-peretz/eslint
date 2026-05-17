/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import * as React from "react";
import { cn } from "../../lib/utils";
import { Sparkline } from "./sparkline";

export interface NorthStarHeroProps extends React.ComponentProps<"section"> {
  /** The headline value. */
  value: number;
  /** Change vs 30 days ago. Optional. */
  delta30d?: number | null;
  /** Growth % vs 30 days ago. Optional. */
  growthPct30d?: number | null;
  /** When tracking started (ISO date), used in the footer line. */
  since?: string | null;
  /** How many days of history we have. Drives the "N days of receipts" caption. */
  daysOfReceipts?: number | null;
  /** Optional history series to render a subtle sparkline behind the headline. */
  history?: ReadonlyArray<number>;
  /** Override the descriptive line below the number. */
  description?: React.ReactNode;
  /** Display label override ("North Star" is the default). */
  label?: string;
}

const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatBig(n: number): string {
  return n >= 100_000 ? compactFormat.format(n) : numberFormat.format(n);
}

function formatDelta(n: number): string {
  const abs = Math.abs(n);
  const formatted =
    abs >= 10_000 ? compactFormat.format(abs) : numberFormat.format(abs);
  return `${n >= 0 ? "▲ +" : "▼ -"}${formatted}`;
}

function deltaToneClass(n: number | null | undefined): string {
  if (n == null || n === 0) return "text-muted-foreground";
  return n > 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-amber-600 dark:text-amber-400";
}

function formatSince(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * The headline of the scorecard. One huge number + a delta line + a single
 * sentence saying what it represents. Optionally renders a faint sparkline
 * behind / beneath the number to communicate "this grew over time".
 *
 * Per the vision (00-vision.md): the hero earns attention; the breakdown
 * earns trust. Both belong above the fold.
 */
export function NorthStarHero({
  value,
  delta30d = null,
  growthPct30d = null,
  since = null,
  daysOfReceipts = null,
  history,
  description,
  label = "North Star",
  className,
  ...rest
}: NorthStarHeroProps) {
  const sinceLabel = formatSince(since);

  return (
    <section
      data-slot="north-star-hero"
      className={cn(
        "relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border bg-card px-6 py-12 text-center shadow-sm",
        className,
      )}
      {...rest}
    >
      <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      <div className="flex flex-col items-center gap-2">
        <span
          data-slot="north-star-value"
          className="font-mono text-6xl font-bold tabular-nums tracking-tight sm:text-7xl"
        >
          {formatBig(value)}
        </span>

        {(delta30d != null || growthPct30d != null) && (
          <p className="flex items-center gap-2 text-sm">
            {delta30d != null && (
              <span className={cn("font-semibold", deltaToneClass(delta30d))}>
                {formatDelta(delta30d)}
              </span>
            )}
            {growthPct30d != null && (
              <span className="text-muted-foreground">
                ({growthPct30d > 0 ? "+" : ""}
                {growthPct30d}%)
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              in the last 30 days
            </span>
          </p>
        )}
      </div>

      {history && history.length >= 2 && (
        <Sparkline
          data={history}
          width={360}
          height={48}
          className="text-foreground/25"
          filled
          aria-label="North Star over time"
        />
      )}

      {description && (
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {(sinceLabel || daysOfReceipts != null) && (
        <p className="text-xs text-muted-foreground">
          {sinceLabel && <>since {sinceLabel}</>}
          {sinceLabel && daysOfReceipts != null && (
            <span className="mx-2 inline-block">·</span>
          )}
          {daysOfReceipts != null && <>{daysOfReceipts} days of receipts</>}
        </p>
      )}
    </section>
  );
}
