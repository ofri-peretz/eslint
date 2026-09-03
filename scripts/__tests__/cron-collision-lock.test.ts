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

type Cron = { file: string; raw: string; fields: string[] };

function crons(): Cron[] {
  const out: Cron[] = [];
  for (const file of readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
    const src = readFileSync(join(WORKFLOWS, file), 'utf8');
    for (const m of src.matchAll(/cron:\s*['"]([^'"]+)['"]/g)) {
      const fields = m[1].trim().split(/\s+/);
      if (fields.length >= 5)
        out.push({ file, raw: m[1].trim(), fields: fields.slice(0, 5) });
    }
  }
  return out;
}

/** Inclusive bounds per POSIX cron field: minute, hour, day-of-month, month, day-of-week. */
const BOUNDS: [number, number][] = [
  [0, 59],
  [0, 23],
  [1, 31],
  [1, 12],
  [0, 6],
];

/**
 * Every value a single cron field matches.
 *
 * Comparing field STRINGS is not the same as comparing what they match, and
 * that difference is the whole point of this file: `0 9 * * 1` and `0 9 * * *`
 * are different strings that both run at 09:00 on a Monday. An earlier version
 * of this lock grouped raw strings and would have called that pair safe — while
 * carrying a comment claiming it handled wildcards. Caught in review on #847.
 *
 * Handles `*`, `a`, `a,b`, `a-b`, and any of those with a `/step`. Day-of-week
 * 7 is normalised to 0, both being Sunday.
 */
function expand(field: string, index: number): Set<number> {
  const [lo, hi] = BOUNDS[index];
  const values = new Set<number>();

  for (const part of field.split(',')) {
    const [spec, stepText] = part.split('/');
    const step = stepText ? Number(stepText) : 1;
    if (!Number.isFinite(step) || step < 1) continue;

    let from = lo;
    let to = hi;
    if (spec !== '*' && spec !== '') {
      const range = spec.split('-');
      from = Number(range[0]);
      to = range.length > 1 ? Number(range[1]) : range[0] === spec ? from : hi;
      // A bare `5/2` means 5 through the field's maximum, not just 5.
      if (range.length === 1 && stepText) to = hi;
    }
    if (!Number.isFinite(from) || !Number.isFinite(to)) continue;

    for (let v = from; v <= to; v += step) {
      values.add(index === 4 && v === 7 ? 0 : v);
    }
  }
  return values;
}

function overlaps(a: Set<number>, b: Set<number>): boolean {
  for (const v of a) if (b.has(v)) return true;
  return false;
}

/**
 * Two schedules can fire together when EVERY field intersects.
 *
 * Day-of-month and day-of-week are compared like the rest. Real cron ORs those
 * two when both are restricted, which makes this very slightly conservative —
 * it can only ever report a collision that cron would not produce, never miss
 * one it would. For a lock whose failure mode is silence, erring that way is
 * the correct direction.
 */
function collide(a: Cron, b: Cron): boolean {
  return a.fields.every((_, i) =>
    overlaps(expand(a.fields[i], i), expand(b.fields[i], i)),
  );
}

describe('scheduled workflows do not collide on the same minute', () => {
  const all = crons();

  it('finds the schedules to check', () => {
    expect(all.length).toBeGreaterThan(10);
  });

  it('expands cron fields rather than comparing their text', () => {
    // The bug this file shipped with, pinned so it cannot come back.
    expect(overlaps(expand('1', 4), expand('*', 4))).toBe(true); // Mon vs every day
    expect(overlaps(expand('1', 4), expand('1,3', 4))).toBe(true); // list
    expect(overlaps(expand('9', 1), expand('8-10', 1))).toBe(true); // range
    expect(overlaps(expand('0', 0), expand('*/15', 0))).toBe(true); // step
    expect(overlaps(expand('5', 0), expand('*/15', 0))).toBe(false); // no overlap
    expect(overlaps(expand('0', 4), expand('7', 4))).toBe(true); // Sunday is 0 and 7
  });

  it('no two schedules can fire at the same moment', () => {
    const collisions: string[] = [];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++)
        if (collide(all[i], all[j]))
          collisions.push(
            `"${all[i].raw}" (${all[i].file}) + "${all[j].raw}" (${all[j].file})`,
          );

    expect(
      collisions,
      'these can fire together and contend for the same 20 concurrent job ' +
        'slots; move one, and say in a comment what it was moved away from',
    ).toEqual([]);
  });
});
