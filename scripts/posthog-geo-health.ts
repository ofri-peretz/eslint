#!/usr/bin/env -S npx tsx
/**
 * posthog-geo-health — fails when an Interlace site's pageviews arrive in
 * PostHog without a location.
 *
 * Why this exists
 * ───────────────
 * On 2026-08-22 the docs site switched posthog-js to `cookieless_mode`. In
 * that mode PostHog strips `$ip` before GeoIP enrichment runs, so from then on
 * every eslint.interlace.tools pageview had no IP and no location, 0% against
 * 100% on every other host in the same project. Nothing failed: events kept
 * flowing, dashboards kept drawing, and the one signal for which organisations
 * read the docs was gone for eight weeks. A lock test pins that config line,
 * but only production can say whether geo is actually arriving, whatever
 * removes it next time (a project setting, a proxy that drops
 * X-Forwarded-For, an SDK default).
 *
 * Wire-up:
 *   - Run locally:  POSTHOG_API_KEY=phx_... node scripts/posthog-geo-health.ts
 *                   (Node 24 strips the types; no tsx, no install)
 *   - CI:           `.github/workflows/posthog-geo-health.yml` (daily)
 *
 * Needs a PostHog personal API key with `query:read`, the existing
 * `POSTHOG_API_KEY` repo secret. Exits 2 when a host is below the threshold
 * (a measured gap), 1 when the check itself could not run. `geoGaps` is exported for
 * `scripts/__tests__/posthog-geo-health.test.ts`.
 */

const PROJECT_ID = 428927;
/** Share of pageviews that must carry `$geoip_country_code`. */
export const THRESHOLD = 0.9;
/** Below this many pageviews in the window, a host is too quiet to judge. */
export const MIN_PAGEVIEWS = 10;

export interface HostRow {
  host: string;
  pageviews: number;
  withGeo: number;
}

/** Our production hosts. Anything else (e.g. `*.vercel.app`) is an alias. */
export function isInterlaceHost(host: string): boolean {
  return /(^|\.)interlace\.tools$/.test(host) || host === 'ofriperetz.dev';
}

/** Interlace hosts with enough traffic to judge and too little geo. */
export function geoGaps(rows: HostRow[]): HostRow[] {
  return rows.filter(
    (r) =>
      isInterlaceHost(r.host) &&
      r.pageviews >= MIN_PAGEVIEWS &&
      r.withGeo / r.pageviews < THRESHOLD,
  );
}

const QUERY = `
  select properties.$host as host, count() as pageviews,
         countIf(properties.$geoip_country_code is not null) as with_geo
  from events
  where event = '$pageview' and timestamp > now() - interval 24 hour
  group by host
  order by pageviews desc`;

async function main(): Promise<void> {
  const key = process.env.POSTHOG_API_KEY;
  if (!key) {
    console.error('POSTHOG_API_KEY is not set.');
    process.exit(1);
  }
  const host = process.env.POSTHOG_HOST ?? 'https://us.posthog.com';
  const res = await fetch(`${host}/api/projects/${PROJECT_ID}/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: QUERY } }),
  });
  if (!res.ok) {
    console.error(`PostHog query failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const { results } = (await res.json()) as {
    results: [string | null, number, number][];
  };
  const rows: HostRow[] = results.map(([h, pageviews, withGeo]) => ({
    host: h ?? '(none)',
    pageviews,
    withGeo,
  }));

  for (const r of rows) {
    const pct = ((100 * r.withGeo) / r.pageviews).toFixed(1).padStart(5);
    const tag = isInterlaceHost(r.host) ? '' : '  (not a production host)';
    console.log(
      `  ${pct}% geo  ${String(r.pageviews).padStart(6)} pv  ${r.host}${tag}`,
    );
  }

  const gaps = geoGaps(rows);
  if (gaps.length > 0) {
    console.error(
      `\n${gaps.length} host(s) below ${THRESHOLD * 100}% geo-tagged pageviews over 24h: ${gaps.map((g) => g.host).join(', ')}.`,
    );
    console.error(
      'Check the site for `cookieless_mode`, the project for "Discard client IP data" / GeoIP transformation, and the /ingest proxy for X-Forwarded-For.',
    );
    process.exit(2);
  }
  console.log(`\nAll Interlace hosts at or above ${THRESHOLD * 100}% geo.`);
}

// Only run when invoked directly, so the test can import the helpers.
const invokedDirectly = process.argv[1]?.endsWith('posthog-geo-health.ts');
if (invokedDirectly) {
  void main();
}
