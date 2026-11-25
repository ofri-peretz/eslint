/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * The reviewer hit-rate instrument (scripts/review-hit-rate.ts). Found on its first run: the
 * reviewer posts almost no inline comments, so a count of inline comments read 0 findings over
 * 20 PRs. These cases hold the summary parser and the acted-on rule to what the real comments
 * look like.
 */

import { describe, it, expect } from 'vitest';
import { findingsInSummary, isActedOn } from '../review-hit-rate';

const SUMMARY = [
  '**Files read:** `no-unhandled-promise.ts`, `x.test.ts` (all changed files).',
  '**1. `defs[0]` on a reassigned parameter (nit)**',
  '`packages/eslint-plugin-reliability/src/rules/no-unhandled-promise.ts:745`',
  'Also see `no-unhandled-promise.ts:745` and `index.ts:12-20`.',
].join('\n');

describe('findingsInSummary', () => {
  const found = findingsInSummary(1785, SUMMARY, '2026-11-25T10:00:00Z');

  it('counts each distinct path:line citation once', () => {
    expect(found.map((f) => f.path)).toEqual([
      'packages/eslint-plugin-reliability/src/rules/no-unhandled-promise.ts',
      'no-unhandled-promise.ts',
      'index.ts',
    ]);
  });

  it('ignores a file named without a line (a files-read list)', () => {
    expect(found.some((f) => f.path === 'x.test.ts')).toBe(false);
  });

  it('keeps the text around the citation for labelling', () => {
    expect(found[0]!.body).toContain('reassigned parameter');
  });

  it('finds nothing in an LGTM with no citation', () => {
    expect(findingsInSummary(1, '**No blocking issues. LGTM.**', 'z')).toEqual(
      [],
    );
  });
});

describe('isActedOn', () => {
  const c = {
    pr: 1,
    path: 'no-unhandled-promise.ts',
    createdAt: '2026-11-25T10:00:00Z',
    body: '',
  };

  it('is true when a later commit touches the file, matched as a path suffix', () => {
    expect(
      isActedOn(c, [
        {
          date: '2026-11-25T11:00:00Z',
          files: ['packages/r/no-unhandled-promise.ts'],
        },
      ]),
    ).toBe(true);
  });

  it('is false when the only touching commit came before the comment', () => {
    expect(
      isActedOn(c, [
        { date: '2026-11-25T09:00:00Z', files: ['no-unhandled-promise.ts'] },
      ]),
    ).toBe(false);
  });

  it('does not match a file whose name merely ends the same way', () => {
    expect(
      isActedOn(c, [
        { date: '2026-11-25T11:00:00Z', files: ['my-no-unhandled-promise.ts'] },
      ]),
    ).toBe(false);
  });
});
