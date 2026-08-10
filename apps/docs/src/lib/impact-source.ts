/**
 * The one place this site learns how many times our packages were downloaded.
 *
 * It used to sum `api.npmjs.org/downloads/point/last-week` over the published
 * plugins and call the result "downloads". ofriperetz.dev, meanwhile, published
 * an all-time cumulative from Supabase, and its /npm page published a trailing
 * 30-day total. Three surfaces, three numbers, three definitions, two sources —
 * all of them honestly labelled inside their own codebase and mutually
 * contradictory to anyone who visited two of them.
 *
 * So downloads are no longer computed here. `v_npm_alltime_ecosystem` is the
 * canonical record, written once a day by ofri-peretz/impact-ingest, and this
 * module only reads it. Adding a fourth surface should mean adding another
 * reader, never another calculation.
 *
 * Deliberately NOT falling back to the npm registry when Supabase is
 * unreachable: a fallback that quietly computes a different metric is exactly
 * the failure being fixed. A missing number is visible; a wrong one is not.
 */

import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';

const REVALIDATE = 3600;

export interface EcosystemDownloads {
  /** Cumulative downloads across every counted package. */
  total: number;
  /** How many packages that total covers. */
  packages: number;
  /**
   * First day any of our packages recorded a download — the start of the
   * window `total` covers, measured rather than assumed. `null` means the
   * backfill hasn't measured it yet, and callers must then omit the "since"
   * qualifier instead of guessing a date.
   */
  since: string | null;
  /** Day the figure was last measured. */
  measuredOn: string | null;
}

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Throws rather than returning zeroes. `unstable_cache` stores whatever
 * resolves, and Vercel's Data Cache outlives the deployment — so a transient
 * blip cached as `0` would survive every redeploy until the tag was purged.
 * A rejected promise is never cached, so the next request just retries.
 */
export const loadEcosystemDownloads = unstable_cache(
  async (): Promise<EcosystemDownloads> => {
    const supabase = client();
    if (!supabase) {
      throw new Error(
        '[impact-source] SUPABASE_URL / SUPABASE_ANON_KEY missing — refusing to cache an empty download total',
      );
    }

    const { data, error } = await supabase
      .from('v_npm_alltime_ecosystem')
      .select(
        'ecosystem_alltime, packages_measured, measured_since, last_measured_on',
      )
      .single();

    if (error || !data) {
      throw new Error(
        `[impact-source] v_npm_alltime_ecosystem: ${error?.message ?? 'no row'}`,
      );
    }

    return {
      total: Number(data.ecosystem_alltime ?? 0),
      packages: Number(data.packages_measured ?? 0),
      since: data.measured_since ?? null,
      measuredOn: data.last_measured_on ?? null,
    };
  },
  ['ecosystem-downloads-alltime'],
  { revalidate: REVALIDATE, tags: ['stats', 'npm', 'ratchet'] },
);

/**
 * Per-package cumulative downloads, keyed by package name — the same figures
 * the ecosystem total is the sum of, so a table of rows and the headline above
 * it can never disagree.
 */
export const loadPackageDownloads = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const supabase = client();
    if (!supabase) {
      throw new Error(
        '[impact-source] SUPABASE_URL / SUPABASE_ANON_KEY missing — refusing to cache empty per-package downloads',
      );
    }

    const { data, error } = await supabase
      .from('npm_alltime_downloads')
      .select('alltime_total, plugins(name)');

    if (error || !data) {
      throw new Error(
        `[impact-source] npm_alltime_downloads: ${error?.message ?? 'no rows'}`,
      );
    }

    const out: Record<string, number> = {};
    for (const row of data as Array<{
      alltime_total: number | null;
      plugins: { name: string } | { name: string }[] | null;
    }>) {
      const rel = Array.isArray(row.plugins) ? row.plugins[0] : row.plugins;
      if (rel?.name) out[rel.name] = Number(row.alltime_total ?? 0);
    }
    return out;
  },
  ['package-downloads-alltime'],
  { revalidate: REVALIDATE, tags: ['stats', 'npm', 'ratchet'] },
);
