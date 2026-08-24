/**
 * Unit cover for the integration-health assertion helpers.
 *
 * The probe itself talks to production, so it cannot run here. These are the
 * pure decisions it makes — the parts that could be wrong in a way that makes
 * the probe pass while production is broken, which is precisely the failure
 * this script exists to end.
 */
import { describe, it, expect } from 'vitest';

import {
  REQUIRED_HEADERS,
  REPORT_SITES,
  SITES,
  cachingIsHonest,
  diagnoseToken,
  isContentAddressed,
  missingHeaders,
  tokenFromCsp,
} from '../integration-health';

describe('immutable is only honest on content-addressed URLs', () => {
  it('accepts immutable on a hashed build asset', () => {
    const url = 'https://x/_next/static/chunks/43vr5br0lz3fh.js';
    expect(isContentAddressed(url)).toBe(true);
    expect(cachingIsHonest(url, 'public,max-age=31536000,immutable').ok).toBe(
      true,
    );
  });

  it('rejects immutable on an OG image, the case that regressed', () => {
    // Referenced by absolute URL from package READMEs, so a stale one is
    // served by Twitter, LinkedIn, Slack and GitHub's camo proxy.
    const url = 'https://x/images/og-jwt-security.png';
    const verdict = cachingIsHonest(url, 'public, max-age=31536000, immutable');
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toMatch(/content hash/);
  });

  it('accepts a revalidating policy on a non-hashed URL', () => {
    expect(
      cachingIsHonest(
        'https://x/images/og.png',
        'public, max-age=0, must-revalidate',
      ).ok,
    ).toBe(true);
  });

  it('accepts a URL with no cache-control at all', () => {
    expect(cachingIsHonest('https://x/images/og.png', null).ok).toBe(true);
  });
});

describe('report token extraction', () => {
  const csp = (reportUri: string) =>
    `default-src 'self'; img-src *; report-uri ${reportUri}`;

  it('reads a real token', () => {
    expect(tokenFromCsp(csp('/ingest/report/?token=phc_abc123'))).toBe(
      'phc_abc123',
    );
  });

  it('refuses [SENSITIVE], which is a Vercel substitution and not a token', () => {
    // Treating this as a token would make the probe POST to a dead endpoint
    // and report success — the exact blindness this script exists to remove.
    expect(tokenFromCsp(csp('/ingest/report/?token=[SENSITIVE]'))).toBeNull();
  });

  it('returns null when there is no report-uri', () => {
    expect(tokenFromCsp("default-src 'self'")).toBeNull();
    expect(tokenFromCsp(null)).toBeNull();
  });
});

describe('token diagnosis names an actionable cause', () => {
  it('identifies the Sensitive-var case and gives the fix', () => {
    const d = diagnoseToken(
      "default-src 'self'; report-uri /ingest/report/?token=[SENSITIVE]",
    );
    expect(d).toMatch(/marked Sensitive/);
    expect(d).toMatch(/--no-sensitive/);
    // The consequence that makes this urgent, not cosmetic.
    expect(d).toMatch(/no analytics/);
  });

  it('distinguishes a missing header from a missing directive', () => {
    expect(diagnoseToken(null)).toMatch(/no Content-Security-Policy/);
    expect(diagnoseToken("default-src 'self'")).toMatch(/no report-uri/);
  });
});

describe('required headers', () => {
  it('reports exactly what is absent', () => {
    expect(missingHeaders([...REQUIRED_HEADERS])).toEqual([]);
    expect(
      missingHeaders(REQUIRED_HEADERS.filter((h) => h !== 'x-frame-options')),
    ).toEqual(['x-frame-options']);
  });

  it('is case-insensitive, since header casing is not guaranteed', () => {
    expect(
      missingHeaders(REQUIRED_HEADERS.map((h) => h.toUpperCase())),
    ).toEqual([]);
  });

  it('covers every header this session established', () => {
    for (const h of [
      'x-frame-options',
      'permissions-policy',
      'strict-transport-security',
      'cross-origin-opener-policy',
      'content-security-policy-report-only',
    ]) {
      expect(REQUIRED_HEADERS).toContain(h);
    }
  });
});

describe('site coverage', () => {
  it('probes all five properties', () => {
    expect(SITES).toHaveLength(5);
  });

  it('excludes storybook from report-uri checks', () => {
    // Its policy ships from a static vercel.json that cannot template a key,
    // so it reports via a securitypolicyviolation listener instead. There is
    // no endpoint to probe, and asserting one would fail forever.
    expect(REPORT_SITES).toHaveLength(4);
    expect(REPORT_SITES.some((s) => s.includes('storybook'))).toBe(false);
  });
});
