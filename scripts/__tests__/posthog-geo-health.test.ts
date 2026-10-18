/**
 * Unit cover for the posthog-geo-health decision. The script itself queries
 * production PostHog, so it cannot run here.
 */
import { describe, it, expect } from 'vitest';

import { geoGaps, isInterlaceHost } from '../posthog-geo-health';

describe('geoGaps', () => {
  it('flags the 2026-08-22 regression: an Interlace host with 0% geo', () => {
    const gaps = geoGaps([
      { host: 'eslint.interlace.tools', pageviews: 135, withGeo: 0 },
      { host: 'ofriperetz.dev', pageviews: 109, withGeo: 109 },
    ]);
    expect(gaps.map((g) => g.host)).toEqual(['eslint.interlace.tools']);
  });

  it('passes a host at normal coverage (502 of 512)', () => {
    expect(
      geoGaps([
        { host: 'eslint.interlace.tools', pageviews: 512, withGeo: 502 },
      ]),
    ).toEqual([]);
  });

  it('ignores hosts too quiet to judge', () => {
    expect(
      geoGaps([{ host: 'roundel.interlace.tools', pageviews: 3, withGeo: 0 }]),
    ).toEqual([]);
  });

  it('ignores aliases that are not production hosts', () => {
    expect(
      geoGaps([{ host: 'eslint-one.vercel.app', pageviews: 31, withGeo: 0 }]),
    ).toEqual([]);
  });
});

describe('isInterlaceHost', () => {
  it('matches the apex, subdomains and the blog', () => {
    expect(isInterlaceHost('interlace.tools')).toBe(true);
    expect(isInterlaceHost('ds.interlace.tools')).toBe(true);
    expect(isInterlaceHost('ofriperetz.dev')).toBe(true);
  });
  it('rejects look-alikes', () => {
    expect(isInterlaceHost('notinterlace.tools')).toBe(false);
    expect(isInterlaceHost('interlace.tools.evil.com')).toBe(false);
  });
});
