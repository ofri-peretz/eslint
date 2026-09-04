/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The shard weight is a duration, and its fallback is in the same unit.
 *
 * `ci-test-shard.mts` bin-packs with LPT — heaviest item first, into the
 * lightest bucket. That makes the weight's UNIT load-bearing in a way a wrong
 * value is not: mixing `83` (test files) with `12` (seconds) sorts every
 * unprofiled package to the front of the heaviest-first walk and lays out the
 * shards around packages that are not actually heavy.
 *
 * The failure is silent. Shards still get built, every test still runs, the run
 * is green — it is just badly balanced, and the only symptom is a lane finishing
 * later than it should. Which is precisely the class of defect this repo keeps
 * finding, so it gets a lock rather than a comment.
 *
 * See ADR 0007.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const SHARDER = readFileSync(
  resolve(ROOT, 'scripts/ci-test-shard.mts'),
  'utf8',
);
const PROFILE = resolve(ROOT, '.agent/test-duration-profile.json');

/** The sharder source with comments stripped — a comment quoting a pattern is not the pattern. */
const CODE = SHARDER.split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');

describe('shard cost is a measured duration', () => {
  it('reads the duration profile', () => {
    expect(CODE).toContain('test-duration-profile.json');
  });

  it('bin-packs on shardCost, not on raw file count', () => {
    // The regression is a one-word revert: `cost: countTestFiles(...)`.
    expect(CODE).toMatch(/cost\s*[:=]\s*shardCost\(/);
    expect(CODE).not.toMatch(/const cost = countTestFiles\(/);
  });

  it('converts the fallback into seconds instead of mixing units', () => {
    // Without this an unprofiled package is weighed in FILES against packages
    // weighed in SECONDS, and LPT sorts it as if it were the heaviest thing in
    // the repo.
    expect(CODE).toMatch(/SECONDS_PER_TEST_FILE/);
    const fn = CODE.slice(CODE.indexOf('function shardCost'));
    expect(fn.slice(0, 400)).toMatch(
      /countTestFiles\([^)]*\)\s*\*\s*SECONDS_PER_TEST_FILE/,
    );
  });

  it('still has a fallback at all', () => {
    // A package added after the last profile refresh must get a usable weight.
    // Returning 0 would make LPT sort it last and drop it wherever — balanced
    // in appearance, arbitrary in fact.
    const fn = CODE.slice(CODE.indexOf('function shardCost'));
    expect(fn.slice(0, 400)).toMatch(/Math\.max\(1,/);
  });
});

describe('the duration profile is usable when present', () => {
  it('has the shape the sharder reads', () => {
    if (!existsSync(PROFILE)) return; // absent is a supported state, see ADR 0007
    const p = JSON.parse(readFileSync(PROFILE, 'utf8'));
    expect(p.durations, 'profile has no `durations` map').toBeTypeOf('object');
    expect(Object.keys(p.durations).length).toBeGreaterThan(0);
    for (const [name, secs] of Object.entries(p.durations)) {
      expect(typeof secs, `${name} is not a number`).toBe('number');
      expect(
        secs as number,
        `${name} is not a positive duration`,
      ).toBeGreaterThan(0);
    }
  });

  it('records when it was measured, so staleness is visible', () => {
    if (!existsSync(PROFILE)) return;
    const p = JSON.parse(readFileSync(PROFILE, 'utf8'));
    expect(
      p.recordedAt,
      'no recordedAt — a stale profile would look current',
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
