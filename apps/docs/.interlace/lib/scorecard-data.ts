/**
 * AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.
 * Source: apps/interlace-docs-baseline/ in the agents repo.
 * Edit there, then run `npm run sync` to redistribute.
 * Local edits will be overwritten on next sync (or refused without --force).
 */
// Server-side Supabase fetchers for the scorecard surface. ONE place that
// knows about `@supabase/supabase-js`; the React components stay
// presentational and accept data via props.
//
// Consumers (Next.js Server Components, etc.) call these:
//
//   import { createScorecardClient, getRatchetBreakdown } from
//     "@interlace/docs-baseline/lib/scorecard-data";
//
//   const sb = createScorecardClient();
//   const breakdown = await getRatchetBreakdown(sb);
//
// SECURITY:
//   - Uses the ANON key (server-side env var, never NEXT_PUBLIC_*). RLS on
//     the underlying tables denies anon writes; views are the only public
//     read surface.
//   - `import "server-only"` makes any client component import fail the
//     build, as a leak guard for the anon key.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  RatchetAnomalyRow,
  RatchetBreakdownRow,
  RatchetDeltaRow,
  RatchetHistoryPoint,
  RatchetTrendRow,
} from "../components/scorecard/types";

export type ScorecardClient = SupabaseClient;

export interface CreateScorecardClientOptions {
  /** Override the URL (defaults to `process.env.SUPABASE_URL`). */
  url?: string;
  /** Override the key (defaults to `process.env.SUPABASE_ANON_KEY`). */
  anonKey?: string;
}

export function createScorecardClient(
  opts: CreateScorecardClientOptions = {},
): ScorecardClient {
  const url = opts.url ?? process.env.SUPABASE_URL;
  const key = opts.anonKey ?? process.env.SUPABASE_ANON_KEY;
  if (!url) throw new Error("createScorecardClient: SUPABASE_URL is not set");
  if (!key)
    throw new Error("createScorecardClient: SUPABASE_ANON_KEY is not set");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function selectAll<T>(
  client: ScorecardClient,
  view: string,
): Promise<T[]> {
  const { data, error } = await client.from(view).select("*");
  if (error) throw new Error(`${view}: ${error.message}`);
  return (data as T[] | null) ?? [];
}

export async function getRatchetBreakdown(
  client: ScorecardClient,
): Promise<RatchetBreakdownRow[]> {
  return selectAll<RatchetBreakdownRow>(client, "v_ratchet_breakdown");
}

export async function getRatchetDeltas(
  client: ScorecardClient,
): Promise<RatchetDeltaRow[]> {
  return selectAll<RatchetDeltaRow>(client, "v_ratchet_deltas");
}

export async function getRatchetTrends(
  client: ScorecardClient,
): Promise<RatchetTrendRow[]> {
  return selectAll<RatchetTrendRow>(client, "v_ratchet_trends");
}

export async function getRatchetAnomalies(
  client: ScorecardClient,
  options: { sinceDays?: number } = {},
): Promise<RatchetAnomalyRow[]> {
  const since = options.sinceDays ?? 30;
  const cutoff = new Date(Date.now() - since * 86400000)
    .toISOString()
    .slice(0, 10);
  const { data, error } = await client
    .from("v_ratchet_anomalies")
    .select("*")
    .gte("observed_on", cutoff)
    .order("observed_on", { ascending: false });
  if (error) throw new Error(`v_ratchet_anomalies: ${error.message}`);
  return (data as RatchetAnomalyRow[] | null) ?? [];
}

export async function getNorthStarHistory(
  client: ScorecardClient,
): Promise<RatchetHistoryPoint[]> {
  const { data, error } = await client
    .from("v_north_star_history")
    .select("observed_on, north_star_total")
    .order("observed_on", { ascending: true });
  if (error) throw new Error(`v_north_star_history: ${error.message}`);
  return (
    (data as Array<{ observed_on: string; north_star_total: number }> | null)
      ?.map((r) => ({ observed_on: r.observed_on, value: r.north_star_total }))
      ?? []
  );
}

export async function getRatchetHistoryForKind(
  client: ScorecardClient,
  kind: string,
  period: "day" | "week" | "month" | "quarter" | "year" = "day",
): Promise<RatchetHistoryPoint[]> {
  const { data, error } = await client.rpc("fn_ratchet_period_history", {
    p_kind: kind,
    p_period: period,
  });
  if (error)
    throw new Error(`fn_ratchet_period_history(${kind}, ${period}): ${error.message}`);
  return (
    (data as Array<{ period_start: string; current_value: number }> | null)
      ?.map((r) => ({ observed_on: r.period_start, value: r.current_value }))
      ?? []
  );
}

export interface ScorecardSnapshot {
  breakdown: RatchetBreakdownRow[];
  deltas: RatchetDeltaRow[];
  trends: RatchetTrendRow[];
  anomalies: RatchetAnomalyRow[];
  northStarHistory: RatchetHistoryPoint[];
}

/**
 * Single-call convenience: fetch everything the scorecard page needs in
 * parallel. Use this as the only call from a Next.js Server Component:
 *
 *   const data = await loadScorecardSnapshot(createScorecardClient());
 */
export async function loadScorecardSnapshot(
  client: ScorecardClient,
): Promise<ScorecardSnapshot> {
  const [breakdown, deltas, trends, anomalies, northStarHistory] =
    await Promise.all([
      getRatchetBreakdown(client),
      getRatchetDeltas(client),
      getRatchetTrends(client),
      getRatchetAnomalies(client),
      getNorthStarHistory(client),
    ]);
  return { breakdown, deltas, trends, anomalies, northStarHistory };
}
