/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
import * as React from "react";
import { cn } from "../../lib/utils";
import type { RatchetAnomalyRow, RatchetTrendRow } from "./types";

export interface MomentumPanelProps extends React.ComponentProps<"section"> {
  /** Rows from `v_ratchet_trends`. */
  trends: ReadonlyArray<RatchetTrendRow>;
  /** Rows from `v_ratchet_anomalies` (already filtered to recent / interesting). */
  anomalies?: ReadonlyArray<RatchetAnomalyRow>;
  /** Map of kind → display label (for human-readable rendering). */
  labelFor?: (kind: string) => string;
}

/**
 * Three columns:
 *
 *   🔥 Rising  ─ which ratchets are gaining momentum (7d-SMA > 30d-SMA × 1.05)
 *   💤 Cooling ─ which ratchets are slowing (7d-SMA < 30d-SMA × 0.95)
 *   ⚡ Anomalies ─ today's z-score spikes / stalls vs 30-day distribution
 *
 * Per the vision (00-vision.md § 4): this is the motivation-engine section.
 * Every line here answers "am I on track?" / "what should I celebrate?" /
 * "where's the momentum?" / "is something off?".
 */
export function MomentumPanel({
  trends,
  anomalies,
  labelFor,
  className,
  ...rest
}: MomentumPanelProps) {
  const rising = trends.filter((t) => t.trend === "rising");
  const cooling = trends.filter((t) => t.trend === "cooling");
  const spikes = (anomalies ?? []).filter(
    (a) => a.flag === "spike" || a.flag === "stall",
  );

  const label = (kind: string) => labelFor?.(kind) ?? kind;

  return (
    <section
      data-slot="momentum-panel"
      aria-label="Momentum right now"
      className={cn(
        "flex flex-col gap-4 rounded-xl border bg-card p-5",
        className,
      )}
      {...rest}
    >
      <header>
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Momentum right now
        </h3>
      </header>

      <div className="grid gap-6 sm:grid-cols-3">
        <MomentumColumn
          title="Rising"
          glyph="🔥"
          empty="Nothing rising right now."
          rows={rising.map((t) => ({
            kind: t.kind,
            label: label(t.kind),
            value: t.momentum_pct,
            unit: "%",
          }))}
          tone="text-emerald-700 dark:text-emerald-400"
        />

        <MomentumColumn
          title="Cooling"
          glyph="💤"
          empty="Nothing cooling — keep going."
          rows={cooling.map((t) => ({
            kind: t.kind,
            label: label(t.kind),
            value: t.momentum_pct,
            unit: "%",
          }))}
          tone="text-amber-800 dark:text-amber-400"
        />

        <MomentumColumn
          title="Anomalies"
          glyph="⚡"
          empty="No spikes or stalls in the last 30 days."
          rows={spikes.map((a) => ({
            kind: a.kind,
            label: label(a.kind),
            value: a.z_score,
            unit: "σ",
            flag: a.flag,
          }))}
          tone="text-foreground/80"
        />
      </div>
    </section>
  );
}

interface MomentumColumnRow {
  kind: string;
  label: string;
  value: number | null;
  unit: string;
  flag?: string;
}

function MomentumColumn({
  title,
  glyph,
  empty,
  rows,
  tone,
}: {
  title: string;
  glyph: string;
  empty: string;
  rows: ReadonlyArray<MomentumColumnRow>;
  tone: string;
}) {
  return (
    <div data-slot="momentum-column">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <span aria-hidden className="mr-1">
          {glyph}
        </span>
        {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <li
              key={`${r.kind}-${r.flag ?? ""}`}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <span className="truncate">{r.label}</span>
              <span className={cn("flex-none font-mono font-medium", tone)}>
                {r.value != null
                  ? `${Math.round(r.value)}${r.unit}`
                  : r.flag ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
