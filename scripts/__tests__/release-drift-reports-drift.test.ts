/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The drift check has to REPORT drift, not merely pass when there is none.
 *
 * On a healthy day every package matches npm, so a check that always returned
 * "ok" would look identical to a working one — for months, and then on the day
 * a release silently stops it would still say nothing. That is precisely the
 * failure this check exists to catch, so it cannot be the failure the test
 * permits.
 *
 * `classify` is exercised against synthetic pairs rather than the live
 * registry, because reaching the drift branch through the registry requires a
 * genuinely broken release, which is not a thing to wait for.
 *
 * See docs/intents/2026-08-31-a-stuck-release-announces-itself.md
 */

import { describe, it, expect } from 'vitest';

import { classify } from '../check-release-drift.ts';

describe('the release-drift classifier', () => {
  it('calls a matching version ok', () => {
    expect(classify('2.0.7', '2.0.7')).toBe('ok');
  });

  it('calls a bumped-but-unpublished version behind', () => {
    // The exact shape of 2026-08-31: five packages sat like this on main and
    // nothing said so.
    expect(classify('2.0.7', '2.0.6')).toBe('behind');
    expect(classify('5.1.0', '5.0.0')).toBe('behind');
  });

  it('does not call a never-published package drift', () => {
    // A new plugin before its first release is not a stuck release. Counting
    // it would make the check noisy on exactly the day someone adds a plugin,
    // which is how a check gets muted.
    expect(classify('1.0.0', null)).toBe('never-published');
  });

  it('treats an npm version AHEAD of local as drift too', () => {
    // Rarer, but it means someone published outside the pipeline — worth the
    // same alarm, and a naive `local > published` comparison would miss it.
    expect(classify('2.0.6', '2.0.7')).toBe('behind');
  });
});
