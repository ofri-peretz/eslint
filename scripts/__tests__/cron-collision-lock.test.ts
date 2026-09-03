/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Two scheduled workflows must not start on the same minute.
 *
 * GitHub Free allows 20 concurrent jobs and there is no public-repo exemption.
 * Workflows that fire on the same minute contend for that pool, and the loser
 * queues — measured 2026-09-03 on the PR gate at p50 25s, p90 69s, max 87s.
 * Nothing reports it: both runs go green, just later.
 *
 * `benchmark.yml` was already moved off the 04:00-05:00 cluster by hand for
 * exactly this reason, with a comment saying so. That fix protected one
 * workflow and nothing stopped the next one from landing on an occupied
 * minute — which is what `weekly-benchmark` had done at 09:00 Monday, on top
 * of `metrics-freshness`.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WORKFLOWS = resolve(__dirname, '..', '..', '.github/workflows');

type Cron = {
  file: string;
  minute: string;
  hour: string;
  dow: string;
  raw: string;
};

function crons(): Cron[] {
  const out: Cron[] = [];
  for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
    const src = readFileSync(join(WORKFLOWS, file), 'utf8');
    for (const m of src.matchAll(/cron:\s*['"]([^'"]+)['"]/g)) {
      const f = m[1].trim().split(/\s+/);
      if (f.length >= 5)
        out.push({ file, minute: f[0], hour: f[1], dow: f[4], raw: m[1] });
    }
  }
  return out;
}

describe('scheduled workflows do not collide on the same minute', () => {
  const all = crons();

  it('finds the schedules to check', () => {
    // Guards against the assertion below passing vacuously if the cron syntax
    // or the directory layout ever changes shape.
    expect(all.length).toBeGreaterThan(10);
  });

  it('no two fire at the same minute + hour + day-of-week', () => {
    const seen = new Map<string, Cron[]>();
    for (const c of all) {
      // Distinct day-of-week fields cannot collide even at the same time, and
      // a `*` overlaps everything, so it is compared as itself.
      const key = `${c.minute} ${c.hour} ${c.dow}`;
      seen.set(key, [...(seen.get(key) ?? []), c]);
    }

    const collisions = [...seen.entries()]
      .filter(([, v]) => v.length > 1)
      .map(([key, v]) => `${key} -> ${v.map((c) => c.file).join(' + ')}`);

    expect(
      collisions,
      'these start on the same minute and contend for the same 20 concurrent ' +
        'job slots; move one, and say in a comment what it was moved away from',
    ).toEqual([]);
  });
});
