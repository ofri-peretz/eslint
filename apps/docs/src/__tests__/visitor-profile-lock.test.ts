/**
 * Regression lock: visitor-profile inference vs the UTM taxonomy.
 *
 * Locks the `devto` → developer mapping so a taxonomy or refactor change
 * can't silently declassify Dev.to-referred visitors. Every /go/ link and
 * hand-written article link stamps `utm_source=devto` (the /go/ handler's
 * platform key — see UTM_PHILOSOPHY.md "Deprecated: dev_to → devto");
 * before the 2026-07-17 alignment these visitors fell through to referrer
 * heuristics and classified as `unknown` when no referrer was present.
 */
import { describe, expect, it } from 'vitest';

import type { LandingUtm } from '../lib/utm';
import { inferVisitorProfile } from '../lib/visitor-profile';

function landingUtm(source: string | null): LandingUtm {
  return {
    source,
    medium: null,
    campaign: null,
    content: null,
    term: null,
    phDistinctId: null,
    referrer: null,
  };
}

describe('visitor-profile lock — UTM source mapping', () => {
  it('classifies utm_source=devto as developer without needing a referrer', () => {
    expect(
      inferVisitorProfile({ utm: landingUtm('devto'), landingPath: '/' }),
    ).toBe('developer');
  });

  it('keeps legacy utm_source=dev_to classifying as developer (historical links)', () => {
    expect(
      inferVisitorProfile({ utm: landingUtm('dev_to'), landingPath: '/' }),
    ).toBe('developer');
  });

  it('still returns unknown when there is no signal at all', () => {
    expect(
      inferVisitorProfile({ utm: landingUtm(null), landingPath: '/' }),
    ).toBe('unknown');
  });
});
