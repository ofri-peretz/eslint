/**
 * Copyright (c) 2025 Ofri Peretz
 * Licensed under the MIT License. Use of this source code is governed by the
 * MIT license that can be found in the LICENSE file.
 */

/**
 * Unit lock for the detection-list coverage gate.
 *
 * The apostrophe case below is the one that matters. Without comment
 * stripping, this gate skipped `DEFAULT_SECURITY_USE_NAMES` — the 41-entry
 * table whose gaps are the reason the gate exists — and reported a clean run.
 * A checker that silently drops its own motivating case is worse than no
 * checker, because it converts "unmeasured" into "measured and fine".
 */

import { describe, it, expect } from 'vitest';
import {
  extractLists,
  isDetectionToken,
  stripComments,
  uncoveredEntries,
} from '../lint-detection-list-coverage';

const FILE = 'rule.ts';

describe('isDetectionToken', () => {
  it('accepts bare tokens', () => {
    for (const t of ['passphrase', 'readInt16LE', 'tar-fs', '@mui/material', 'sign-in'])
      expect(isDetectionToken(t)).toBe(true);
  });

  it('rejects prose, which shares the array syntax with detection entries', () => {
    // The first reading of this gate counted these as uncovered "entries".
    for (const t of ['Moment.js is in maintenance mode.', '10-15 minutes', 'Use named imports'])
      expect(isDetectionToken(t)).toBe(false);
  });

  it('rejects URLs', () => {
    expect(isDetectionToken('https://example.com/a')).toBe(false);
  });
});

describe('stripComments', () => {
  it('removes a whole-line comment', () => {
    expect(stripComments("  // note\n'a',")).not.toContain('note');
  });

  it('does not let a comment-opener inside a line comment start a block', () => {
    const glob = ['src/', '*', '*'].join('');
    const out = stripComments(`  // paths under ${glob}\nconst A = ['x'];`);
    expect(out).toContain("const A = ['x']");
  });
});

describe('extractLists', () => {
  it('finds a detection table', () => {
    const src = "const NAMES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];";
    expect(extractLists(src, FILE)).toEqual([
      { file: FILE, name: 'NAMES', entries: ['alpha', 'beta', 'gamma', 'delta', 'epsilon'] },
    ]);
  });

  it('still finds the table when a comment between entries contains an apostrophe', () => {
    // THE REGRESSION. `makeNameTest`'s apostrophe paired with the next entry's
    // opening quote, captured four lines of prose as a string literal, and
    // dropped the token ratio below the threshold — so the table vanished.
    const src = [
      'const NAMES = [',
      "  'alpha', 'beta', 'gamma',",
      "  // chosen against `makeNameTest`'s mechanics rather than by feel: an",
      '  // entry under 6 characters matches whole words only, which is why the',
      '  // compound spellings are listed whole.',
      "  'delta', 'epsilon',",
      '];',
    ].join('\n');
    const [list] = extractLists(src, FILE);
    expect(list).toBeDefined();
    expect(list.entries).toEqual(['alpha', 'beta', 'gamma', 'delta', 'epsilon']);
  });

  it('ignores a table that is mostly prose', () => {
    const src =
      "const MSGS = ['Use named imports for tree-shaking', 'Moment.js is in maintenance mode', 'a', 'b', 'c', 'd'];";
    expect(extractLists(src, FILE)).toEqual([]);
  });

  it('ignores a handful of special cases', () => {
    expect(extractLists("const A = ['x', 'y'];", FILE)).toEqual([]);
  });
});

describe('uncoveredEntries', () => {
  const list = { file: FILE, name: 'N', entries: ['totp', 'recoverycode', 'mnemonic'] };

  it('reports entries no test mentions', () => {
    expect(uncoveredEntries(list, "const a = 'mnemonic';")).toEqual(['totp', 'recoverycode']);
  });

  it('counts an entry embedded in a longer identifier, which is how tests spell them', () => {
    expect(uncoveredEntries(list, 'userTotp recoveryCode mnemonic')).toEqual([]);
  });

  it('is case-insensitive, since tests use camelCase for snake-cased entries', () => {
    expect(uncoveredEntries({ ...list, entries: ['recoverycode'] }, 'const recoveryCode = 1;')).toEqual(
      [],
    );
  });
});
