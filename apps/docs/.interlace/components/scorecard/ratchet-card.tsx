/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import * as React from "react";
import { cn } from "../../lib/utils";
import { Sparkline } from "./sparkline";
import type {
  RatchetBreakdownRow,
  RatchetDeltaRow,
  RatchetTrendRow,
} from "./types";

export interface RatchetCardProps extends React.ComponentProps<"article"> {
  row: RatchetBreakdownRow;
  /** Optional delta row matched by kind. Renders the "+X / 30d" badge. */
  delta?: RatchetDeltaRow | null;
  /** Optional trend row — renders ▲ / ▼ / • signal in the corner. */
  trend?: RatchetTrendRow | null;
  /** Optional sparkline series, oldest first (~30–90 points). */
  history?: ReadonlyArray<number>;
  /** Icon to render inline with the label (consumer passes a lucide-react icon node). */
  icon?: React.ReactNode;
}

const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatValue(n: number): string {
  return n >= 10_000 ? compactFormat.format(n) : numberFormat.format(n);
}

function formatDelta(n: number): string {
  const abs = Math.abs(n);
  const formatted =
    abs >= 10_000 ? compactFormat.format(abs) : numberFormat.format(abs);
  if (n > 0) return `▲ +${formatted}`;
  if (n < 0) return `▼ -${formatted}`;
  return `• 0`;
}

function deltaToneClass(n: number): string {
  if (n > 0) return "text-emerald-700 dark:text-emerald-400";
  if (n < 0) return "text-amber-800 dark:text-amber-400";
  return "text-muted-foreground";
}

function trendBadge(trend?: RatchetTrendRow | null): React.ReactNode {
  if (!trend || trend.trend === "unknown") return null;
  const tone =
    trend.trend === "rising"
      ? "text-emerald-700 dark:text-emerald-400"
      : trend.trend === "cooling"
        ? "text-amber-800 dark:text-amber-400"
        : "text-muted-foreground";
  const glyph =
    trend.trend === "rising" ? "🔥" : trend.trend === "cooling" ? "💤" : "•";
  const pct =
    trend.momentum_pct != null ? ` ${Math.round(trend.momentum_pct)}%` : "";
  return (
    <span
      data-slot="ratchet-card-trend"
      className={cn("text-xs font-medium", tone)}
      title={`7-day vs 30-day SMA crossover: ${trend.trend}`}
    >
      {glyph}
      {pct}
    </span>
  );
}

/**
 * One card per ratchet kind. Shape: icon + label across the top, big value,
 * delta badge, optional sparkline, description, provenance link.
 *
 * Pure presentational — accepts data via props so it renders identically in
 * Storybook fixtures and Server Component pages.
 */
export function RatchetCard({
  row,
  delta,
  trend,
  history,
  icon,
  className,
  ...rest
}: RatchetCardProps) {
  return (
    <article
      data-slot="ratchet-card"
      data-kind={row.kind}
      data-bucket={row.bucket}
      className={cn(
        // Layout
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm",
        // Subtle hover lift — reduced-motion users get no transform.
        "motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-200 motion-safe:ease-out",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-foreground/15 motion-reduce:hover:shadow-md",
        // Focus-within ring for keyboard users tabbing through the provenance link.
        "focus-within:ring-2 focus-within:ring-ring/40 focus-within:ring-offset-2 focus-within:ring-offset-background",
        className,
      )}
      {...rest}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon ? (
            <span aria-hidden className="text-foreground/80">
              {icon}
            </span>
          ) : null}
          <span className="text-sm font-medium">{row.display_label}</span>
        </div>
        {trendBadge(trend)}
      </header>

      <div className="flex items-baseline gap-3">
        <span
          data-slot="ratchet-card-value"
          className={cn(
            "font-mono text-3xl font-semibold tabular-nums tracking-tight",
            // Subtle text-shadow / color shift on hover, reduced-motion safe.
            "motion-safe:transition-colors motion-safe:duration-200",
            "group-hover:text-foreground",
          )}
        >
          {formatValue(row.current_value)}
        </span>
        {row.display_unit && (
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {row.display_unit}
          </span>
        )}
      </div>

      {delta && (
        <div className="flex items-center gap-2 text-sm">
          <span className={cn("font-medium", deltaToneClass(delta.delta_30d))}>
            {formatDelta(delta.delta_30d)}
          </span>
          {delta.growth_pct_30d != null && (
            <span className="text-muted-foreground">
              ({delta.growth_pct_30d > 0 ? "+" : ""}
              {delta.growth_pct_30d}%)
            </span>
          )}
          <span className="text-xs text-muted-foreground">/ 30d</span>
        </div>
      )}

      {history && history.length >= 2 && (
        <Sparkline
          data={history}
          className="text-foreground/40"
          filled
          aria-label={`${row.display_label} trend`}
        />
      )}

      {row.description && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {row.description}
        </p>
      )}

      {row.provenance_url && (
        <a
          data-slot="ratchet-card-provenance"
          href={row.provenance_url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "mt-auto inline-flex items-center gap-1 self-start text-xs font-medium",
            "text-muted-foreground underline-offset-4",
            "motion-safe:transition-colors motion-safe:duration-150",
            "hover:text-foreground hover:underline",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:rounded-sm",
          )}
        >
          <span>source</span>
          <span
            aria-hidden
            className="motion-safe:transition-transform motion-safe:duration-150 group-hover:translate-x-0.5"
          >
            ↗
          </span>
        </a>
      )}
    </article>
  );
}
