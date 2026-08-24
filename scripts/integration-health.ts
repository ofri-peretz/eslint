#!/usr/bin/env -S npx tsx
/**
 * integration-health — probes the live public surface of every Interlace site.
 *
 * Why this exists
 * ───────────────
 * On 2026-08-23 four integration defects were found in one sitting, and none
 * had been caught by tests, CI, or review:
 *
 *   - CSP `report-uri` 404'd from the day the header shipped. Violation
 *     reports went nowhere for weeks; the empty event stream was
 *     indistinguishable from a policy with nothing to report.
 *   - `ds.` and `storybook.` shipped no `X-Frame-Options` at all.
 *   - `/images/*` was pinned `immutable` for a year on URLs that carry no
 *     content hash, so a regenerated OG image could never be evicted.
 *   - Two plugin doc pages 404'd their README for six weeks, across 106 users.
 *
 * Every one was config that read correctly and behaved wrongly. The only
 * thing that found them was asking the live server. So that is what this
 * does — it asserts nothing about the repo, only about production.
 *
 * Deliberately credential-free. Every check runs against public surface, and
 * the CSP probe reads its token out of the site's own response header rather
 * than holding one. Nothing here needs a secret, so nothing here can leak one.
 *
 * Wire-up:
 *   - Run locally:  `npx tsx scripts/integration-health.ts`
 *   - CI:           `.github/workflows/integration-health.yml` (weekly)
 *
 * Exits non-zero if any check fails. Pure assertion helpers are exported for
 * `scripts/__tests__/integration-health.test.ts`, which covers them without
 * touching the network.
 */

/** Sites that must carry the full security-header set. */
export const SITES = [
  'https://eslint.interlace.tools',
  'https://interlace.tools',
  'https://ds.interlace.tools',
  'https://storybook.interlace.tools',
  'https://serverless.interlace.tools',
] as const;

/**
 * Sites whose CSP reports travel through a same-origin `/ingest` proxy.
 *
 * storybook is absent on purpose: its policy ships from a static vercel.json
 * that cannot template a key, so it reports through a
 * `securitypolicyviolation` listener instead. There is no endpoint to probe.
 */
export const REPORT_SITES = SITES.filter(
  (s) => !s.includes('storybook.'),
) as readonly string[];

export const REQUIRED_HEADERS = [
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'strict-transport-security',
  'cross-origin-opener-policy',
  'content-security-policy-report-only',
] as const;

/** A URL may promise `immutable` only if its path carries a content hash. */
export function isContentAddressed(url: string): boolean {
  return url.includes('/_next/static/');
}

/**
 * `immutable` is a promise that a URL's bytes never change. True only for a
 * content-addressed URL, where new bytes mean a new URL. On any other path it
 * makes a release unable to evict what it replaced.
 */
export function cachingIsHonest(
  url: string,
  cacheControl: string | null,
): { ok: boolean; reason?: string } {
  if (!cacheControl?.includes('immutable')) return { ok: true };
  if (isContentAddressed(url)) return { ok: true };
  return {
    ok: false,
    reason: `${url} promises immutable but its URL carries no content hash — a release cannot evict it`,
  };
}

/**
 * Pulls the PostHog project token out of a live CSP header.
 *
 * Returns null for `[SENSITIVE]`, which is not a token but Vercel's
 * substitution for an env var marked Sensitive. `vercel build` cannot read
 * those, so the literal string gets inlined into the bundle and the header.
 * `diagnoseToken` explains it; this just refuses to treat it as a key.
 */
export function tokenFromCsp(csp: string | null): string | null {
  const m = csp?.match(/report-uri\s+\/ingest\/report\/\?token=([\w-]+)/);
  const token = m ? m[1] : null;
  return token && token !== 'SENSITIVE' ? token : null;
}

/**
 * Turns a missing token into an actionable cause.
 *
 * The `[SENSITIVE]` case is worth naming because it is silent and total: the
 * same var feeds posthog-js, so a site in this state reports no CSP
 * violations AND no analytics at all, while looking entirely healthy.
 */
