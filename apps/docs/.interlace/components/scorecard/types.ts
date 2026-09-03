/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
// Shared types for the scorecard surface. Mirror the Supabase view rows
// returned by `lib/scorecard-data.ts`. Components stay presentational and
// accept these shapes directly so they can be exercised in Storybook with
// hand-rolled fixtures.

export type Bucket = "contributions" | "engagement" | "north_star";

export type TrendDirection = "rising" | "cooling" | "flat" | "unknown";

export type AnomalyFlag = "spike" | "warming" | "normal" | "cooling" | "stall";

/** Row of `v_ratchet_breakdown` — one per ratchet kind. */
export interface RatchetBreakdownRow {
  kind: string;
  bucket: Bucket;
  current_value: number;
  display_label: string;
  display_unit: string | null;
  display_icon: string | null;
  display_order: number;
  description: string | null;
  provenance_url: string | null;
  bucket_total: number;
  north_star_total: number;
  pct_of_bucket: number;
  pct_of_total: number;
  updated_at: string;
}

/** Row of `v_ratchet_deltas`. */
export interface RatchetDeltaRow {
  kind: string;
  bucket: Bucket;
  current_value: number;
  delta_7d: number;
  delta_30d: number;
  growth_pct_30d: number | null;
  display_label: string;
}

/** Row of `v_ratchet_trends`. */
export interface RatchetTrendRow {
  kind: string;
  observed_on: string;
  sma_7: number;
  sma_30: number;
  trend: TrendDirection;
  momentum_pct: number | null;
}

/** Row of `v_ratchet_anomalies` — filtered to current spike/stall. */
export interface RatchetAnomalyRow {
  kind: string;
  observed_on: string;
  daily_delta: number;
  mu_30: number | null;
  sigma_30: number | null;
  z_score: number;
  flag: AnomalyFlag;
}

/** Row of `v_north_star_history` (or per-kind history). */
export interface RatchetHistoryPoint {
  observed_on: string;
  value: number;
}
