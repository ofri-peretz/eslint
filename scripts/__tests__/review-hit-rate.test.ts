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
import {
  dedupe,
  findingsInSummary,
  isActedOn,
  latestMerged,
  PR_LIST,
  resolvePath,
} from '../review-hit-rate';

const SUMMARY = [
  '**Files read:** `no-unhandled-promise.ts`, `x.test.ts` (all changed files).',
  '**1. `defs[0]` on a reassigned parameter (nit)**',
  '`packages/eslint-plugin-reliability/src/rules/no-unhandled-promise.ts:745`',
  'Also see `no-unhandled-promise.ts:745`, `index.ts:12-20` and again `index.ts:12`.',
  'And `Dockerfile:3` and `.github/CODEOWNERS:8`.',
  'Routes: `app/[slug]/page.tsx:12` and `app/(marketing)/layout.tsx:4`.',
].join('\n');

describe('findingsInSummary', () => {
  const found = findingsInSummary(1785, SUMMARY, '2026-11-25T10:00:00Z');

  it('counts each distinct path:line citation once, with its line', () => {
    expect(found.map((f) => `${f.path}:${f.line}`)).toEqual([
      'packages/eslint-plugin-reliability/src/rules/no-unhandled-promise.ts:745',
      'no-unhandled-promise.ts:745',
      'index.ts:12',
      'Dockerfile:3',
      '.github/CODEOWNERS:8',
      'app/[slug]/page.tsx:12',
      'app/(marketing)/layout.tsx:4',
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

describe('dedupe', () => {
  it('keeps the first of a finding a re-review cites again (PR 1785, line 745 twice)', () => {
    const at = (createdAt: string) => ({
      pr: 1785,
      path: 'a.ts',
      line: 745,
      createdAt,
      body: '',
    });
    expect(
      dedupe([at('2026-11-25T17:47:03Z'), at('2026-11-25T16:18:27Z')]),
    ).toEqual([at('2026-11-25T16:18:27Z')]);
  });
});

describe('resolvePath', () => {
  const files = [
    'packages/a/src/index.ts',
    'packages/b/src/index.ts',
    'packages/r/no-unhandled-promise.ts',
  ];

  it('resolves a bare name that ends exactly one PR file', () => {
    expect(resolvePath('no-unhandled-promise.ts', files)).toBe(
      'packages/r/no-unhandled-promise.ts',
    );
  });

  it('refuses a bare name that ends several PR files (index.ts, PR 1766)', () => {
    expect(resolvePath('index.ts', files)).toBeNull();
  });

  it('does not match a file whose name merely ends the same way', () => {
    expect(
      resolvePath('no-unhandled-promise.ts', ['my-no-unhandled-promise.ts']),
    ).toBeNull();
  });

  it('refuses a bare name that is a root file AND the tail of another', () => {
    expect(
      resolvePath('index.ts', ['index.ts', 'packages/a/index.ts']),
    ).toBeNull();
  });

  it('takes a unique root file and a qualified path as written', () => {
    expect(resolvePath('README.md', ['README.md'])).toBe('README.md');
    expect(
      resolvePath('packages/a/index.ts', ['packages/a/index.ts', 'index.ts']),
    ).toBe('packages/a/index.ts');
  });
});

describe('latestMerged', () => {
  const pr = (number: number, mergedAt: string | null, bot = false) => ({
    number,
    mergedAt,
    bot,
  });

  it('finds a PR opened long ago but merged most recently', () => {
    const all = [
      pr(41, '2026-11-25T10:00:00Z'),
      pr(40, '2026-11-25T11:00:00Z'),
      pr(5, '2026-11-25T12:00:00Z'),
    ];
    expect(latestMerged(all, 2)).toEqual([5, 40]);
  });

  it('counts a PR read twice (a page shifted mid-read) once', () => {
    const all = [
      pr(40, '2026-11-25T11:00:00Z'),
      pr(40, '2026-11-25T11:00:00Z'),
      pr(39, '2026-11-25T10:00:00Z'),
    ];
    expect(latestMerged(all, 2)).toEqual([40, 39]);
  });

  it('skips bots and unmerged PRs', () => {
    const all = [
      pr(1, '2026-11-25T12:00:00Z', true),
      pr(2, null),
      pr(3, '2026-11-25T11:00:00Z'),
    ];
    expect(latestMerged(all, 5)).toEqual([3]);
  });
});

describe('isActedOn', () => {
  const c = {
    pr: 1,
    path: 'no-unhandled-promise.ts',
    line: 1,
    createdAt: '2026-11-25T10:00:00Z',
    body: '',
  };
  const prFiles = ['packages/r/no-unhandled-promise.ts'];

  it('is true when a later commit touches the cited file', () => {
    expect(
      isActedOn(
        c,
        [
          {
            date: '2026-11-25T11:00:00Z',
            files: ['packages/r/no-unhandled-promise.ts'],
          },
        ],
        prFiles,
      ),
    ).toBe(true);
  });

  it('is false when the only touching commit came before the comment', () => {
    expect(
      isActedOn(
        c,
        [
          {
            date: '2026-11-25T09:00:00Z',
            files: ['packages/r/no-unhandled-promise.ts'],
          },
        ],
        prFiles,
      ),
    ).toBe(false);
  });

  it('is false for an ambiguous bare name, whatever later commits touch', () => {
    const files = ['packages/a/index.ts', 'packages/b/index.ts'];
    expect(
      isActedOn(
        { ...c, path: 'index.ts' },
        [{ date: '2026-11-25T11:00:00Z', files: ['packages/b/index.ts'] }],
        files,
      ),
    ).toBe(false);
  });
});

describe('PR_LIST', () => {
  // Any other filter or order lets a row leave or jump between pages while they are read.
  it('lists every PR by creation time, so pages only gain rows', () => {
    const q = new URLSearchParams(PR_LIST.split('?')[1]);
    expect(q.get('state')).toBe('all');
    expect(q.get('sort')).toBe('created');
  });
});
