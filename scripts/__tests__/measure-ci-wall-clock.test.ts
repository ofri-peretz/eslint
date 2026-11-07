/**
 * @provenBy {"file":"scripts/measure-ci-wall-clock.mts","find":"  return s.length % 2 === 1 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);","replace":"  return s[m];"}
 *
 * Copyright (c) 2026 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

import { describe, it, expect } from 'vitest';
import { median, mondayOf, wallSeconds } from '../measure-ci-wall-clock.mts';

describe('measure-ci-wall-clock', () => {
  it('takes the median of an odd and an even count, and none of nothing', () => {
    expect(median([300, 60, 120])).toBe(120);
    expect(median([60, 120, 300, 900])).toBe(210);
    expect(median([])).toBeNull();
  });

  it('measures a run from its start to its last update, queueing included', () => {
    expect(
      wallSeconds({
        run_started_at: '2026-11-02T10:00:00Z',
        updated_at: '2026-11-02T10:06:30Z',
      }),
    ).toBe(390);
  });

  it('files every day of a week under that week’s Monday, Sunday included', () => {
    expect(mondayOf(new Date('2026-11-02T00:00:00Z')).toISOString()).toBe(
      '2026-11-02T00:00:00.000Z',
    );
    expect(mondayOf(new Date('2026-11-07T23:59:00Z')).toISOString()).toBe(
      '2026-11-02T00:00:00.000Z',
    );
    expect(mondayOf(new Date('2026-11-08T12:00:00Z')).toISOString()).toBe(
      '2026-11-02T00:00:00.000Z',
    );
  });
});
