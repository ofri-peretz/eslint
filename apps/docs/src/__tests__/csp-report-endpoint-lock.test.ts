/**
 * Regression lock: the CSP `report-uri` must actually reach PostHog.
 *
 * What went wrong
 * ───────────────
 * The policy pointed at `/ingest/report/?token=…`, which the catch-all
 * `/ingest/:path*` rewrote to `https://us.i.posthog.com/report` — without the
 * trailing slash, because `:path*` drops it. PostHog's CSP endpoint answers
 * 204 for `/report/` and 404 for `/report`. Every violation report 404'd from
 * the day the header shipped.
 *
 * It was invisible in the worst way. A failing `report-uri` reports nothing
 * about itself: the page works, the header looks right in devtools, and the
 * empty `$csp_violation` stream is indistinguishable from a policy with
 * nothing to report. It was found by POSTing a probe at the endpoint, not by
 * reading anything.
 *
 * This lock pins the structural half — the explicit rewrite exists and keeps
 * its trailing slash, ahead of the catch-all. The live half (the endpoint
 * really answers 2xx) belongs in a post-deploy probe, the same split
 * CLAUDE.md prescribes for cached external URLs.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const CONFIG = readFileSync(join(__dirname, '../../next.config.mjs'), 'utf-8');

describe('CSP report-uri reaches PostHog', () => {
  it('sends reports to a same-origin /ingest path', () => {
    // Same-origin on purpose: ad blockers match the *.i.posthog.com hostname.
    expect(CONFIG).toMatch(/report-uri \/ingest\/report\//);
  });

  it('rewrites /ingest/report to a destination that keeps the trailing slash', () => {
    const dest = CONFIG.match(
      /source:\s*'\/ingest\/report\/?',\s*destination:\s*'([^']+)'/,
    );
    expect(dest, 'no explicit /ingest/report rewrite').not.toBeNull();
    expect(
      dest![1],
      'PostHog answers 404 for /report — the destination must end in /report/',
    ).toMatch(/\/report\/$/);
  });

  it('declares the explicit rewrite before the catch-all that would eat it', () => {
    const explicit = CONFIG.indexOf("source: '/ingest/report'");
    const catchAll = CONFIG.indexOf("source: '/ingest/:path*'");
    expect(explicit).toBeGreaterThan(-1);
    expect(catchAll).toBeGreaterThan(-1);
    expect(
      explicit,
      'the catch-all matches first and drops the trailing slash',
    ).toBeLessThan(catchAll);
  });
});