export function diagnoseToken(csp: string | null): string {
  if (!csp) return 'no Content-Security-Policy-Report-Only header at all';
  if (csp.includes('[SENSITIVE]')) {
    return (
      'NEXT_PUBLIC_POSTHOG_KEY is marked Sensitive in Vercel, so the build ' +
      'inlined the literal string `[SENSITIVE]` instead of the key. The same ' +
      'var feeds posthog-js, so this site is also sending no analytics. Fix: ' +
      'vercel env rm NEXT_PUBLIC_POSTHOG_KEY production && vercel env add ' +
      'NEXT_PUBLIC_POSTHOG_KEY production --no-sensitive'
    );
  }
  if (!csp.includes('report-uri')) return 'CSP carries no report-uri directive';
  return 'report-uri present but its token is not a readable value';
}

export function missingHeaders(present: Iterable<string>): string[] {
  const have = new Set([...present].map((h) => h.toLowerCase()));
  return REQUIRED_HEADERS.filter((h) => !have.has(h));
}

/** A clearly-labelled probe. Exclude this blocked-uri from real analysis. */
export const PROBE_BLOCKED_URI =
  'https://integration-health-probe.invalid/synthetic';

interface Failure {
  site: string;
  check: string;
  detail: string;
}

async function main(): Promise<void> {
  const failures: Failure[] = [];
  const notes: string[] = [];

  for (const site of SITES) {
    let res: Response;
    try {
      res = await fetch(site, { redirect: 'follow' });
    } catch (error) {
      failures.push({
        site,
        check: 'reachable',
        detail: `fetch failed: ${(error as Error).message}`,
      });
      continue;
    }

    if (!res.ok) {
      failures.push({
        site,
        check: 'reachable',
        detail: `responded ${res.status}`,
      });
      continue;
    }

    const absent = missingHeaders(res.headers.keys());
    if (absent.length > 0) {
      failures.push({
        site,
        check: 'security headers',
        detail: `missing: ${absent.join(', ')}`,
      });
    } else {
      notes.push(`${site} — all ${REQUIRED_HEADERS.length} headers present`);
    }
  }

  // Cache honesty: an OG image is the case that actually regressed. It is
  // referenced by absolute URL from package READMEs, so a stale one is served
  // by Twitter, LinkedIn, Slack and GitHub's camo proxy.
  const cacheTargets = [
    'https://eslint.interlace.tools/images/og-jwt-security.png',
  ];
  for (const url of cacheTargets) {
    const res = await fetch(url, { method: 'GET' });
    const verdict = cachingIsHonest(url, res.headers.get('cache-control'));
    if (!verdict.ok) {
      failures.push({
        site: url,
        check: 'cache invalidation',
        detail: verdict.reason ?? 'immutable on a non-hashed URL',
      });
    } else {
      notes.push(`${url} — cache-control is release-invalidatable`);
    }
  }

  // The check that would have caught the six weeks of silence: does a report
  // actually arrive? Token is read from the site's own header, never held.
  for (const site of REPORT_SITES) {
    const head = await fetch(site);
    const token = tokenFromCsp(
      head.headers.get('content-security-policy-report-only'),
    );
    if (!token) {
      failures.push({
        site,
        check: 'csp report-uri',
        detail: diagnoseToken(
          head.headers.get('content-security-policy-report-only'),
        ),
      });
      continue;
    }
    const res = await fetch(`${site}/ingest/report/?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/csp-report' },
      body: JSON.stringify({
        'csp-report': {
          'document-uri': `${site}/integration-health`,
          'violated-directive': 'img-src',
          'blocked-uri': PROBE_BLOCKED_URI,
          disposition: 'report',
        },
      }),
    });
    if (res.status !== 204) {
      failures.push({
        site,
        check: 'csp report-uri',
        detail: `POST /ingest/report/ responded ${res.status}, expected 204 — violation reports are being discarded`,
      });
    } else {
      notes.push(`${site} — CSP reports reach PostHog (204)`);
    }
  }

  for (const n of notes) console.log(`  ok    ${n}`);
  for (const f of failures) {
    console.error(`  FAIL  [${f.check}] ${f.site}: ${f.detail}`);
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} integration check(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${notes.length} integration checks passed.`);
}

// Only run when invoked directly, so the test can import the helpers without
// firing network calls. No top-level await: tsx transforms this file to CJS.
const invokedDirectly = process.argv[1]?.endsWith('integration-health.ts');
if (invokedDirectly) {
  void main();
}
